import JSZip from "jszip";
import { saveAs } from "file-saver";

class Exporter {
  static _pad(number, max_number_digits) {
    return ("000000000" + number).slice(-max_number_digits);
  }

  constructor() {
    this._zip = new JSZip();
  }

  addImage(file_name, image, image_number, max_number = 3) {
    this._zip.file(
      file_name + Exporter._pad(image_number, max_number) + ".png",
      image.src.slice(image.src.indexOf(",") + 1),
      { base64: true }
    );
  }

  saveAsZip(archive_name = "slicing") {
    this._zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, archive_name + ".zip");
    });
  }
}

export { Exporter };
