import * as THREE from "three";

import { common } from "@/utils/common";

const clippingColor = 0xffffff; // 0xe91e63
const clippingPlaneColor = 0xffffff;

class ClippingPlane {
  get views() {
    return this._clippingViews;
  }

  get clippingPlaneView() {
    return this._clippingPlaneView;
  }

  get constant() {
    return this._clippingPlane.constant;
  }

  set constant(value) {
    this._clippingPlane.constant = value;
  }

  constructor(workspace = null) {
    this._workspace = workspace;

    this._clippingPlane = new THREE.Plane(
      new THREE.Vector3(0, -1, 0),
      common.clippingPlane.constant
    );

    this._clippingPlaneView = new THREE.PlaneHelper(
      this._clippingPlane,
      2,
      clippingPlaneColor
    );

    this._clippingViews = new THREE.Group();
    this._initClippingView();
  }

  _initClippingView() {
    // Borders on the x-axis
    const planeGeometryX = new THREE.PlaneGeometry(
      common.workspace.depth,
      common.workspace.height
    );
    this._createClippingView(planeGeometryX, 0, 2);

    // Borders on the y-axis
    const planeGeometryY = new THREE.PlaneGeometry(
      common.workspace.width,
      common.workspace.depth
    );
    this._createClippingView(planeGeometryY, 2, 4);

    // Borders on the z-axis
    const planeGeometryZ = new THREE.PlaneGeometry(
      common.workspace.width,
      common.workspace.height
    );
    this._createClippingView(planeGeometryZ, 4, 6);

    // Clipping Plane
    const clippingPlaneGeometry = new THREE.PlaneGeometry(
      common.workspace.width,
      common.workspace.height
    );
    this._createClippingView(clippingPlaneGeometry, 6, 7);
  }

  _createClippingView(planeGeometry, index_from, index_to) {
    const planes = this.allPlanes();
    const material = new THREE.MeshStandardMaterial({
      color: clippingColor,
      metalness: 0.1,
      roughness: 0.75,

      stencilWrite: true,
      stencilRef: 0,
      stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.ReplaceStencilOp,
      stencilZFail: THREE.ReplaceStencilOp,
      stencilZPass: THREE.ReplaceStencilOp,
    });
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

  hideClippingPlaneView() {
    this.clippingPlaneView.visible = false;
  }

  showClippingPlaneView() {
    this.clippingPlaneView.visible = true;
  }

  allPlanes() {
    return this._workspace.workspace.concat(this._clippingPlane);
  }
}

export { ClippingPlane };
