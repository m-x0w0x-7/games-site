import { getRowFromIndex, getColFromIndex } from './utils.js';

export function createSolvedTiles(gridSize) {
  const total = gridSize * gridSize;
  return Array.from({ length: total }, (_, i) => (i < total - 1 ? i : null));
}

export function initializePuzzle(state) {
  const total = state.gridSize * state.gridSize;
  state.tiles = createSolvedTiles(state.gridSize);
  state.emptyIndex = total - 1;
  state.moveCount = 0;
  state.isComplete = false;
}

export function isAdjacent(index1, index2, gridSize) {
  const row1 = getRowFromIndex(index1, gridSize);
  const col1 = getColFromIndex(index1, gridSize);
  const row2 = getRowFromIndex(index2, gridSize);
  const col2 = getColFromIndex(index2, gridSize);
  return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1;
}

export function canMoveTile(tileIndex, state) {
  return isAdjacent(tileIndex, state.emptyIndex, state.gridSize);
}

export function moveTile(tileIndex, state) {
  const copy = [...state.tiles];
  [copy[tileIndex], copy[state.emptyIndex]] = [copy[state.emptyIndex], copy[tileIndex]];
  state.tiles = copy;
  state.emptyIndex = tileIndex;
  state.moveCount++;
}

export function swapTiles(indexA, indexB, state) {
  const copy = [...state.tiles];
  [copy[indexA], copy[indexB]] = [copy[indexB], copy[indexA]];
  state.tiles = copy;
}

export function getMovableIndices(state) {
  return state.tiles.reduce((acc, _, i) => {
    if (i !== state.emptyIndex && isAdjacent(i, state.emptyIndex, state.gridSize)) {
      acc.push(i);
    }
    return acc;
  }, []);
}

export function performRandomMove(state) {
  const movable = getMovableIndices(state);
  const randIdx = movable[Math.floor(Math.random() * movable.length)];
  const copy = [...state.tiles];
  [copy[randIdx], copy[state.emptyIndex]] = [copy[state.emptyIndex], copy[randIdx]];
  state.tiles = copy;
  state.emptyIndex = randIdx;
}

export function shuffleTiles(state, moves = 200) {
  for (let i = 0; i < moves; i++) {
    performRandomMove(state);
  }
  // シャッフル直後に完成状態になってしまった場合は再シャッフル
  if (isSolved(state)) {
    shuffleTiles(state, moves);
  }
}

export function isSolved(state) {
  const total = state.gridSize * state.gridSize;
  return state.tiles.every((tile, index) => {
    if (index === total - 1) return tile === null;
    return tile === index;
  });
}
