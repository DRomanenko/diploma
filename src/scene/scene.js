import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import potpack from "potpack";

import { common } from "@/utils/common";
import {
  sleep,
  getBounding,
  move,
  createPlaneStencilGroup,
  checkVisible,
} from "@/utils/utils";
import { Models } from "@/scene/models";
import { Exporter } from "@/utils/exporter";
import { Renderer } from "@/scene/renderer";
import { Workspace } from "@/scene/workspace";
import { PositionTool } from "@/scene/position-tool";
import { ClippingPlane } from "@/scene/clipping-plane";

const unSelectedModelColor = 0xffc107;
const selectedModelColor = 0x03fcb1;

class Scene {
  get models() {
    return this._models;
  }

  get clipping() {
    return this._clipping;
  }

  get canvas() {
    return this._renderer.domElement;
  }

  constructor(canvas, mouse) {
    try {
      this._mouse = mouse;
      this._renderer = new Renderer(canvas);

      this._workspace = new Workspace();
      this._clipping = new ClippingPlane(this._workspace);

      this._models = new Models();
      this._positionTool = new PositionTool();

      this._init();
    } finally {
      console.log(this._scene);
    }
  }

  _init() {
    this._initScene();
    this._initLight();

    this._scene.add(this._workspace.workspaceBordersView);
    this._scene.add(this._workspace.workspaceView);
    this._scene.add(this._clipping.clippingPlaneView);
    this._scene.add(this._clipping.views);

    this._initCamera();
    this._initControl();

    this._needRender = true;
    this._exporting = false;

    window.addEventListener("resize", () => {
      this._resumeRender();
    });
    document.addEventListener("wheel", () => {
      this._resumeRender();
    });
    document.addEventListener("pointerdown", () => {
      this._resumeRender();
    });
    document.addEventListener("pointermove", () => {
      this._resumeRender();
    });
    document.addEventListener("keydown", () => {
      this._resumeRender();
    });
    requestAnimationFrame(() => this._render());
  }

  _initScene() {
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color("black");
  }

  _initLight() {
    const ambientLight = new THREE.HemisphereLight(
      0xddeeff, // sky color
      0x202020, // ground color
      5 // intensity
    );
    this._scene.add(ambientLight);
  }

  _initCamera() {
    switch (common.mode) {
      case "view": {
        const domElement = this._renderer.domElement;
        const fov = common.camera.fov;
        const aspect = domElement.clientWidth / domElement.clientHeight;
        const near = common.camera.near;
        const far = common.camera.far;

        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(0, 0, 5);
        this._models.modelsGroup.visible = true;
        this._workspace.showWorkspaceView();
        this._clipping.showClippingPlaneView();
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
        this._models.modelsGroup.visible = false;
        this._workspace.hideWorkspaceView();
        this._clipping.hideClippingPlaneView();
        this._positionTool.hide();
        break;
      }
    }
  }

  _initControl() {
    this._scene.add(this._positionTool.control);
  }

  _render() {
    if (new Date().getTime() - this._lastRenderTime < 30) {
      if (this._needRender) {
        requestAnimationFrame(() => this._render());
      }
      return;
    }

    const planes = this._clipping.allPlanes();
    for (let i = 0; i < planes.length; i++) {
      const plane = planes[i];
      const po = this._clipping.views.children[i];
      plane.coplanarPoint(po.position);
      po.lookAt(
        po.position.x - plane.normal.x,
        po.position.y - plane.normal.y,
        po.position.z - plane.normal.z
      );
    }

    if (this._resizeRendererToDisplaySize()) {
      const canvas = this._renderer.domElement;
      this._camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this._camera.updateProjectionMatrix();
    }

    if (common.selected.graphicalPositioning) {
      const intersects = this.getIntersects(
        this._positionTool.control.children,
        true
      );

      if (intersects && intersects.length > 0) {
        const object3d = intersects[0].object;
        if (checkVisible(object3d)) {
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
      requestAnimationFrame(() => this._render());
    }

    this._lastRenderTime = new Date().getTime();
  }

  _setSize(width, height) {
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(width, height);
  }

  _resizeRendererToDisplaySize() {
    const canvas = this._renderer.domElement;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const needResize =
      !this._exporting && (canvas.width !== width || canvas.height !== height);
    if (needResize) {
      this._setSize(width, height);
    }
    return needResize;
  }

  _resumeRender() {
    if (!this._needRender) {
      this._needRender = true;
      requestAnimationFrame(() => this._render());
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
    this._initCamera();
  }

  selectModel() {
    this._models.models.forEach((model) => {
      model.material.color.setHex(unSelectedModelColor);
      model.material.needsUpdate = true;
    });
    if (null !== common.selected.modelUUID) {
      const model = this._models.findModelByUUID(common.selected.modelUUID);
      model.material.color.setHex(selectedModelColor);
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
  }

  updateScale() {
    if (null !== common.selected.modelUUID) {
      const model = this._models.findModelByUUID(common.selected.modelUUID);
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
      requestAnimationFrame(() => this._render());
    }
  }

  updatePosition() {
    if (null !== common.selected.modelUUID) {
      const model = this._models.findModelByUUID(common.selected.modelUUID);
      const geometry = model.geometry;

      let center = new THREE.Vector3();
      getBounding(geometry).box.getCenter(center);

      move(
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
      requestAnimationFrame(() => this._render());
    }
  }

  addGeometry(new_geometry) {
    const geometry = this.prepareGeometry(new_geometry.clone());
    this._models.addGeometry(geometry);

    const object = new THREE.Group();
    const planes = this._clipping.allPlanes();
    for (let q = 0; q < planes.length; q++) {
      const plane = planes[q];
      const stencilGroup = createPlaneStencilGroup(geometry, plane, q + 1);
      object.add(stencilGroup);
    }

    const material = new THREE.MeshLambertMaterial({
      clippingPlanes: planes,
      clipIntersection: false,
      color: unSelectedModelColor,
    });
    const clippedColorFront = new THREE.Mesh(geometry, material);
    clippedColorFront.renderOrder = 6;
    this._models.addModel(clippedColorFront);
    this._scene.add(this._models.modelsGroup);
    this._scene.add(object);
  }

  prepareGeometry(geometry) {
    let bounding = getBounding(geometry);

    let size = new THREE.Vector3(0, 0, 0);
    size = bounding.box.getSize(size);

    const scale = common.workspace.height / Math.max(size.x, size.y, size.z);
    geometry.scale(scale, scale, scale);

    const min_y = -common.workspace.height / 2;
    move(geometry, new THREE.Vector3(0, min_y - bounding.min.y, 0));

    return geometry;
  }

  packing() {
    const blocks = [];
    const geometries = this._models.modelsGeometry.sort(
      (geometry1, geometry2) => {
        const bounding1 = getBounding(geometry1);
        const bounding2 = getBounding(geometry2);
        return bounding2.depth - bounding1.depth;
      }
    );

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
      move(geometry, vector);
      geometry.attributes.position.needsUpdate = true;
    });

    if (null !== common.selected.modelUUID) {
      const model = this._models.findModelByUUID(common.selected.modelUUID);
      let center = new THREE.Vector3();
      const bounding = getBounding(model.geometry);

      bounding.box.getCenter(center);
      common.selected.x = center.x;
      common.selected.y = center.y;
      common.selected.z = center.z;

      common.selected.scale = bounding.height / common.workspace.height;
    }
  }

  async saveImages() {
    const exporter = new Exporter();
    let min_height = -common.workspace.height / 2;
    let height = min_height;
    this._models.models.forEach((model) => {
      height = Math.max(height, getBounding(model.geometry).height);
    });
    const numberSlices = height / common.slicing.step;

    this._exporting = true;
    this._setSize(
      common.slicing.widthResolution,
      common.slicing.heightResolution
    );
    for (let i = 0; i <= numberSlices; i++) {
      common.clippingPlane.constant = min_height + (height / numberSlices) * i;
      this._clipping.constant = common.clippingPlane.constant;
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
    this._clipping.constant = 0;
    this._renderer.render(this._scene, this._camera);
  }

  getIntersects(searchObjects, recursive) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this._mouse.pointer, this._camera);
    return raycaster.intersectObjects(searchObjects, recursive);
  }
}

export { Scene };
