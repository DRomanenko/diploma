import { GUI } from "lil-gui";

import { common } from "@/utils/common";
import { GeometryLoader } from "@/utils/loader";

class MyGUI {
  constructor(scene) {
    this._scene = scene;

    this._loader = new GeometryLoader();
    this._root = new GUI();

    this._initGUI();
  }

  _initGUI() {
    this._initFolderRoot();
    this._updateFolder(this._root, "slicing", this._initFolderSlicing);
    this._updateFolder(
      this._root,
      "clippingPlane",
      this._initFolderClippingPlane
    );
    this.updateFolderModel();
  }

  _initFolderRoot() {
    this._root
      .add(common, "mode", ["view", "slicing"])
      .name("mode")
      .onChange(() => this._scene.updateMode());
    this._root.add(this._scene, "packing").name("packing");
  }

  _initFolderSlicing(folder) {
    folder.add(common.slicing, "viewSlice").name("viewSlice");
    folder
      .add(common.slicing, "step")
      .name("step")
      .min(0.001)
      .max(0.1)
      .listen();
    this._updateFolder(
      folder,
      "slicingResolution",
      this._initFolderSlicingResolution
    );
    folder.add(this, "saveImages").name("export");
  }

  _initFolderSlicingResolution(folder) {
    folder.add(common.slicing, "widthResolution").name("width");
    folder.add(common.slicing, "heightResolution").name("height");
  }

  _initFolderClippingPlane(folder) {
    folder
      .add(common.clippingPlane, "constant")
      .name("constant")
      .min(-1)
      .max(1)
      .listen()
      .onChange((d) => (this._scene.clipping.constant = d));
  }

  _showContentsFolderModel(folder) {
    if (common.selected.modelUUID) {
      this._updateFolder(folder, "scale", this._initFolderScale);
      this._updateFolder(folder, "positioning", this._initFolderPositioning);
    } else {
      const scale = this._findSubFolderByName(folder, "scale");
      const positioning = this._findSubFolderByName(folder, "positioning");
      if (scale) {
        scale.destroy();
      }
      if (positioning) {
        positioning.destroy();
      }
    }
  }

  _initFolderModel(folder) {
    folder
      .add(
        common.selected,
        "modelUUID",
        [null].concat(this._scene._models.models.map((value) => value.uuid))
      )
      .name("modelUUID")
      .listen()
      .onChange(() => {
        this._scene.selectModel();
        this.updateFolderModel();
      });
    this._showContentsFolderModel(folder);
    folder.add(this, "uploadSTL").name("upload");
  }

  _initFolderScale(folder) {
    folder
      .add(common.selected, "scale")
      .name("scale")
      .min(0.01)
      .max(1)
      .listen()
      .onFinishChange(() => {
        this._scene.updateScale();
      });
  }

  _initFolderPositioning(folder) {
    folder
      .add(common.selected, "graphicalPositioning")
      .name("graphicalPositioning");
    folder
      .add(common.selected, "x")
      .name("x")
      .listen()
      .min(-1)
      .max(1)
      .onChange(() => {
        this._scene.updatePosition();
      });
    folder
      .add(common.selected, "y")
      .name("y")
      .min(-1)
      .max(1)
      .listen()
      .onChange(() => {
        this._scene.updatePosition();
      });
    folder
      .add(common.selected, "z")
      .name("z")
      .min(-1)
      .max(1)
      .listen()
      .onChange(() => {
        this._scene.updatePosition();
      });
  }

  _findSubFolderByName = (root, folderName) =>
    root.folders.find((folder) => folderName === folder._title);

  _updateFolder(root, folderName, init) {
    const subFolder = this._findSubFolderByName(root, folderName);
    if (subFolder) {
      subFolder.destroy();
    }
    if (init) {
      init.call(this, root.addFolder(folderName));
    }
  }

  updateFolderModel = () =>
    this._updateFolder(this._root, "model", this._initFolderModel);

  disableAll(disabled) {
    this.disableAllInGUI(this._root, disabled);
    this.disableAllFolders(this._root, disabled);
  }

  disableAllFolders(gui, disabled) {
    if (gui) {
      gui.folders.forEach((childGUI) => {
        this.disableAllFolders(childGUI, disabled);
        this.disableAllInGUI(childGUI, disabled);
      });
    }
  }

  disableAllInGUI(gui, disabled) {
    gui.controllers.forEach((folder) => {
      folder.disable(disabled);
    });
  }

  async uploadSTL() {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      const geometry = await this._loader.parseFile(file);
      this._scene.addGeometry(geometry);
      this._scene.packing();
      this.updateFolderModel();
    };
    input.click();
  }

  async saveImages() {
    if (common.mode === "slicing") {
      this.disableAll(true);
      await this._scene.saveImages();
      this.disableAll(false);
    } else {
      alert("Export is only available in 'slicing' mode");
    }
  }
}

export { MyGUI };
