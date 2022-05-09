import { common } from "@/utils/common";
import { Mouse } from "@/environment/mouse";
import { Scene } from "@/scene/scene";
import { MyGUI } from "@/gui/my-gui";
import { checkVisible } from "@/utils/utils";

class Environment {
  constructor(canvas) {
    this._mouse = new Mouse();
    this._scene = new Scene(canvas, this._mouse);
    this._gui = new MyGUI(this._scene);

    document.addEventListener("click", (event) => {
      this._getIntersectedObject(event);
    });

    if (common.selected.graphicalPositioning) {
      document.addEventListener("mousemove", (event) => {
        this._mouse.onMouseMove(event, this._scene.canvas);
      });
    }

    let ctrlActive = false;

    document.body.addEventListener("keyup", (event) => {
      if (event.key === "Control") ctrlActive = false;
    });

    document.body.addEventListener("keydown", (event) => {
      if (event.key === "Control") ctrlActive = true;
      if (ctrlActive === true && event.code === "KeyC") {
        // this disables the browsers default copy functionality
        event.preventDefault();

        if (common.selected.modelUUID) {
          const model = this._scene.models.findModelByUUID(
            common.selected.modelUUID
          );
          common.copy.geometry = model.geometry;
        } else {
          alert("Select a model");
        }
      }

      if (ctrlActive === true && event.code === "KeyV") {
        // this disables the browsers default paste functionality
        event.preventDefault();

        if (common.copy.geometry) {
          this.addGeometry(common.copy.geometry);
          this.packing();
        } else {
          alert("Select and copy a model");
        }
      }
    });
  }

  _getIntersectedObject(event) {
    this._mouse.onMouseMove(event, this._scene.canvas);

    const intersects = this._scene.getIntersects(
      this._scene.models.models,
      true
    );

    if (intersects && intersects.length > 0) {
      const object3d = intersects[0].object;
      if (checkVisible(object3d)) {
        common.selected.modelUUID = object3d.uuid;
        this.selectModel();
      }
    }
  }

  addGeometry(new_geometry) {
    this._scene.addGeometry(new_geometry);
    this._gui.updateFolderModel();
  }

  selectModel() {
    this._scene.selectModel();
    this._gui.updateFolderModel();
  }

  packing() {
    this._scene.packing();
  }
}

export { Environment };
