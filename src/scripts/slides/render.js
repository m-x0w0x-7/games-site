import { getRowFromIndex, getColFromIndex } from './utils.js';

// tileElements[pieceValue] = DOM要素（pieceValueは正しい位置のインデックス）
let boardEl;
let tileElements = [];

export function initRenderer(el) {
  boardEl = el;
}

export function getTileSize(state) {
  const boardSize = boardEl.getBoundingClientRect().width;
  if (!boardSize) return 0;
  return boardSize / state.gridSize;
}

export function createTileElements(state) {
  boardEl.innerHTML = '';
  const total = state.gridSize * state.gridSize;
  tileElements = new Array(total).fill(null);

  // 通常タイル（total - 1 枚）
  for (let v = 0; v < total - 1; v++) {
    const el = document.createElement('div');
    el.className = 'slide-tile';
    el.dataset.pieceValue = String(v);
    boardEl.appendChild(el);
    tileElements[v] = el;
  }

  // 最後の1枚（クリア時に表示）
  const lastEl = document.createElement('div');
  lastEl.className = 'slide-tile slide-tile--last';
  lastEl.dataset.pieceValue = String(total - 1);
  lastEl.style.opacity = '0';
  lastEl.style.pointerEvents = 'none';
  boardEl.appendChild(lastEl);
  tileElements[total - 1] = lastEl;

  // 初期位置を即時セット（アニメーション無効化してから有効化）
  _positionAllImmediately(state);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      tileElements.forEach((el) => {
        if (el) el.style.transition = '';
      });
    });
  });
}

function _positionAllImmediately(state) {
  state.tiles.forEach((pieceValue, currentIndex) => {
    if (pieceValue === null) return;
    const el = tileElements[pieceValue];
    if (!el) return;
    el.style.transition = 'none';
    el.dataset.index = String(currentIndex);
    _setPosition(el, currentIndex, state);
    _setBackground(el, pieceValue, state);
  });
}

export function setTilePosition(el, index, state) {
  _setPosition(el, index, state);
}

function _setPosition(el, index, state) {
  const tileSize = getTileSize(state);
  if (!tileSize) return;
  const row = getRowFromIndex(index, state.gridSize);
  const col = getColFromIndex(index, state.gridSize);
  el.style.width = tileSize + 'px';
  el.style.height = tileSize + 'px';
  el.style.transform = `translate(${col * tileSize}px, ${row * tileSize}px)`;
}

export function setTileBackground(el, pieceValue, state) {
  _setBackground(el, pieceValue, state);
}

function _setBackground(el, pieceValue, state) {
  const tileSize = getTileSize(state);
  if (!tileSize) return;
  const boardSize = tileSize * state.gridSize;
  const row = getRowFromIndex(pieceValue, state.gridSize);
  const col = getColFromIndex(pieceValue, state.gridSize);

  el.style.backgroundImage = `url(${state.imageSrc})`;
  el.style.backgroundSize = `${boardSize}px ${boardSize}px`;
  el.style.backgroundPosition = `-${col * tileSize}px -${row * tileSize}px`;
}

export function updateTilePositions(state) {
  state.tiles.forEach((pieceValue, currentIndex) => {
    if (pieceValue === null) return;
    const el = tileElements[pieceValue];
    if (!el) return;
    el.dataset.index = String(currentIndex);
    _setPosition(el, currentIndex, state);
    _setBackground(el, pieceValue, state);
  });
}

export function renderBoard(state) {
  updateTilePositions(state);
}

export function renderClear(state) {
  const total = state.gridSize * state.gridSize;
  const lastEl = tileElements[total - 1];
  if (!lastEl) return;

  _setPosition(lastEl, state.emptyIndex, state);
  _setBackground(lastEl, total - 1, state);
  lastEl.style.transition = 'none';
  lastEl.style.opacity = '0';
  // 強制リフロー後にフェードイン
  void lastEl.offsetWidth;
  lastEl.style.transition = 'opacity 0.4s ease';
  lastEl.style.opacity = '1';
}

export function renderMessage(phase, msgEl) {
  const messages = {
    ready: 'スタートを押してください',
    playing: '',
    clear: 'クリア！',
  };
  msgEl.textContent = messages[phase] ?? '';
  msgEl.dataset.phase = phase;
}

export function renderMoveCount(state, el) {
  el.textContent = String(state.moveCount);
}
