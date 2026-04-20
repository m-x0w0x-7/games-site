export function getRowFromIndex(index, gridSize) {
  return Math.floor(index / gridSize);
}

export function getColFromIndex(index, gridSize) {
  return index % gridSize;
}

export function getIndexFromRowCol(row, col, gridSize) {
  return row * gridSize + col;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

export function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function swapArrayItems(arr, i, j) {
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}
