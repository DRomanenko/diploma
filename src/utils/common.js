import * as THREE from "three";

const common = {
  mode: "view",
  slicing: {
    viewSlice: false,
    max_number_slice: 100,
  },
  defaultMapSize: 1024,
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

export { common };
