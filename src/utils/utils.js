import * as THREE from "three";

export function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function getBounding(geometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  return {
    box: box,
    width: box.max.x - box.min.x,
    height: box.max.y - box.min.y,
    depth: box.max.z - box.min.z,
    min: box.min,
    max: box.max,
  };
}

export function move(geometry, vector) {
  const points = geometry.attributes.position.array;
  for (let i = 0; i < points.length; i += 3) {
    points[i] += vector.x;
    points[i + 1] += vector.y;
    points[i + 2] += vector.z;
  }
}

export function checkVisible(object3d) {
  if (object3d.parent == null) {
    return true;
  }
  return object3d.visible ? checkVisible(object3d.parent) : false;
}

export function createPlaneStencilGroup(geometry, plane, renderOrder) {
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
