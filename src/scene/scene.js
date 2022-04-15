import { common } from "@/utils/common";
import { sleep } from "@/utils/utils";
import { Exporter } from "@/utils/exporter";

import * as THREE from "three";
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
      this._canvas = canvas;
      this._width = canvas.clientWidth;
      this._height = canvas.clientHeight;

      this._clippingViews = new THREE.Group();

      this._modelsGeometry = [];
      this._models = new THREE.Group();
      this.#init();
    } finally {
      console.log(this._scene);
    }
  }

  #init() {
    this.#initRenderer();
    this.#initScene();
    this.#initLight();
    this.#initWorkspace();
    this.#initClippingPlane();
    this.#initClippingView();
    this.#initCamera();

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
    requestAnimationFrame(() => this.render());
  }

  #initRenderer() {
    this._renderer = new THREE.WebGLRenderer({
      // canvas: canvas,
      alpha: true,
      antialias: true, // убрал, поскольку оставляет неприятную лесенку на картинке
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    this._renderer.setSize(this._width, this._height);
    this._renderer.setPixelRatio(window.devicePixelRatio);

    this._renderer.localClippingEnabled = true;
    this._renderer.physicallyCorrectLights = true;

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
    switch (common.mode) {
      case "view": {
        const fov = 45;
        const aspect = this._width / this._height;
        const near = 0.05;
        const far = common.defaultMapSize;

        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(0, 0, 10);
        this._models.visible = true;
        this._workspaceView.visible = true;
        this._clippingPlaneView.visible = true;
        new OrbitControls(this._camera, this._renderer.domElement);
        break;
      }
      case "slicing": {
        this._camera = new THREE.OrthographicCamera(
          -common.workspace.width,
          common.workspace.depth,
          common.workspace.depth / 2,
          -common.workspace.width / 2
        );
        this._camera.position.set(0, common.workspace.height, 0);
        this._camera.lookAt(
          new THREE.Vector3(0, common.workspace.height / 2, 0)
        );
        this._models.visible = false;
        this._workspaceView.visible = false;
        this._clippingPlaneView.visible = false;
        break;
      }
    }
  }

  #initWorkspace() {
    this._workspace = [
      // Borders on the x-axis
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), common.workspace.width / 2),
      new THREE.Plane(
        new THREE.Vector3(-1, 0, 0),
        -common.workspace.width / 2
      ).negate(),

      // Borders on the y-axis
      new THREE.Plane(new THREE.Vector3(0, -1, 0), common.workspace.height / 2),
      new THREE.Plane(
        new THREE.Vector3(0, -1, 0),
        -common.workspace.height / 2
      ).negate(),

      // Borders on the z-axis
      new THREE.Plane(new THREE.Vector3(0, 0, -1), common.workspace.depth / 2),
      new THREE.Plane(
        new THREE.Vector3(0, 0, -1),
        -common.workspace.depth / 2
      ).negate(),
    ];

    const workspaceView = [
      // Borders on the x-axis
      new THREE.PlaneHelper(
        this._workspace[0],
        common.workspace.width,
        common.workspace.color
      ),
      new THREE.PlaneHelper(
        this._workspace[1],
        common.workspace.width,
        common.workspace.color
      ),

      // Borders on the y-axis
      new THREE.PlaneHelper(
        this._workspace[2],
        common.workspace.height,
        common.workspace.color
      ),
      new THREE.PlaneHelper(
        this._workspace[3],
        common.workspace.height,
        common.workspace.color
      ),

      // Borders on the z-axis
      new THREE.PlaneHelper(
        this._workspace[4],
        common.workspace.depth,
        common.workspace.color
      ),
      new THREE.PlaneHelper(
        this._workspace[5],
        common.workspace.depth,
        common.workspace.color
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
      common.clippingPlane.constant
    );

    this._clippingPlaneView = new THREE.PlaneHelper(
      this._clippingPlane,
      2,
      common.clippingPlane.color
    );

    this._scene.add(this._clippingPlaneView);
  }

  #initClippingView() {
    // Borders on the x-axis
    const planeGeometryX = new THREE.PlaneGeometry(
      common.workspace.depth,
      common.workspace.height
    );
    this.#createClippingView(planeGeometryX, 0, 2);

    // Borders on the y-axis
    const planeGeometryY = new THREE.PlaneGeometry(
      common.workspace.width,
      common.workspace.depth
    );
    this.#createClippingView(planeGeometryY, 2, 4);

    // Borders on the z-axis
    const planeGeometryZ = new THREE.PlaneGeometry(
      common.workspace.width,
      common.workspace.height
    );
    this.#createClippingView(planeGeometryZ, 4, 6);

    // Clipping Plane
    const clippingPlaneGeometry = new THREE.PlaneGeometry(
      common.workspace.width,
      common.workspace.height
    );
    this.#createClippingView(clippingPlaneGeometry, 6, 7);

    this._scene.add(this._clippingViews);
  }

  #createClippingView(planeGeometry, index_from, index_to) {
    const planes = this._workspace.concat(this._clippingPlane);
    const material = common.clippingMaterial.clone();
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
      // TODO убрать + 0.5
      points[i] += -(common.workspace.width / 2 + 0.5) - box.min.x;
      points[i + 1] += -common.workspace.height / 2 - box.min.y;
      points[i + 2] += -common.workspace.depth / 2 - box.min.z;
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
      this._models.add(clippedColorFront);
    }
    this._scene.add(this._models);
    this._scene.add(object);
  }

  render() {
    if (new Date().getTime() - this._lastRenderTime < 30) {
      if (this._needRender) {
        requestAnimationFrame(() => this.render());
      }
      return;
    }

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

    if (this.#resizeRendererToDisplaySize(this._renderer)) {
      const canvas = this._renderer.domElement;
      this._camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this._camera.updateProjectionMatrix();
    }

    this._renderer.render(this._scene, this._camera);

    if (this._needRender) {
      requestAnimationFrame(() => this.render());
    }

    this._lastRenderTime = new Date().getTime();
  }

  #resizeRendererToDisplaySize(renderer) {
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

  update() {
    this.#initCamera();
  }

  async saveImages() {
    const exporter = new Exporter();
    const numberSlices = common.slicing.max_number_slice;
    for (let i = -numberSlices; i <= numberSlices; i++) {
      common.clippingPlane.constant = (1 / numberSlices) * i;
      this._clippingPlane.constant = common.clippingPlane.constant;
      this._renderer.render(this._scene, this._camera);
      this._scene.onAfterRender = () => {
        const canvas = document.getElementsByTagName("canvas")[0];
        let image = new Image();
        image.src = canvas.toDataURL();
        exporter.addImage("slice", image, numberSlices + i);
      };
      if (common.slicing.viewSlice) {
        await sleep(1);
      }
    }
    exporter.saveAsZip("slicing");
    common.clippingPlane.constant = 0;
    this._clippingPlane.constant = 0;
    this._renderer.render(this._scene, this._camera);
  }
}

export { Scene };
