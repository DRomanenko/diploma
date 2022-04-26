<template>
  <div id="app"></div>
</template>

<script>
import { Gui } from "@/utils/gui";
import { Scene } from "@/scene/scene";
import { common } from "@/utils/common";
import { GeometryLoader } from "@/utils/loader";

let scene;

const gui = new Gui();
let slicing = null;
let clippingPlane = null;
let model = null;
let positioning = null;
let scale = null;

const folders = {
  model: "model",
};

const loader = new GeometryLoader();

export default {
  name: "App",
  mounted: async function () {
    const canvas = document.querySelector("#app");
    scene = new Scene(canvas);

    // const geometry1 = await loader.load(
    //   "models/Model_44_S3.540.45_T3.8.46_E4.3.47_R5.7.stl"
    // );
    // const geometry2 = await loader.load("models/default.stl");
    // scene.addGeometry(geometry1);
    // scene.addGeometry(geometry2);
    // scene.addGeometry(geometry1);
    // scene.addGeometry(geometry2);
    // scene.addGeometry(geometry2);

    this.initGUI();
  },

  methods: {
    async uploadSTL() {
      const input = document.createElement("input");
      input.type = "file";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        const geometry = await loader.parseFile(file);
        scene.addGeometry(geometry);
        this.initGUImodel();
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

    initGUI() {
      gui.root.add(common, "mode", ["view", "slicing"]).onChange(() => {
        scene.updateMode();
      });
      gui.root.add(scene, "packing").name("packing");

      slicing = gui.root.addFolder("slicing");
      clippingPlane = gui.root.addFolder("clippingPlane");

      slicing.add(common.slicing, "viewSlice");
      slicing.add(this, "saveImages").name("export");

      clippingPlane
        .add(common.clippingPlane, "constant", -1, 1)
        .listen()
        .onChange((d) => (scene._clippingPlane.constant = d));
      this.initGUImodel();
    },

    initGUImodel() {
      if (null !== model) {
        gui.root.folders
          .find((folder) => folders.model === folder._title)
          .destroy();
      }
      model = gui.root.addFolder(folders.model);
      model
        .add(
          common.selected,
          "modelUUID",
          [null].concat(scene._models.children.map((value) => value.uuid))
        )
        .onChange(() => {
          scene.selectModel();
        });
      this.initGUIScale();
      this.initGUIpositioning();
      model.add(this, "uploadSTL");
    },

    initGUIpositioning() {
      positioning = model.addFolder("positioning");

      positioning
        .add(common.selected, "x", -1, 1)
        .listen()
        .onChange(() => {
          scene.updatePosition();
        });
      positioning
        .add(common.selected, "y", -1, 1)
        .listen()
        .onChange(() => {
          scene.updatePosition();
        });
      positioning
        .add(common.selected, "z", -1, 1)
        .listen()
        .onChange(() => {
          scene.updatePosition();
        });
      positioning.close();
    },

    initGUIScale() {
      scale = model.addFolder("scale");
      scale
        .add(common.selected, "scale", 0.01, 1)
        .listen()
        .onFinishChange(() => {
          scene.updateScale();
        });
      scale.close();
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
