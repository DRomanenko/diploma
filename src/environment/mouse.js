import * as THREE from "three";

class Mouse {
  get x() {
    return this._pointer.x;
  }

  get y() {
    return this._pointer.y;
  }

  get pointer() {
    return this._pointer;
  }

  set x(value) {
    this._pointer.x = value;
  }

  set y(value) {
    this._pointer.y = value;
  }

  constructor() {
    this._pointer = new THREE.Vector2();
  }

  onMouseMove(event, canvas) {
    event.preventDefault();
    this.x = (event.clientX / canvas.clientWidth) * 2 - 1;
    this.y = -(event.clientY / canvas.clientHeight) * 2 + 1;
  }
}

export { Mouse };
