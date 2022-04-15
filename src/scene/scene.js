import * as THREE from "three";
import * as COMMON from "../utils/common.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

class Scene {
  static #createPlaneStencilGroup(geometry, plane, renderOrder) {
    const group = new THREE.Group();
    const baseMat = new THREE.MeshBasicMaterial();
    baseMat.depthWrite = false;
    baseMat.depthTest = false;
    baseMat.colorWrite = false;
    baseMat.stencilWrite = true;
    baseMat.stencilFunc = THREE.AlwaysStencilFunc;

    // back faces
    const mat0 = baseMat.clone();
    mat0.side = THREE.BackSide;
    mat0.clippingPlanes = [plane];
    mat0.stencilFail = THREE.IncrementWrapStencilOp;
    mat0.stencilZFail = THREE.IncrementWrapStencilOp;
    mat0.stencilZPass = THREE.IncrementWrapStencilOp;

    const mesh0 = new THREE.Mesh(geometry, mat0);
    mesh0.renderOrder = renderOrder;
    group.add(mesh0);

    // front faces
    const mat1 = baseMat.clone();
    mat1.side = THREE.FrontSide;
    mat1.clippingPlanes = [plane];
    mat1.stencilFail = THREE.DecrementWrapStencilOp;
    mat1.stencilZFail = THREE.DecrementWrapStencilOp;
    mat1.stencilZPass = THREE.DecrementWrapStencilOp;

    const mesh1 = new THREE.Mesh(geometry, mat1);
    mesh1.renderOrder = renderOrder;

    group.add(mesh1);

    return group;
  }

  constructor(canvas) {
    try {
      this.config = {
        workspace: {
          color: "white",
          width: 2,
          height: 2,
          depth: 2,
        },
        clippingPlane: {
          color: "white",
          constant: 0,
        },
        clippingMaterial: new THREE.MeshStandardMaterial({
          color: "white", // 0xe91e63
          metalness: 0.1,
          roughness: 0.75,

          stencilWrite: true,
          stencilRef: 0,
          stencilFunc: THREE.NotEqualStencilFunc,
          stencilFail: THREE.ReplaceStencilOp,
          stencilZFail: THREE.ReplaceStencilOp,
          stencilZPass: THREE.ReplaceStencilOp,
        }),
        model: {
          color: 0xffc107,
          clippingColour: "white",
        },
      };

      this._canvas = canvas;
      this._width = canvas.clientWidth;
      this._height = canvas.clientHeight;

      this._clippingViews = new THREE.Group();

      this._modelsGeometry = [];
      this.#init();

      /*this.initRenderer(canvas);
      this.initCamera(canvas);

      this.initScene();

      // this.initModel(NaN);
      this.initControls();

      this.initLight();

      this._needUpdateControls = true;
      this._controls.addEventListener("change", () => {
        this._needUpdateControls = true;
        // const speed = Math.pow(
        //   this._camera.position.distanceTo(this._model.position) /
        //     this._cameraDistance,
        //   2
        // );
        // this._controls.panSpeed = speed > 1 ? 1 : speed < 0.05 ? 0.05 : speed;
      });

      // this._prepareModelView();
      // this._setDefaultTerrain();
      // this.setStandartView(SceneView.defaultView);

      this._needRender = true;

      window.addEventListener("resize", () => {
        this.resumeRender();
      });
      document.addEventListener("wheel", () => {
        this.resumeRender();
      });
      document.addEventListener("pointerdown", () => {
        this.resumeRender();
      });
      document.addEventListener("pointermove", () => {
        this.resumeRender();
      });
      document.addEventListener("keydown", () => {
        this.resumeRender();
      });

      requestAnimationFrame(() => this.render());*/
    } finally {
      console.log(this._scene);
    }
  }

  #init() {
    this.#initRenderer();
    this.#initScene();
    this.#initLight();
    this.#initCamera();
    this.#initWorkspace();
    this.#initClippingPlane();
    this.#initClippingView();
  }

  #initRenderer() {
    this._renderer = new THREE.WebGLRenderer({
      // canvas: canvas,
      alpha: true,
      // antialias: true, // убрал, поскольку оставляет неприятную лесенку на картинке
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    this._renderer.setSize(this._width, this._height);
    this._renderer.setPixelRatio(window.devicePixelRatio);

    this._renderer.localClippingEnabled = true;
    this._renderer.physicallyCorrectLights = true;

    this._renderer.setAnimationLoop(() => {
      this.animate();
      this.render();
    });

    this._canvas.appendChild(this._renderer.domElement);
  }

  #initScene() {
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color("black");
  }

  #initLight() {
    const ambientLight = new THREE.HemisphereLight(
      0xddeeff, // sky color
      0x202020, // ground color
      5 // intensity
    );
    this._scene.add(ambientLight);
  }

  #initCamera() {
    const fov = 45;
    const aspect = this._width / this._height;
    const near = 0.05;
    const far = COMMON.defaultMapSize;

    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(0, 0, 10);
    new OrbitControls(this._camera, this._renderer.domElement);
  }

  #initWorkspace() {
    this._workspace = [
      // Borders on the x-axis
      new THREE.Plane(
        new THREE.Vector3(-1, 0, 0),
        this.config.workspace.width / 2
      ),
      new THREE.Plane(
        new THREE.Vector3(-1, 0, 0),
        -this.config.workspace.width / 2
      ).negate(),

      // Borders on the y-axis
      new THREE.Plane(
        new THREE.Vector3(0, -1, 0),
        this.config.workspace.height / 2
      ),
      new THREE.Plane(
        new THREE.Vector3(0, -1, 0),
        -this.config.workspace.height / 2
      ).negate(),

      // Borders on the z-axis
      new THREE.Plane(
        new THREE.Vector3(0, 0, -1),
        this.config.workspace.depth / 2
      ),
      new THREE.Plane(
        new THREE.Vector3(0, 0, -1),
        -this.config.workspace.depth / 2
      ).negate(),
    ];

    const workspaceView = [
      // Borders on the x-axis
      new THREE.PlaneHelper(
        this._workspace[0],
        this.config.workspace.width,
        this.config.workspace.color
      ),
      new THREE.PlaneHelper(
        this._workspace[1],
        this.config.workspace.width,
        this.config.workspace.color
      ),

      // Borders on the y-axis
      new THREE.PlaneHelper(
        this._workspace[2],
        this.config.workspace.height,
        this.config.workspace.color
      ),
      new THREE.PlaneHelper(
        this._workspace[3],
        this.config.workspace.height,
        this.config.workspace.color
      ),

      // Borders on the z-axis
      new THREE.PlaneHelper(
        this._workspace[4],
        this.config.workspace.depth,
        this.config.workspace.color
      ),
      new THREE.PlaneHelper(
        this._workspace[5],
        this.config.workspace.depth,
        this.config.workspace.color
      ),
    ];

    this._workspaceView = new THREE.Group();
    workspaceView.forEach((plane) => {
      this._workspaceView.add(plane);
    });

    this._scene.add(this._workspaceView);
  }

  #initClippingPlane() {
    this._clippingPlane = new THREE.Plane(
      new THREE.Vector3(0, -1, 0),
      this.config.clippingPlane.constant
    );

    this._clippingPlaneView = new THREE.PlaneHelper(
      this._clippingPlane,
      2,
      this.config.clippingPlane.color
    );

    this._clippingPlaneView.visible = true;
    this._scene.add(this._clippingPlaneView);
  }

  #initClippingView() {
    // Borders on the x-axis
    const planeGeometryX = new THREE.PlaneGeometry(
      this.config.workspace.depth,
      this.config.workspace.height
    );
    this.#createClippingView(planeGeometryX, 0, 2);

    // Borders on the y-axis
    const planeGeometryY = new THREE.PlaneGeometry(
      this.config.workspace.width,
      this.config.workspace.depth
    );
    this.#createClippingView(planeGeometryY, 2, 4);

    // Borders on the z-axis
    const planeGeometryZ = new THREE.PlaneGeometry(
      this.config.workspace.width,
      this.config.workspace.height
    );
    this.#createClippingView(planeGeometryZ, 4, 6);

    // Clipping Plane
    const clippingPlaneGeometry = new THREE.PlaneGeometry(
      this.config.workspace.width,
      this.config.workspace.height
    );
    this.#createClippingView(clippingPlaneGeometry, 6, 7);

    this._scene.add(this._clippingViews);
  }

  #createClippingView(planeGeometry, index_from, index_to) {
    const planes = this._workspace.concat(this._clippingPlane);
    const material = this.config.clippingMaterial.clone();
    for (let i = index_from; i < index_to; i++) {
      const plane = planes[i];
      material.clippingPlanes = planes.filter((p) => p !== plane);
      const mesh = new THREE.Mesh(planeGeometry, material);
      mesh.onAfterRender = (renderer) => {
        renderer.clearStencil();
      };
      mesh.renderOrder = i + 1.1;
      this._clippingViews.add(mesh);
    }
  }

  addGeometry(geometry) {
    geometry = this.#prepareGeometry(geometry);
    this._modelsGeometry.push(geometry);
    this.#prepareView();
  }

  #prepareGeometry(geometry) {
    let box = geometry.boundingBox;

    let size = new THREE.Vector3(0, 0, 0);
    size = box.getSize(size);

    const scale = 2 / Math.max(size.x, size.y, size.z);
    geometry.scale(scale, scale, scale);

    const points = geometry.attributes.position.array;
    for (let i = 0; i < points.length; i += 3) {
      points[i] += -(this.config.workspace.width / 2 + 0.5) - box.min.x;
      points[i + 1] += -this.config.workspace.height / 2 - box.min.y;
      points[i + 2] += -this.config.workspace.depth / 2 - box.min.z;
    }
    return geometry;
  }

  #prepareView() {
    const object = new THREE.Group();
    const planes = this._workspace.concat(this._clippingPlane);

    for (let i = 0; i < this._modelsGeometry.length; i++) {
      const geometry = this._modelsGeometry[i];
      for (let q = 0; q < planes.length; q++) {
        const plane = planes[q];
        const stencilGroup = Scene.#createPlaneStencilGroup(
          geometry,
          plane,
          q + 1
        );
        object.add(stencilGroup);
      }

      const material = new THREE.MeshStandardMaterial({
        clippingPlanes: planes,
        color: 0xffc107,
        metalness: 0.1,
        roughness: 0.75,
        shadowSide: THREE.DoubleSide,
      });
      const clippedColorFront = new THREE.Mesh(geometry, material);
      clippedColorFront.renderOrder = 6;
      object.add(clippedColorFront);
    }
    this._scene.add(object);
  }

  animate() {
    requestAnimationFrame(this.animate);
    const planes = this._workspace.concat(this._clippingPlane);
    for (let i = 0; i < planes.length; i++) {
      const plane = planes[i];
      const po = this._clippingViews.children[i];
      plane.coplanarPoint(po.position);
      po.lookAt(
        po.position.x - plane.normal.x,
        po.position.y - plane.normal.y,
        po.position.z - plane.normal.z
      );
    }
  }

  render() {
    this._renderer.render(this._scene, this._camera);
  }

  /*initModel(model) {
    if (model) {
      this._model = model;
      this._scene.add(this._model);
    } else {
      // this._loadDefaultModel();
    }
  }

  initControls() {
    this._controls = new OrbitControls(this._camera, this._renderer.domElement);
    this._controls.target.set(0, 0, 0);
    this._controls.maxDistance = COMMON.defaultMapSize / 2 - 1;
    this._controls.rotateSpeed = 1;
  }

  initLight() {
    const ambientLight = new THREE.HemisphereLight(
      0xddeeff, // sky color
      0x202020, // ground color
      5 // intensity
    );
    this._scene.add(ambientLight);
  }

  _prepareModelView() {
    // move to coord origin
    let center = new THREE.Vector3(0, 0, 0);
    const box = new THREE.Box3().setFromObject(this._model);
    center = box.getCenter(center);
    const offset = new THREE.Vector3(-center.x, center.z, 0 /!*-box.min.y*!/);
    for (let obj of this._model.children) {
      obj.position.add(offset);
    }

    // fit in camera view
    let size = new THREE.Vector3(0, 0, 0);
    size = box.getSize(size);
    let maxSize = Math.max(size.x, size.y, size.z);
    const distance = 0.5 * maxSize + 20;
    this._cameraDistance = distance;

    /!*this._viewPositions = [
      [distance * 0.7, distance * 0.7, distance * 0.7, 0, 0, 0],
      [0, distance * 1.2, 0, 0, 0, 0],
      [0, -distance, 0, 0, 0, 0],
      [-distance, size.y / 2, 0, 0, size.y / 2, 0],
      [distance, size.y / 2, 0, 0, size.y / 2, 0],
      [0, size.y / 2, distance, 0, size.y / 2, 0],
      [0, size.y / 2, -distance, 0, size.y / 2, 0],
    ];

    // fit in shadow camera view
    this._dirLight.shadow.camera.left = -maxSize / 2;
    this._dirLight.shadow.camera.top = maxSize / 2;
    this._dirLight.shadow.camera.right = maxSize / 2;
    this._dirLight.shadow.camera.bottom = -maxSize / 2;
    this.cfg.lighting.lightDistance = maxSize * 1.2;

    // material settings
    this._model.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (child.material.map) {
            child.material.map.wrapS = THREE.RepeatWrapping;
            child.material.map.wrapT = THREE.RepeatWrapping;
          }

          child.material.shininess = 0;
        }
      }
    });*!/
  }

  resumeRender() {
    if (!this._needRender) {
      this._needRender = true;
      requestAnimationFrame(() => this.render());
    }

    if (this._renderTimerId) {
      clearTimeout(this._renderTimerId);
    }

    this._renderTimerId = setTimeout(() => {
      this._renderTimerId = null;
      this._needRender = false;
    }, 10000);
  }

  _resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
      this._camera.aspect = width / height;
      this._camera.updateProjectionMatrix();
    }
    return needResize;
  }

  /!* render() {
    if (new Date().getTime() - this._lastRenderTime < 40) {
      if (this._needRender) {
        requestAnimationFrame(() => this.render());
      }
      return;
    }

    //console.timeEnd('requestAnimationFrame enter');
    if (this._cameraNewPosition) {
      this._camera.position.lerp(this._cameraNewPosition, 0.2);
      this._needUpdateControls = true;
      this._controls.enabled = false;

      if (this._camera.position.distanceTo(this._cameraNewPosition) < 0.1) {
        this._cameraNewPosition = null;
      }
    }
    if (this._cameraNewTarget) {
      this._controls.target.lerp(this._cameraNewTarget, 0.2);
      this._needUpdateControls = true;
      this._controls.enabled = false;

      if (this._controls.target.distanceTo(this._cameraNewTarget) < 0.1) {
        this._cameraNewTarget = null;
      }
    }
    if (this._needUpdateControls) {
      if (
        this._controls.enabled !== true &&
        this._cameraNewPosition === null &&
        this._cameraNewTarget === null
      ) {
        this._controls.enabled = true;
      }

      // compass
      /!*let dir = new THREE.Vector3();
      this._camera.getWorldDirection(dir);
      let sph = new THREE.Spherical().setFromVector3(dir);
      this._compass.style.transform = `scaleY(${-Math.cos(sph.phi)}) rotate(${
        sph.theta - Math.PI
      }rad) `;*!/

      this._controls.update();

      this._needUpdateControls = false;
    }

    if (this._resizeRendererToDisplaySize(this._renderer)) {
      const canvas = this._renderer.domElement;
      this._camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this._camera.updateProjectionMatrix();
    }

    this._renderer.render(this._scene, this._camera);

    if (this._needRender) {
      requestAnimationFrame(() => this.render());
    }

    this._lastRenderTime = new Date().getTime();
    //console.time('requestAnimationFrame enter');
  }*!/*/
}

export { Scene };
