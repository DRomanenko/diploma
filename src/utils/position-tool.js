import * as THREE from "three";
import { getBounding } from "@/utils/utils";

const size = 1;
const highlightedColor = "cyan";
const xColor = "red";
const yColor = "green";
const zColor = "blue";
const rotationColor = "lightgray";

class PositionTool {
  constructor() {
    this.control = new THREE.Group();
    this._currentControl = null;
    this._currentGeometry = null;
    this._init();
  }

  _init() {
    function getSquareControl(size, vector, color) {
      const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
      geometry.lookAt(vector);

      const material = new THREE.MeshBasicMaterial({
        color,
        opacity: 0.5,
        transparent: true,
        side: THREE.DoubleSide,
      });
      return new THREE.Mesh(geometry, material);
    }

    function getCylinderControl(size, color) {
      const geometry = new THREE.CylinderGeometry(
        size / 15,
        size / 15,
        size * 1.25,
        12
      );
      const material = new THREE.MeshBasicMaterial({
        color,
        opacity: 0.25,
        transparent: true,
        side: THREE.DoubleSide,
      });
      return new THREE.Mesh(geometry, material);
    }

    this._controlX = getSquareControl(size, new THREE.Vector3(1, 0, 0), xColor);
    this.control.add(this._controlX);
    this._controlY = getSquareControl(size, new THREE.Vector3(0, 1, 0), yColor);
    this.control.add(this._controlY);
    this._controlZ = getSquareControl(size, new THREE.Vector3(0, 0, 1), zColor);
    this.control.add(this._controlZ);

    this._controlRotation = getCylinderControl(size, rotationColor);
    this.control.add(this._controlRotation);
    this.hide();
  }

  _highlightControl(control, highlighted) {
    let isHighlighted = control.material.color.equals(
      new THREE.Color(highlightedColor)
    );

    if (isHighlighted !== highlighted) {
      if (highlighted) {
        control.material.color.set(highlightedColor);
      } else {
        let color = null;
        switch (control) {
          case this._controlX:
            color = xColor;
            break;
          case this._controlY:
            color = yColor;
            break;
          case this._controlZ:
            color = zColor;
            break;
          case this._controlRotation:
            color = rotationColor;
            break;
        }

        control.material.color.set(color);
      }
    }
  }

  _setCurrentControl(control) {
    let xHighlight = false;
    let yHighlight = false;
    let zHighlight = false;
    let rotationHighlight = false;
    let interception = true;

    switch (control) {
      case this._controlX:
        xHighlight = true;
        this._currentControl = control;
        break;
      case this._controlY:
        yHighlight = true;
        this._currentControl = control;
        break;
      case this._controlZ:
        zHighlight = true;
        this._currentControl = control;
        break;
      case this._controlRotation:
        rotationHighlight = true;
        this._currentControl = control;
        break;
      default:
        interception = false;
        this._currentControl = null;
        break;
    }

    this._highlightControl(this._controlX, xHighlight);
    this._highlightControl(this._controlY, yHighlight);
    this._highlightControl(this._controlZ, zHighlight);
    this._highlightControl(this._controlRotation, rotationHighlight);
    return interception;
  }

  show() {
    this.control.visible = true;
    this._currentControl = null;
  }

  hide() {
    this.control.visible = false;
    this._currentControl = null;
    this._currentGeometry = null;
  }

  selectGeometry(geometry) {
    function setCenter(control, coordinates) {
      const geometry = control.geometry;
      geometry.center();
      geometry.translate(coordinates.x, coordinates.y, coordinates.z);
      geometry.attributes.position.needsUpdate = true;
    }

    function setDefaultSize(control) {
      const geometry = control.geometry;
      const bounding = getBounding(geometry);
      const new_square = Math.max(
        bounding.width,
        bounding.height,
        bounding.depth
      );
      const scale = size / new_square;
      geometry.scale(scale, scale, scale);
    }

    function setSize(control, targetBounding, factor) {
      setDefaultSize(control);
      const scale = Math.max(
        targetBounding.width,
        targetBounding.height,
        targetBounding.depth
      );
      const geometry = control.geometry;
      geometry.scale(scale * factor, scale * factor, scale * factor);
      geometry.attributes.position.needsUpdate = true;
    }

    this._currentGeometry = geometry;
    if (this._currentGeometry) {
      const bounding = getBounding(geometry);
      let factor = 1.15;
      setSize(this._controlX, bounding, factor);
      setSize(this._controlY, bounding, factor);
      setSize(this._controlZ, bounding, factor);
      factor = 1.3;
      setSize(this._controlRotation, bounding, factor);

      let center = new THREE.Vector3();
      bounding.box.getCenter(center);

      setCenter(this._controlX, center);
      setCenter(this._controlY, center);
      setCenter(this._controlZ, center);
      setCenter(this._controlRotation, center);

      this.show();
    } else {
      this.hide();
    }
  }

  selectControl(uuid) {
    const control = this.control.children.find((value) => uuid === value.uuid);
    return this._setCurrentControl(control);
  }
}

export { PositionTool };
