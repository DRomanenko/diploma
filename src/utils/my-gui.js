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
    this.updateFolder(this.root, "model", this.initFolderModel);
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
    folder.add(this._component, "saveImages").name("export");
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

  initFolderModel(folder) {
    folder
      .add(
        common.selected,
        "modelUUID",
        [null].concat(this._scene.models.children.map((value) => value.uuid))
      )
      .name("modelUUID")
      .onChange(() => this._scene.selectModel());

    this.updateFolder(folder, "scale", this.initFolderScale);
    this.updateFolder(folder, "positioning", this.initFolderPositioning);

    folder.add(this._component, "uploadSTL").name("uploadSTL");
  }

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
    folder.close();
  }

  initFolderPositioning(folder) {
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
    folder.close();
  }

  updateFolder(root, folderName, init) {
    const subFolder = root.folders.find(
      (folder) => folderName === folder._title
    );
    if (subFolder) {
      subFolder.destroy();
    }
    if (init) {
      init.call(this, root.addFolder(folderName));
    }
  }

  disableAll(disabled) {
    this.disableAllInGUI(this.root, disabled);
    this.root.folders.forEach((childGUI) => {
      this.disableAllInGUI(childGUI, disabled);
    });
  }

  disableAllInGUI(gui, disabled) {
    gui.controllers.forEach((folder) => {
      folder.disable(disabled);
    });
  }
}

export { MyGUI };
