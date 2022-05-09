const common = {
  mode: "view",
  slicing: {
    viewSlice: true,
    step: 0.01,
    widthResolution: 1000,
    heightResolution: 1000,
  },
  camera: {
    fov: 45,
    near: 0.05,
    far: 1024,
  },
  workspace: {
    width: 2,
    height: 2,
    depth: 2,
  },
  clippingPlane: {
    constant: 0,
  },
  selected: {
    graphicalPositioning: false,
    modelUUID: null,
    scale: 1,
    x: 0,
    y: 0,
    z: 0,
  },
  copy: {
    geometry: null,
  },
};

export { common };
