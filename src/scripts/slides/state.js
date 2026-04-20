export const Phase = {
  READY: 'ready',
  PLAYING: 'playing',
  CLEAR: 'clear',
};

export function createInitialState() {
  const gridSize = 3;
  const total = gridSize * gridSize;
  return {
    phase: Phase.READY,
    gridSize,
    tiles: [],
    emptyIndex: total - 1,
    moveCount: 0,
    isAnimating: false,
    isComplete: false,
    imageSrc: '',
  };
}
