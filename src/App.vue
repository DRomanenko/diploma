<template>
  <div id="app"></div>
</template>

<script>
import { MyGUI } from "@/utils/my-gui";
import { Scene } from "@/scene/scene";
import { common } from "@/utils/common";
import { GeometryLoader } from "@/utils/loader";

const loader = new GeometryLoader();
let scene;
let gui;

export default {
  name: "App",
  mounted: async function () {
    const canvas = document.querySelector("#app");
    scene = new Scene(canvas);
    gui = new MyGUI(this, scene);
    scene.addGUI(gui);
  },

  methods: {
    async uploadSTL() {
      const input = document.createElement("input");
      input.type = "file";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        const geometry = await loader.parseFile(file);
        scene.addGeometry(geometry);
        scene.packing();
      };
      input.click();
    },

    async saveImages() {
      if (common.mode === "slicing") {
        gui.disableAll(true);
        await scene.saveImages();
        gui.disableAll(false);
      } else {
        alert("Export is only available in 'slicing' mode");
      }
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
