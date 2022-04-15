import { GUI } from "lil-gui";

class Gui {
  constructor() {
    this.root = new GUI();
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

export { Gui };
