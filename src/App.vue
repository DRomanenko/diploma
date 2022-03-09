<template>
  <Renderer
    ref="rendererC"
    antialias
    :orbit-ctrl="{ enableDamping: true }"
    resize="window"
  >
    <Camera :position="{ z: 100 }" />
    <Scene ref="sceneC">
      <PointLight :position="{ y: 50, z: 50 }" />
      <HemisphereLight :position="{ y: 500, z: 500 }" />
      <Mesh ref="meshC" :rotation="{ y: Math.PI / 4, z: Math.PI / 4 }">
        <LambertMaterial />
      </Mesh>
    </Scene>
  </Renderer>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { GUI } from "lil-gui";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import {
  Camera,
  HemisphereLight,
  LambertMaterial,
  Mesh,
  MeshPublicInterface,
  PointLight,
  Renderer,
  RendererPublicInterface,
  Scene,
} from "troisjs";

export default defineComponent({
  name: "App",
  components: {
    Mesh,
    Camera,
    LambertMaterial,
    PointLight,
    HemisphereLight,
    Renderer,
    Scene,
  },
  data() {
    return {
      mesh: new THREE.Mesh(),
      params: {
        animate: true,
        planeX: {
          constant: 0,
          negated: false,
          displayHelper: false,
        },
        planeY: {
          constant: 0,
          negated: false,
          displayHelper: false,
        },
        planeZ: {
          constant: 0,
          negated: false,
          displayHelper: false,
        },
      },
    };
  },
  mounted() {
    this.init();
  },
  methods: {
    init() {
      const renderer = this.$refs.rendererC as RendererPublicInterface;
      const mesh = (this.$refs.meshC as MeshPublicInterface).mesh as THREE.Mesh;
      const scene: THREE.Scene = this.$refs.sceneC as THREE.Scene;

      // TODO Добавить отсечение плоскостями

      const planes: Array<THREE.Plane> = [
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
        new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
        new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
      ];
      const planeHelpers: Array<THREE.PlaneHelper> = planes.map(
        (p) => new THREE.PlaneHelper(p, 50, 0xffffff)
      );
      planeHelpers.forEach((ph) => {
        ph.visible = false;
        scene.add(ph);
      });

      const loader = new STLLoader();
      if (renderer && mesh) {
        loader.load(
          "models/1250_polygon_sphere_100mm.stl",
          function (geometry) {
            mesh.material = new THREE.MeshPhongMaterial({
              color: 0xff5533,
              specular: 0x111111,
              shininess: 200,
            });
            mesh.geometry = geometry;

            mesh.position.set(0, -0.25, 0.6);
            mesh.rotation.set(0, -Math.PI / 2, 0);
            mesh.scale.set(0.5, 0.5, 0.5);

            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        );

        this.mesh = mesh;

        const gui = new GUI();
        gui.add(this.params, "animate");

        const planeX = gui.addFolder("planeX");
        planeX
          .add(this.params.planeX, "displayHelper")
          .onChange((v: boolean) => (planeHelpers[0].visible = v));
        planeX
          .add(this.params.planeX, "constant")
          .min(-25)
          .max(25)
          .onChange((d: number) => (planes[0].constant = d));
        planeX.add(this.params.planeX, "negated").onChange(() => {
          planes[0].negate();
          this.params.planeX.constant = planes[0].constant;
        });
        planeX.open();

        const planeY = gui.addFolder("planeY");
        planeY
          .add(this.params.planeY, "displayHelper")
          .onChange((v: boolean) => (planeHelpers[1].visible = v));
        planeY
          .add(this.params.planeY, "constant")
          .min(-25)
          .max(25)
          .onChange((d: number) => (planes[1].constant = d));
        planeY.add(this.params.planeY, "negated").onChange(() => {
          planes[1].negate();
          this.params.planeY.constant = planes[1].constant;
        });
        planeY.open();

        const planeZ = gui.addFolder("planeZ");
        planeZ
          .add(this.params.planeZ, "displayHelper")
          .onChange((v: boolean) => (planeHelpers[2].visible = v));
        planeZ
          .add(this.params.planeZ, "constant")
          .min(-25)
          .max(25)
          .onChange((d: number) => (planes[2].constant = d));
        planeZ.add(this.params.planeZ, "negated").onChange(() => {
          planes[2].negate();
          this.params.planeZ.constant = planes[2].constant;
        });
        planeZ.open();

        // mesh.geometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);
        renderer.onBeforeRender(() => this.animate(this.mesh));
      }
    },

    animate(mesh: THREE.Mesh) {
      if (this.params.animate) {
        mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.01;
        mesh.rotation.z += 0.01;
      }
    },
  },
});
</script>

<style>
body,
html {
  margin: 0;
}

canvas {
  display: block;
}
</style>
