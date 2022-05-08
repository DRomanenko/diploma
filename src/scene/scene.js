import { common } from "@/utils/common";
import { sleep, getBounding } from "@/utils/utils";
import { Exporter } from "@/utils/exporter";

import potpack from "potpack";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { PositionTool } from "@/utils/position-tool";

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

      this._pointer = new THREE.Vector2();

      this._clippingViews = new THREE.Group();

      this._modelsGeometry = [];
      this.models = new THREE.Group();

      this._positionTool = new PositionTool();
      this.#init();
    } finally {
      console.log(this._scene);
    }
  }

  #init() {
    this.#initRenderer();
    this.#initScene();
    this.#initLight();
    this.#initWorkspaceBorders();
    this.#initWorkspaceView();
    this.#initClippingPlane();
    this.#initClippingView();
    this.#initCamera();
    this._initControl();

    this._needRender = true;

    this._exporting = false;

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
    document.addEventListener("click", (event) => {
      this.getIntersectedObject(event);
    });

    if (common.selected.graphicalPositioning) {
      document.addEventListener("mousemove", (event) => {
        this.onMouseMove(event);
      });
    }

    let ctrlActive = false;

    document.body.addEventListener("keyup", (event) => {
      if (event.key === "Control") ctrlActive = false;
    });

    document.body.addEventListener("keydown", (event) => {
      if (event.key === "Control") ctrlActive = true;
      if (ctrlActive === true && event.code === "KeyC") {
        // this disables the browsers default copy functionality
        event.preventDefault();

        if (common.selected.modelUUID) {
          const model = this.models.children.find(
            (value) => common.selected.modelUUID === value.uuid
          );
          common.copy.geometry = model.geometry;
        } else {
          alert("Select a model");
        }
      }

      if (ctrlActive === true && event.code === "KeyV") {
        // this disables the browsers default paste functionality
        event.preventDefault();

        if (common.copy.geometry) {
          this.addGeometry(common.copy.geometry);
          this.packing();
        } else {
          alert("Select and copy a model");
        }
      }
    });
    requestAnimationFrame(() => this.render());
  }

  #initRenderer() {
    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      alpha: true,
      antialias: true, // false preferred for 'slicing' / true preferred for 'view'
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    this._renderer.setSize(this._width, this._height);
    this._renderer.setPixelRatio(window.devicePixelRatio);

    this._renderer.localClippingEnabled = true;
    this._renderer.physicallyCorrectLights = true;
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
        const fov = common.camera.fov;
        const aspect = this._width / this._height;
        const near = common.camera.near;
        const far = common.camera.far;

        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(0, 0, 5);
        this.models.visible = true;
        this._workspaceView.visible = true;
        this._clippingPlaneView.visible = true;
        this._orbitControls = new OrbitControls(
          this._camera,
          this._renderer.domElement
        );
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
        this.models.visible = false;
        this._workspaceView.visible = false;
        this._clippingPlaneView.visible = false;
        this._positionTool.hide();
        break;
      }
    }
  }

  #initWorkspaceBorders() {
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

    this._workspaceBordersView = new THREE.Group();
    workspaceView.forEach((plane) => {
      this._workspaceBordersView.add(plane);
    });
    this._workspaceBordersView.visible = false;

    this._scene.add(this._workspaceBordersView);
  }

  #initWorkspaceView() {
    const boxGeometry = new THREE.BoxGeometry(
      common.workspace.width,
      common.workspace.height,
      common.workspace.depth
    );

    const wireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(boxGeometry),
      new THREE.LineBasicMaterial({ color: "lightgray", linewidth: 2 })
    );

    const sideX = new THREE.PlaneGeometry(
      common.workspace.height,
      common.workspace.depth
    );
    const sideXNegate = sideX.clone();

    const sideY = new THREE.PlaneGeometry(
      common.workspace.width,
      common.workspace.depth
    );
    const sideYNegate = sideY.clone();

    const sideZ = new THREE.PlaneGeometry(
      common.workspace.width,
      common.workspace.height
    );
    const sideZNegate = sideZ.clone();

    this.move(sideXNegate, new THREE.Vector3(0, 0, -1));
    sideXNegate.lookAt(new THREE.Vector3(1, 0, 0));

    this.move(sideX, new THREE.Vector3(0, 0, 1));
    sideX.lookAt(new THREE.Vector3(1, 0, 0));

    this.move(sideYNegate, new THREE.Vector3(0, 0, -1));
    sideYNegate.lookAt(new THREE.Vector3(0, 1, 0));

    this.move(sideY, new THREE.Vector3(0, 0, 1));
    sideY.lookAt(new THREE.Vector3(0, 1, 0));

    this.move(sideZNegate, new THREE.Vector3(0, 0, -1));
    sideZNegate.lookAt(new THREE.Vector3(0, 0, 1));

    this.move(sideZ, new THREE.Vector3(0, 0, 1));
    sideZ.lookAt(new THREE.Vector3(0, 0, 1));

    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe68c,
      side: THREE.FrontSide,
      opacity: 0.5,
      transparent: true,
      depthWrite: false,
    });

    const sideMateraial = new THREE.MeshBasicMaterial({
      color: 0xf4f2d9,
      side: THREE.BackSide,
      opacity: 0.25,
      transparent: true,
      depthWrite: false,
    });

    const sideNegateMateraial = new THREE.MeshBasicMaterial({
      color: 0xf4f2d9,
      side: THREE.FrontSide,
      opacity: 0.25,
      transparent: true,
      depthWrite: false,
    });

    this._workspaceView = new THREE.Group();
    this._workspaceView.add(wireframe);
    this._workspaceView.add(new THREE.Mesh(sideX, sideMateraial));
    this._workspaceView.add(new THREE.Mesh(sideXNegate, sideNegateMateraial));

    this._workspaceView.add(new THREE.Mesh(sideY, sideMateraial));
    this._workspaceView.add(new THREE.Mesh(sideYNegate, floorMaterial));

    this._workspaceView.add(new THREE.Mesh(sideZ, sideMateraial));
    this._workspaceView.add(new THREE.Mesh(sideZNegate, sideNegateMateraial));

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

  _initControl() {
    this._scene.add(this._positionTool.control);
  }

  addGeometry(new_geometry) {
    const geometry = this.#prepareGeometry(new_geometry.clone());
    this._modelsGeometry.push(geometry);

    const object = new THREE.Group();
    const planes = this._workspace.concat(this._clippingPlane);
    for (let q = 0; q < planes.length; q++) {
      const plane = planes[q];
      const stencilGroup = Scene.#createPlaneStencilGroup(
        geometry,
        plane,
        q + 1
      );
      object.add(stencilGroup);
    }

    const material = new THREE.MeshLambertMaterial({
      clippingPlanes: planes,
      clipIntersection: false,

      color: common.model.color,
    });
    const clippedColorFront = new THREE.Mesh(geometry, material);
    clippedColorFront.renderOrder = 6;
    this.models.add(clippedColorFront);
    this._scene.add(this.models);
    this._scene.add(object);

    this._gui.updateFolderModel();
  }

  #prepareGeometry(geometry) {
    let bounding = getBounding(geometry);

    let size = new THREE.Vector3(0, 0, 0);
    size = bounding.box.getSize(size);

    const scale = common.workspace.height / Math.max(size.x, size.y, size.z);
    geometry.scale(scale, scale, scale);

    const min_y = -common.workspace.height / 2;
    this.move(geometry, new THREE.Vector3(0, min_y - bounding.min.y, 0));

    return geometry;
  }

  onMouseMove(event) {
    event.preventDefault();
    this._pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this._pointer.x = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  getIntersects(searchObjects, recursive) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this._pointer, this._camera);
    return raycaster.intersectObjects(searchObjects, recursive);
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

    if (this.#resizeRendererToDisplaySize()) {
      const canvas = this._renderer.domElement;
      this._camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this._camera.updateProjectionMatrix();
    }

    if (common.selected.graphicalPositioning) {
      const intersects = this.getIntersects(
        this._positionTool.control.children,
        true
      );

      if (intersects.length > 0) {
        const object3d = intersects[0].object;
        if (this.checkVisible(object3d)) {
          this._orbitControls.enabled = !this._positionTool.selectControl(
            object3d.uuid
          );
        }
      } else {
        this._orbitControls.enabled = !this._positionTool.selectControl(null);
      }
    }

    this._renderer.render(this._scene, this._camera);

    if (this._needRender) {
      requestAnimationFrame(() => this.render());
    }

    this._lastRenderTime = new Date().getTime();
  }

  setSize(width, height) {
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(width, height);
  }

  #resizeRendererToDisplaySize() {
    const canvas = this._renderer.domElement;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const needResize =
      !this._exporting && (canvas.width !== width || canvas.height !== height);
    if (needResize) {
      this.setSize(width, height);
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

  updateMode() {
    this.#initCamera();
  }

  selectModel() {
    this.models.children.forEach((model) => {
      model.material.color.setHex(common.model.color);
      model.material.needsUpdate = true;
    });
    if (null !== common.selected.modelUUID) {
      const model = this.models.children.find(
        (value) => common.selected.modelUUID === value.uuid
      );
      model.material.color.setHex(common.selected.color);
      model.material.needsUpdate = true;

      let center = new THREE.Vector3();
      const bounding = getBounding(model.geometry);

      bounding.box.getCenter(center);
      common.selected.x = center.x;
      common.selected.y = center.y;
      common.selected.z = center.z;

      common.selected.scale = bounding.height / common.workspace.height;

      if (common.selected.graphicalPositioning) {
        this._positionTool.selectGeometry(model.geometry);
      }
    } else {
      if (common.selected.graphicalPositioning) {
        this._positionTool.selectGeometry(null);
      }
    }
    this._gui.updateFolderModel();
  }

  updatePosition() {
    if (null !== common.selected.modelUUID) {
      const model = this.models.children.find(
        (value) => common.selected.modelUUID === value.uuid
      );
      const geometry = model.geometry;

      let center = new THREE.Vector3();
      getBounding(geometry).box.getCenter(center);

      this.move(
        geometry,
        new THREE.Vector3(
          common.selected.x - center.x,
          common.selected.y - center.y,
          common.selected.z - center.z
        )
      );

      this._needRender = true;
      geometry.attributes.position.needsUpdate = true;
      this._camera.updateProjectionMatrix();
      requestAnimationFrame(() => this.render());
    }
  }

  updateScale() {
    if (null !== common.selected.modelUUID) {
      const model = this.models.children.find(
        (value) => common.selected.modelUUID === value.uuid
      );
      const geometry = model.geometry;

      const bounding = getBounding(model.geometry);

      const base_square = Math.max(
        common.workspace.width,
        common.workspace.height,
        common.workspace.depth
      );
      const new_square = Math.max(
        bounding.width,
        bounding.height,
        bounding.depth
      );
      const scale = base_square / new_square;

      geometry.scale(scale, scale, scale);

      geometry.scale(
        common.selected.scale,
        common.selected.scale,
        common.selected.scale
      );
      this._needRender = true;
      geometry.attributes.position.needsUpdate = true;
      this._camera.updateProjectionMatrix();
      requestAnimationFrame(() => this.render());
    }
  }

  async saveImages() {
    const exporter = new Exporter();
    let min_height = -common.workspace.height / 2;
    let height = min_height;
    this.models.children.forEach((model) => {
      height = Math.max(height, getBounding(model.geometry).height);
    });
    const numberSlices = height / common.slicing.step;

    this._exporting = true;
    this.setSize(
      common.slicing.widthResolution,
      common.slicing.heightResolution
    );
    for (let i = 0; i <= numberSlices; i++) {
      common.clippingPlane.constant = min_height + (height / numberSlices) * i;
      this._clippingPlane.constant = common.clippingPlane.constant;
      this._renderer.render(this._scene, this._camera);
      this._scene.onAfterRender = () => {
        const canvas = document.getElementsByTagName("canvas")[0];
        let image = new Image();
        image.src = canvas.toDataURL();
        exporter.addImage("slice", image, i);
      };
      if (common.slicing.viewSlice) {
        await sleep(1);
      }
    }
    this._exporting = false;
    exporter.saveAsZip("slicing");
    common.clippingPlane.constant = 0;
    this._clippingPlane.constant = 0;
    this._renderer.render(this._scene, this._camera);
  }

  move(geometry, vector) {
    const points = geometry.attributes.position.array;
    for (let i = 0; i < points.length; i += 3) {
      points[i] += vector.x;
      points[i + 1] += vector.y;
      points[i + 2] += vector.z;
    }
  }

  packing() {
    const blocks = [];
    const geometries = this._modelsGeometry.sort((geometry1, geometry2) => {
      const bounding1 = getBounding(geometry1);
      const bounding2 = getBounding(geometry2);
      return bounding2.depth - bounding1.depth;
    });

    geometries.forEach((geometry) => {
      const bounding = getBounding(geometry);
      blocks.push({ w: bounding.width, h: bounding.depth });
    });

    const { w, h, fill } = potpack(blocks);
    console.log(`Filling efficiency = ${100 * fill.toFixed(2)}%`);

    const base_square = Math.max(
      common.workspace.width,
      common.workspace.depth
    );
    const new_square = Math.max(w, h);
    const scale =
      base_square >= new_square
        ? 1
        : Math.min(base_square, new_square) / Math.max(base_square, new_square);

    const min_x = -common.workspace.width / 2;
    const min_y = -common.workspace.height / 2;
    const min_z = -common.workspace.depth / 2;

    geometries.forEach((geometry, index) => {
      geometry.scale(scale, scale, scale);

      const block = blocks[index];
      const bounding = getBounding(geometry);
      const vector = new THREE.Vector3(
        min_x - bounding.min.x + block.x * scale,
        min_y - bounding.min.y,
        min_z - bounding.min.z + block.y * scale
      );
      this.move(geometry, vector);
      geometry.attributes.position.needsUpdate = true;
    });

    if (null !== common.selected.modelUUID) {
      const model = this.models.children.find(
        (value) => common.selected.modelUUID === value.uuid
      );
      let center = new THREE.Vector3();
      const bounding = getBounding(model.geometry);

      bounding.box.getCenter(center);
      common.selected.x = center.x;
      common.selected.y = center.y;
      common.selected.z = center.z;

      common.selected.scale = bounding.height / common.workspace.height;
    }
  }

  checkVisible(object3d) {
    if (object3d.parent == null) {
      return true;
    }
    return object3d.visible ? this.checkVisible(object3d.parent) : false;
  }

  getIntersectedObject(event) {
    event.preventDefault();

    this._pointer.x = (event.clientX / this._width) * 2 - 1;
    this._pointer.y = -(event.clientY / this._height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this._pointer, this._camera);
    const intersects = raycaster.intersectObjects(this.models.children, true);

    if (intersects && intersects.length === 1) {
      const object3d = intersects[0].object;
      if (this.checkVisible(object3d)) {
        common.selected.modelUUID = intersects[0].object.uuid;
        this.selectModel();
      }
    }
  }

  addGUI(gui) {
    this._gui = gui;
  }
}

export { Scene };
