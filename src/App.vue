<template>
  <div id="app"></div>
</template>

<script>
import { Scene } from "@/scene/scene";
import { GeometryLoader } from "@/utils/loader";

let scene;
const loader = new GeometryLoader();

export default {
  mounted: async function () {
    const canvas = document.querySelector("#app");
    const geometry = await loader.load(
      "models/Model_44_S3.540.45_T3.8.46_E4.3.47_R5.7.stl"
    );
    scene = new Scene(canvas, geometry);
    scene.addGeometry(geometry);
  },
  // TODO 100 добавить vite.config.ts (перейти на vite) tsconfig.json .eslintrc.js
  methods: {},
};
</script>

<style>
#app {
  position: absolute;
  width: 100%;
  height: 100%;
}
</style>
