import { GUI } from "lil-gui";
import { common } from "@/utils/common";

class MyGUI {
  constructor(component, scene) {
    this._component = component;
    this._scene = scene;

    this.root = new GUI();

    this.initGUI();
  }

  initGUI() {
    this.initFolderRoot();
    this.updateFolder(this.root, "slicing", this.initFolderSlicing);
    this.updateFolder(this.root, "clippingPlane", this.initFolderClippingPlane);
    this.updateFolderModel();
  }

  initFolderRoot() {
    this.root
      .add(common, "mode", ["view", "slicing"])
      .name("mode")
      .onChange(() => this._scene.updateMode());
    this.root.add(this._scene, "packing").name("packing");
  }

  initFolderSlicing(folder) {
    folder.add(common.slicing, "viewSlice").name("viewSlice");
    folder
      .add(common.slicing, "step")
      .name("step")
      .min(0.001)
      .max(0.1)
      .listen();
    this.updateFolder(
      folder,
      "slicingResolution",
      this.initFolderSlicingResolution
    );
    folder.add(this._component, "saveImages").name("export");
  }

  initFolderSlicingResolution(folder) {
    folder.add(common.slicing, "widthResolution").name("width");
    folder.add(common.slicing, "heightResolution").name("height");
  }

  initFolderClippingPlane(folder) {
    folder
      .add(common.clippingPlane, "constant")
      .name("constant")
      .min(-1)
      .max(1)
      .listen()
      .onChange((d) => (this._scene._clippingPlane.constant = d));
  }

  showContentsFolderModel(folder) {
    if (common.selected.modelUUID) {
      this.updateFolder(folder, "scale", this.initFolderScale);
      this.updateFolder(folder, "positioning", this.initFolderPositioning);
    } else {
      const scale = this.findSubFolderByName(folder, "scale");
      const positioning = this.findSubFolderByName(folder, "positioning");
      if (scale) {
        scale.destroy();
      }
      if (positioning) {
        positioning.destroy();
      }
    }
  }

  initFolderModel(folder) {
    folder
      .add(
        common.selected,
        "modelUUID",
        [null].concat(this._scene.models.children.map((value) => value.uuid))
      )
      .name("modelUUID")
      .listen()
      .onChange(() => {
        this._scene.selectModel();
      });
    this.showContentsFolderModel(folder);
    folder.add(this._component, "uploadSTL").name("upload");
  }

  updateFolderModel = () =>
    this.updateFolder(this.root, "model", this.initFolderModel);

  initFolderScale(folder) {
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

  initFolderPositioning(folder) {
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

  findSubFolderByName = (root, folderName) =>
    root.folders.find((folder) => folderName === folder._title);

  updateFolder(root, folderName, init) {
    const subFolder = this.findSubFolderByName(root, folderName);
    if (subFolder) {
      subFolder.destroy();
    }
    if (init) {
      init.call(this, root.addFolder(folderName));
    }
  }

  disableAll(disabled) {
    this.disableAllInGUI(this.root, disabled);
    this.disableAllFolders(this.root, disabled);
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
}

export { MyGUI };
