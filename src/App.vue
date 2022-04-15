<template>
  <el-container>
    <div id="app"></div>
  </el-container>
</template>

<script>
import { Gui } from "@/utils/gui";
import { Scene } from "@/scene/scene";
import { common } from "@/utils/common";
import { GeometryLoader } from "@/utils/loader";

let scene;

const gui = new Gui();
const loader = new GeometryLoader();

export default {
  name: "App",
  data() {
    return {
      dialogVisible: false,
    };
  },
  mounted: async function () {
    const canvas = document.querySelector("#app");
    const geometry = await loader.load(
      "models/Model_44_S3.540.45_T3.8.46_E4.3.47_R5.7.stl"
    );
    scene = new Scene(canvas);
    scene.addGeometry(geometry);

    this.initGUI();
  },
  // TODO 100 добавить vite.common.ts (перейти на vite) tsconfig.json .eslintrc.js
  methods: {
    async saveImages() {
      if (common.mode === "slicing") {
        gui.disableAll(true);
        await scene.saveImages();
        gui.disableAll(false);
      } else {
        alert("Export is only available in 'slicing' mode");
      }
    },

    initGUI() {
      gui.root.add(common, "mode", ["view", "slicing"]).onChange((value) => {
        common.mode = value;
        scene.update();
      });
      const slicing = gui.root.addFolder("slicing");
      slicing.add(common.slicing, "viewSlice");
      slicing.add(this, "saveImages").name("export");
      slicing.open();

      const clippingPlane = gui.root.addFolder("ClippingPlane");
      clippingPlane
        .add(common.clippingPlane, "constant")
        .min(-1)
        .max(1)
        .listen()
        .onChange((d) => (scene._clippingPlane.constant = d));
      clippingPlane.open();
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
