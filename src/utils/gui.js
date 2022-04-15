import { GUI } from "lil-gui";

class Gui {
  constructor() {
    this.root = new GUI();
  }

  disableAll(disabled) {
    this.root.controllers.forEach((folder) => {
      folder.disable(!disabled);
    });
    this.root.folders.forEach((childGUI) => {
      childGUI.controllers.forEach((folder) => {
        folder.disable(!disabled);
      });
    });
  }
}

export { Gui };
