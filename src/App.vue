<template>
  <canvas id="app"></canvas>
</template>

<script>
import { GeometryLoader } from "@/utils/loader";
import { Environment } from "@/environment/environment";

let env;
const loader = new GeometryLoader();

export default {
  name: "App",
  mounted: async function () {
    const canvas = document.getElementById("app");
    env = new Environment(canvas);
  },

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
