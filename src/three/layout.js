export function viewportLayout(count, width, height) {
  const columns = count <= 1 ? 1 : count <= 4 ? 2 : 3,
    rows = count <= 2 ? 1 : 2;
  return Array.from({ length: count }, (_, i) => {
    const col = i % columns,
      row = Math.floor(i / columns),
      x = Math.round((col * width) / columns),
      top = Math.round((row * height) / rows);
    return {
      x,
      y: height - Math.round(((row + 1) * height) / rows),
      top,
      width: Math.round(((col + 1) * width) / columns) - x,
      height: Math.round(((row + 1) * height) / rows) - top,
    };
  });
}
