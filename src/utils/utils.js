export function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function getBounding(geometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  return {
    box: box,
    width: box.max.x - box.min.x,
    height: box.max.y - box.min.y,
    depth: box.max.z - box.min.z,
    min: box.min,
    max: box.max,
  };
}
