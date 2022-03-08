<template>
  <Renderer
    ref="rendererC"
    antialias
    :orbit-ctrl="{ enableDamping: true }"
    resize="window"
  >
    <Camera :position="{ z: 100 }" />
    <Scene>
      <PointLight :position="{ y: 50, z: 50 }" />
      <HemisphereLight :position="{ y: 500, z: 500 }" />
      <Mesh
        :size="1"
        ref="meshC"
        :rotation="{ y: Math.PI / 4, z: Math.PI / 4 }"
      >
        <LambertMaterial />
      </Mesh>
    </Scene>
  </Renderer>
</template>

<script lang="ts">
import { defineComponent } from "vue";
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
      planes: new Array<THREE.Plane>(),
    };
  },
  mounted() {
    const renderer = this.$refs.rendererC as RendererPublicInterface;
    const mesh = (this.$refs.meshC as MeshPublicInterface).mesh as THREE.Mesh;

    const loader = new STLLoader();
    if (renderer && mesh) {
      loader.load("models/1250_polygon_sphere_100mm.stl", function (geometry) {
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
      });

      this.mesh = mesh;

      // mesh.geometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);
      renderer.onBeforeRender(() => this.animate(this.mesh));
    }
  },
  methods: {
    animate(mesh: THREE.Mesh) {
      mesh.rotation.x += 0.01;
      mesh.rotation.y += 0.01;
      mesh.rotation.z += 0.01;
    },
  },
});

/*const rendererC = ref();
const meshC = ref();

onMounted(() => {
  const renderer = rendererC.value as RendererPublicInterface;
  const mesh = (meshC.value as MeshPublicInterface).mesh;

  mesh!.geometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);

  renderer.onBeforeRender(() => {
    mesh!.rotation.x += 0.01;
  });
});*/
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
