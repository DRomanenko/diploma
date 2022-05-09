import * as THREE from "three";

import { common } from "@/utils/common";
import { move } from "@/utils/utils";

const wireframeColor = 0xd3d3d3;
const sideColor = 0xf4f2d9;
const floorColor = 0xffe68c;
const borderColor = 0xffffff;

class Workspace {
  get workspace() {
    return this._workspace;
  }

  get workspaceView() {
    return this._workspaceView;
  }

  get workspaceBordersView() {
    return this._workspaceBordersView;
  }

  constructor() {
    this._workspace = [];
    this._workspaceView = new THREE.Group();
    this._workspaceBordersView = new THREE.Group();

    this._initWorkspaceBorders();
    this._initWorkspaceView();
  }

  showWorkspaceView() {
    this.workspaceView.visible = true;
  }

  hideWorkspaceView() {
    this.workspaceView.visible = false;
  }

  _initWorkspaceBorders() {
    // Borders on the x-axis
    const x = new THREE.Vector3(-1, 0, 0);
    const xConstant = common.workspace.width / 2;
    this._workspace.push(new THREE.Plane(x, xConstant));
    this._workspace.push(new THREE.Plane(x.clone(), -xConstant).negate());

    // Borders on the y-axis
    const y = new THREE.Vector3(0, -1, 0);
    const yConstant = common.workspace.height / 2;
    this._workspace.push(new THREE.Plane(y, yConstant));
    this._workspace.push(new THREE.Plane(y.clone(), -yConstant).negate());

    // Borders on the z-axis
    const z = new THREE.Vector3(0, 0, -1);
    const zConstant = common.workspace.depth / 2;
    this._workspace.push(new THREE.Plane(z, zConstant));
    this._workspace.push(new THREE.Plane(z.clone(), -zConstant).negate());

    const workspaceView = [
      // Borders on the x-axis
      new THREE.PlaneHelper(
        this._workspace[0],
        common.workspace.width,
        borderColor
      ),
      new THREE.PlaneHelper(
        this._workspace[1],
        common.workspace.width,
        borderColor
      ),

      // Borders on the y-axis
      new THREE.PlaneHelper(
        this._workspace[2],
        common.workspace.height,
        borderColor
      ),
      new THREE.PlaneHelper(
        this._workspace[3],
        common.workspace.height,
        borderColor
      ),

      // Borders on the z-axis
      new THREE.PlaneHelper(
        this._workspace[4],
        common.workspace.depth,
        borderColor
      ),
      new THREE.PlaneHelper(
        this._workspace[5],
        common.workspace.depth,
        borderColor
      ),
    ];

    workspaceView.forEach((plane) => {
      this._workspaceBordersView.add(plane);
    });
    this._workspaceBordersView.visible = false;
  }

  _initWorkspaceView() {
    const boxGeometry = new THREE.BoxGeometry(
      common.workspace.width,
      common.workspace.height,
      common.workspace.depth
    );

    const wireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(boxGeometry),
      new THREE.LineBasicMaterial({ color: wireframeColor, linewidth: 2 })
    );

    // BordersView on the x-axis
    const sideX = new THREE.PlaneGeometry(
      common.workspace.height,
      common.workspace.depth
    );
    const sideXNegate = sideX.clone();

    move(sideXNegate, new THREE.Vector3(0, 0, -1));
    sideXNegate.lookAt(new THREE.Vector3(1, 0, 0));

    move(sideX, new THREE.Vector3(0, 0, 1));
    sideX.lookAt(new THREE.Vector3(1, 0, 0));

    // BordersView on the y-axis
    const sideY = new THREE.PlaneGeometry(
      common.workspace.width,
      common.workspace.depth
    );
    const sideYNegate = sideY.clone();

    move(sideYNegate, new THREE.Vector3(0, 0, -1));
    sideYNegate.lookAt(new THREE.Vector3(0, 1, 0));

    move(sideY, new THREE.Vector3(0, 0, 1));
    sideY.lookAt(new THREE.Vector3(0, 1, 0));

    // BordersView on the z-axis
    const sideZ = new THREE.PlaneGeometry(
      common.workspace.width,
      common.workspace.height
    );
    const sideZNegate = sideZ.clone();

    move(sideZNegate, new THREE.Vector3(0, 0, -1));
    sideZNegate.lookAt(new THREE.Vector3(0, 0, 1));

    move(sideZ, new THREE.Vector3(0, 0, 1));
    sideZ.lookAt(new THREE.Vector3(0, 0, 1));

    const floorMaterial = new THREE.MeshBasicMaterial({
      color: floorColor,
      side: THREE.FrontSide,
      opacity: 0.5,
      transparent: true,
      depthWrite: false,
    });

    const sideMateraial = new THREE.MeshBasicMaterial({
      color: sideColor,
      side: THREE.BackSide,
      opacity: 0.25,
      transparent: true,
      depthWrite: false,
    });

    const sideNegateMateraial = new THREE.MeshBasicMaterial({
      color: sideColor,
      side: THREE.FrontSide,
      opacity: 0.25,
      transparent: true,
      depthWrite: false,
    });

    this._workspaceView.add(wireframe);
    this._workspaceView.add(new THREE.Mesh(sideX, sideMateraial));
    this._workspaceView.add(new THREE.Mesh(sideXNegate, sideNegateMateraial));

    this._workspaceView.add(new THREE.Mesh(sideY, sideMateraial));
    this._workspaceView.add(new THREE.Mesh(sideYNegate, floorMaterial));

    this._workspaceView.add(new THREE.Mesh(sideZ, sideMateraial));
    this._workspaceView.add(new THREE.Mesh(sideZNegate, sideNegateMateraial));
  }
}

export { Workspace };
