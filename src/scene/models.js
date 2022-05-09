import * as THREE from "three";

class Models {
  get models() {
    return this._models.children;
  }

  get modelsGroup() {
    return this._models;
  }

  get modelsGeometry() {
    return this._modelsGeometry;
  }

  constructor() {
    this._models = new THREE.Group();
    this._modelsGeometry = [];
  }

  addGeometry(geometry) {
    this.modelsGeometry.push(geometry);
  }

  addModel(model) {
    this.modelsGroup.add(model);
  }

  findModelByUUID(modelUUID) {
    return this.models.find((value) => {
      if (value != null) {
        return modelUUID === value.uuid;
      }
      return false;
    });
  }

  findGeometryByUUID(geometryUUID) {
    return this.modelsGeometry.find((value) => {
      if (value != null) {
        return geometryUUID === value.uuid;
      }
      return false;
    });
  }
}

export { Models };
