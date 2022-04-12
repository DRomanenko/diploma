<template>
  <div id="app"></div>
</template>

<script>
import JSZip from "jszip";
import { saveAs } from "file-saver";
import * as THREE from "three";
import { GUI } from "lil-gui";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const loader = new STLLoader();
// const OrbitControls = require('three-orbit-controls')(THREE)
let container;
let camera;
let renderer;
let scene;

let geometry;
let object;
let planes, planeObjects, planeHelpers;

const gui = new GUI();

// let strDownloadMime = "image/octet-stream";
// let clock;
const params = {
  planeY: {
    constant: 0,
    negated: false,
    displayHelper: true,
  },
  scale: 0.03,
  // editVue: function () {
  //   mode.slicing = !mode.slicing;
  //   this.setCamera();
  // },
};

const mode = {
  slicing: false,
};

export default {
  mounted: async function () {
    geometry = await this.loadGeometry();
    geometry.scale(params.scale, params.scale, params.scale);
    this.setGUI();
    this.init();
    window.addEventListener("resize", this.onWindowResize);
  },
  // TODO 100 добавить vite.config.ts (перейти на vite) tsconfig.json .eslintrc.js
  methods: {
    loadGeometry: async function () {
      return await loader.loadAsync(
        "models/Model_44_S3.540.45_T3.8.46_E4.3.47_R5.7.stl"
      );
    },

    sleep: function (time) {
      return new Promise((resolve) => setTimeout(resolve, time));
    },

    pad: function (number, number_digits) {
      return ("000000000" + number).slice(-number_digits);
    },

    saveImage: async function () {
      const zip = new JSZip();
      gui.hide();
      const progress_gui = new GUI();
      progress_gui
        .add(planes[0], "constant")
        .min(-1)
        .max(1)
        .name("progress")
        .listen();
      progress_gui.show();

      const number_slice = 100;
      for (let i = -number_slice; i <= number_slice; i++) {
        planes[0].constant = (1 / number_slice) * i;
        progress_gui.save();
        await this.sleep(100);

        const canvas = document.getElementsByTagName("canvas")[0];
        let image = new Image();
        image.src = canvas.toDataURL();
        zip.file(
          "slice" + this.pad(number_slice + i, 3) + ".png",
          image.src.slice(image.src.indexOf(",") + 1),
          { base64: true }
        );
      }
      zip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, "slicing.zip");
      });
      planes[0].constant = 0;
      progress_gui.hide();
      gui.show();
    },

    setGUI: function () {
      const slicing = gui.addFolder("slicing");
      slicing
        .add(mode, "slicing")
        .listen()
        .onChange((value) => {
          mode.slicing = value;
          this.setCamera();
        });
      slicing.add(this, "saveImage").name("export");
      slicing.open();

      const planeY = gui.addFolder("planeY");
      planeY
        .add(params.planeY, "displayHelper")
        .listen()
        .onChange((v) => (planeHelpers[0].visible = v));
      planeY
        .add(params.planeY, "constant")
        .min(-1)
        .max(1)
        .listen()
        .onChange((d) => (planes[0].constant = d));
      planeY.add(params.planeY, "negated").onChange(() => {
        planes[0].negate();
        params.planeY.constant = planes[0].constant;
      });
      planeY.open();

      const scale = gui.addFolder("scale");
      scale
        .add(params, "scale")
        .min(0)
        .max(1)
        .listen()
        .onChange((d) => {
          params.scale = d;
        });
      scale.open();
    },

    init: function () {
      container = document.querySelector("#app");
      this.setScene();
      // TODO 3 более прозрачные границы
      planes = [
        new THREE.Plane(new THREE.Vector3(0, -1, 0), params.planeY.constant),

        new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1),
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), -1).negate(),

        new THREE.Plane(new THREE.Vector3(0, -1, 0), 1),
        new THREE.Plane(new THREE.Vector3(0, -1, 0), -1).negate(),

        new THREE.Plane(new THREE.Vector3(0, 0, -1), 1),
        new THREE.Plane(new THREE.Vector3(0, 0, -1), -1).negate(),
      ];
      planeHelpers = planes.map((p) => new THREE.PlaneHelper(p, 2, 0xffffff));
      planeHelpers.forEach((ph) => {
        ph.visible = true;
        scene.add(ph);
      });
      this.setMaterial();
      this.createLights();
      this.setRender();
      this.setCamera();
    },

    setScene: function () {
      scene = new THREE.Scene();
      scene.background = new THREE.Color("black");
    },

    setCamera: function () {
      if (mode.slicing) {
        camera = new THREE.OrthographicCamera(-2, 2, 1, -1);
        camera.position.set(0, 2, 0);
        camera.lookAt(new THREE.Vector3(0, 1, 0));
        planeHelpers.forEach((ph) => {
          ph.visible = false;
          // const normal = ph.plane.normal;
          // if (normal.y === -1 || normal.y === 1) {
          //   ph.visible = false;
          // } else {
          //   console.log(ph.plane.normal);
          // }
          // if (ph.normal) {
          //   console.log(ph.plane.normal);
          //   ph.visible = false;
          // }
        });
        object.children[7].visible = false;
      } else {
        camera = new THREE.PerspectiveCamera(
          35,
          container.clientWidth / container.clientHeight,
          0.1,
          100
        );
        camera.position.set(0, 0, 10);
        planeHelpers.forEach((ph) => {
          ph.visible = true;
        });
        object.children[7].visible = true;
        new OrbitControls(camera, renderer.domElement);
      }
    },

    setMaterial: function () {
      object = new THREE.Group();
      scene.add(object);

      // Set up clip plane rendering
      planeObjects = [];
      const planeGeom = new THREE.PlaneGeometry(2, 2, 1, 1);

      for (let i = 0; i < planes.length; i++) {
        const poGroup = new THREE.Group();
        const plane = planes[i];
        const stencilGroup = this.createPlaneStencilGroup(
          geometry,
          plane,
          i + 1
        );

        // plane is clipped by the other clipping planes
        const planeMat = new THREE.MeshStandardMaterial({
          color: "white", // 0xe91e63
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
        clippingPlanes: planes,

        color: 0xffc107,
        metalness: 0.1,
        roughness: 0.75,
        shadowSide: THREE.DoubleSide,
      });

      // add the color
      const clippedColorFront = new THREE.Mesh(geometry, material);
      clippedColorFront.renderOrder = 6;
      object.add(clippedColorFront);
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

      // const mainLight = new THREE.DirectionalLight(0xffffff, 5);
      // mainLight.position.set(10, 10, 10);

      scene.add(ambientLight);
    },

    setRender: function () {
      renderer = new THREE.WebGLRenderer({
        // antialias: true, // убрал, поскольку оставляет неприятную лесенку на картинке
        preserveDrawingBuffer: true,
      });
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
};
</script>

<style>
#app {
  position: absolute;
  width: 100%;
  height: 100%;
}
</style>
