export function disposeObject3D(object) {
  if (!object) return;
  object.geometry?.dispose?.();
  if (Array.isArray(object.material)) {
    for (const material of object.material) material?.dispose?.();
  } else {
    object.material?.dispose?.();
  }
}

export function disposeList(items) {
  for (const item of items) {
    if (!item) continue;
    if (typeof item.dispose === "function") {
      item.dispose();
      continue;
    }
    disposeObject3D(item);
  }
}
