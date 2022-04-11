<template>
  <div id="app"></div>
</template>

<script>
import * as THREE from "three";
import { GUI } from "lil-gui";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

// const OrbitControls = require('three-orbit-controls')(THREE)
let container;
let camera;
let renderer;
let scene;

let object;
let planes, planeObjects, planeHelpers;
// let clock;
const params = {
  animate: false,
  planeX: {
    constant: 1,
    negated: false,
    displayHelper: true,
  },
  planeY: {
    constant: 0,
    negated: false,
    displayHelper: true,
  },
  planeZ: {
    constant: 1,
    negated: false,
    displayHelper: true,
  },
};

export default {
  // TODO 100 добавить vite.config.ts (перейти на vite) tsconfig.json .eslintrc.js
  methods: {
    init: function () {
      container = document.querySelector("#app");
      this.setScene();
      this.setCamera();
      // TODO 2 add borders
      // TODO 3 более прозрачные границы
      planes = [
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), params.planeX.constant),
        new THREE.Plane(new THREE.Vector3(0, -1, 0), params.planeY.constant),
        new THREE.Plane(new THREE.Vector3(0, 0, -1), params.planeZ.constant),
      ];
      planeHelpers = planes.map((p) => new THREE.PlaneHelper(p, 2, 0xffffff));
      planeHelpers.forEach((ph) => {
        ph.visible = true;
        scene.add(ph);
      });
      this.setGUI();
      this.setMaterial();
      this.createLights();
      this.setRender();
    },
    setGUI: function () {
      const gui = new GUI();
      gui.add(params, "animate");

      const planeX = gui.addFolder("planeX");
      planeX
        .add(params.planeX, "displayHelper")
        .onChange((v) => (planeHelpers[0].visible = v));
      planeX
        .add(params.planeX, "constant")
        .min(-1)
        .max(1)
        .onChange((d) => (planes[0].constant = d));
      planeX.add(params.planeX, "negated").onChange(() => {
        planes[0].negate();
        params.planeX.constant = planes[0].constant;
      });
      planeX.open();

      const planeY = gui.addFolder("planeY");
      planeY
        .add(params.planeY, "displayHelper")
        .onChange((v) => (planeHelpers[1].visible = v));
      planeY
        .add(params.planeY, "constant")
        .min(-1)
        .max(1)
        .onChange((d) => (planes[1].constant = d));
      planeY.add(params.planeY, "negated").onChange(() => {
        planes[1].negate();
        params.planeY.constant = planes[1].constant;
      });
      planeY.open();

      const planeZ = gui.addFolder("planeZ");
      planeZ
        .add(params.planeZ, "displayHelper")
        .onChange((v) => (planeHelpers[2].visible = v));
      planeZ
        .add(params.planeZ, "constant")
        .min(-1)
        .max(1)
        .onChange((d) => (planes[2].constant = d));
      planeZ.add(params.planeZ, "negated").onChange(() => {
        planes[2].negate();
        params.planeZ.constant = planes[2].constant;
      });
      planeZ.open();
    },
    setScene: function () {
      scene = new THREE.Scene();
      scene.background = new THREE.Color("black");
    },
    setCamera: function () {
      camera = new THREE.PerspectiveCamera(
        35,
        container.clientWidth / container.clientHeight,
        0.1,
        100
      );
      camera.position.set(0, 0, 10);
    },
    setMaterial: function () {
      //Does not work by setting background for scene
      // const geometry = new THREE.TorusKnotGeometry(0.4, 0.15, 220, 60);
      // const textureLoader = new THREE.TextureLoader();
      // const texture = textureLoader.load(
      //   "https://images.unsplash.com/photo-1515387784663-e2e29a23f69e?ixlib=rb-1.2.1&w=1000&q=80"
      // );
      // texture.encoding = THREE.sRGBEncoding;
      // texture.anisotropy = 16;
      // const material = new THREE.MeshStandardMaterial({
      //   map: texture,
      // });
      // cube = new THREE.Mesh(geometry, material);
      // scene.add(cube);
      // TODO 1 add STLLoader
      const geometry = new THREE.TorusKnotGeometry(0.4, 0.15, 220, 60);
      object = new THREE.Group();
      scene.add(object);

      // Set up clip plane rendering
      planeObjects = [];
      const planeGeom = new THREE.PlaneGeometry(4, 4);

      for (let i = 0; i < 3; i++) {
        const poGroup = new THREE.Group();
        const plane = planes[i];
        const stencilGroup = this.createPlaneStencilGroup(
          geometry,
          plane,
          i + 1
        );

        // plane is clipped by the other clipping planes
        const planeMat = new THREE.MeshStandardMaterial({
          color: 0xe91e63,
          metalness: 0.1,
          roughness: 0.75,
          clippingPlanes: planes.filter((p) => p !== plane),

          stencilWrite: true,
          stencilRef: 0,
          stencilFunc: THREE.NotEqualStencilFunc,
          stencilFail: THREE.ReplaceStencilOp,
          stencilZFail: THREE.ReplaceStencilOp,
          stencilZPass: THREE.ReplaceStencilOp,
        });
        const po = new THREE.Mesh(planeGeom, planeMat);
        po.onAfterRender = function (renderer) {
          renderer.clearStencil();
        };

        po.renderOrder = i + 1.1;

        object.add(stencilGroup);
        poGroup.add(po);
        planeObjects.push(po);
        scene.add(poGroup);
      }

      const material = new THREE.MeshStandardMaterial({
        color: 0xffc107,
        metalness: 0.1,
        roughness: 0.75,
        clippingPlanes: planes,
        clipShadows: true,
        shadowSide: THREE.DoubleSide,
      });

      // add the color
      const clippedColorFront = new THREE.Mesh(geometry, material);
      clippedColorFront.castShadow = true;
      clippedColorFront.renderOrder = 6;
      object.add(clippedColorFront);

      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(9, 9, 1, 1),
        new THREE.ShadowMaterial({
          color: 0x000000,
          opacity: 0.25,
          side: THREE.DoubleSide,
        })
      );

      ground.rotation.x = -Math.PI / 2; // rotates X/Y to X/Z
      ground.position.y = -1;
      ground.receiveShadow = true;
      scene.add(ground);
    },
    createPlaneStencilGroup: function (geometry, plane, renderOrder) {
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
    },
    createLights: function () {
      const ambientLight = new THREE.HemisphereLight(
        0xddeeff, // sky color
        0x202020, // ground color
        5 // intensity
      );

      const mainLight = new THREE.DirectionalLight(0xffffff, 5);
      mainLight.position.set(10, 10, 10);

      scene.add(ambientLight, mainLight);
    },
    setRender: function () {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.physicallyCorrectLights = true;
      renderer.localClippingEnabled = true;
      container.appendChild(renderer.domElement);
      renderer.setAnimationLoop(() => {
        this.animate();
        this.render();
      });
    },

    animate: function () {
      requestAnimationFrame(this.animate);
      for (let i = 0; i < planeObjects.length; i++) {
        const plane = planes[i];
        const po = planeObjects[i];
        plane.coplanarPoint(po.position);
        po.lookAt(
          po.position.x - plane.normal.x,
          po.position.y - plane.normal.y,
          po.position.z - plane.normal.z
        );
      }
    },

    render: function () {
      renderer.render(scene, camera);
    },

    onWindowResize: function () {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    },
  },
  mounted: function () {
    this.init();
    window.addEventListener("resize", this.onWindowResize);
    new OrbitControls(camera, renderer.domElement);
  },
};
</script>

<style>
#app {
  position: absolute;
  width: 100%;
  height: 100%;
}
</style>
