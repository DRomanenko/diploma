import * as THREE from "three";

class Renderer {
  get renderer() {
    return this._renderer;
  }

  get domElement() {
    return this.renderer.domElement;
  }

  constructor(canvas) {
    this._renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true, // false preferred for 'slicing' / true preferred for 'view'
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    this._renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this._renderer.setPixelRatio(window.devicePixelRatio);

    this._renderer.localClippingEnabled = true;
    this._renderer.physicallyCorrectLights = true;
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);
  }

  setSize(width, height) {
    this.renderer.setSize(width, height);
  }
}

export { Renderer };
