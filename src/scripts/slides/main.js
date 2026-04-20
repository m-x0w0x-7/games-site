import { Phase, createInitialState } from './state.js';
import {
  initializePuzzle,
  shuffleTiles,
  canMoveTile,
  moveTile,
  isSolved,
} from './puzzle.js';
import { getRowFromIndex, getColFromIndex, getIndexFromRowCol } from './utils.js';
import {
  initRenderer,
  createTileElements,
  renderBoard,
  renderClear,
  renderMessage,
  renderMoveCount,
} from './render.js';

const state = createInitialState();

let boardEl, msgEl, moveEl, startBtnEl;

// --- 画像生成 ---

function generateSampleImage(size = 600) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // 夜空の背景
  const sky = ctx.createLinearGradient(0, 0, 0, size * 0.65);
  sky.addColorStop(0, '#06091a');
  sky.addColorStop(1, '#0b2545');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, size, size * 0.65);

  // 海
  const ocean = ctx.createLinearGradient(0, size * 0.65, 0, size);
  ocean.addColorStop(0, '#0b2545');
  ocean.addColorStop(1, '#020610');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, size * 0.65, size, size * 0.35);

  // 水平線の光
  ctx.fillStyle = 'rgba(75,137,163,0.12)';
  ctx.fillRect(0, size * 0.58, size, size * 0.1);

  // 星
  const stars = [
    [0.08, 0.06], [0.18, 0.12], [0.28, 0.04], [0.38, 0.09],
    [0.55, 0.05], [0.65, 0.13], [0.78, 0.07], [0.88, 0.03],
    [0.05, 0.20], [0.15, 0.28], [0.25, 0.18], [0.45, 0.22],
    [0.62, 0.17], [0.75, 0.25], [0.90, 0.19],
    [0.12, 0.35], [0.35, 0.32], [0.48, 0.38], [0.58, 0.30],
    [0.82, 0.36], [0.92, 0.30],
  ];
  stars.forEach(([rx, ry]) => {
    const r = Math.random() * 1.5 + 0.5;
    ctx.beginPath();
    ctx.arc(rx * size, ry * size, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(230,247,252,${0.6 + Math.random() * 0.4})`;
    ctx.fill();
  });

  // 月の光彩
  const moonX = size * 0.68;
  const moonY = size * 0.22;
  const moonR = size * 0.13;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.8, moonX, moonY, moonR * 2.5);
  moonGlow.addColorStop(0, 'rgba(205,192,156,0.25)');
  moonGlow.addColorStop(1, 'rgba(205,192,156,0)');
  ctx.fillStyle = moonGlow;
  ctx.fillRect(0, 0, size, size * 0.65);

  // 月本体
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fillStyle = '#e8dfc8';
  ctx.fill();

  // クレーター
  [
    [0.05, -0.05, 0.025],
    [-0.06, 0.04, 0.015],
    [0.02, 0.08, 0.020],
  ].forEach(([dx, dy, cr]) => {
    ctx.beginPath();
    ctx.arc(moonX + dx * size, moonY + dy * size, cr * size, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,140,120,0.25)';
    ctx.fill();
  });

  // 月の海面への反射
  const reflW = size * 0.07;
  for (let y = size * 0.65; y < size; y += 7) {
    const progress = (y - size * 0.65) / (size * 0.35);
    const alpha = 0.45 * (1 - progress * 0.7);
    const spread = 1 + progress * 3.5;
    ctx.fillStyle = `rgba(205,192,156,${alpha})`;
    ctx.fillRect(moonX - (reflW * spread) / 2, y, reflW * spread, 4);
  }

  // 山のシルエット
  ctx.fillStyle = '#08111f';
  ctx.beginPath();
  ctx.moveTo(0, size * 0.65);
  ctx.lineTo(size * 0.08, size * 0.52);
  ctx.lineTo(size * 0.18, size * 0.58);
  ctx.lineTo(size * 0.30, size * 0.44);
  ctx.lineTo(size * 0.40, size * 0.54);
  ctx.lineTo(size * 0.50, size * 0.47);
  ctx.lineTo(size * 0.60, size * 0.53);
  ctx.lineTo(size * 0.70, size * 0.62);
  ctx.lineTo(size * 0.80, size * 0.55);
  ctx.lineTo(size * 0.92, size * 0.63);
  ctx.lineTo(size, size * 0.65);
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL('image/jpeg', 0.95);
}

// --- 描画ヘルパー ---

function renderAll() {
  renderBoard(state);
  renderMessage(state.phase, msgEl);
  renderMoveCount(state, moveEl);
}

// --- ゲームロジック ---

function checkGameComplete() {
  if (!isSolved(state)) return;
  state.isComplete = true;
  state.phase = Phase.CLEAR;
  renderClear(state);
  renderMessage(state.phase, msgEl);
}

function handleAfterMove() {
  state.isAnimating = false;
  checkGameComplete();
}

function handleMove(tileIndex) {
  if (state.isAnimating) return;
  if (state.phase !== Phase.PLAYING) return;
  if (!canMoveTile(tileIndex, state)) return;

  state.isAnimating = true;
  moveTile(tileIndex, state);
  renderBoard(state);
  renderMoveCount(state, moveEl);

  setTimeout(handleAfterMove, 180);
}

export function handleTileClick(index) {
  handleMove(index);
}

function startGame() {
  initializePuzzle(state);
  shuffleTiles(state);
  state.phase = Phase.PLAYING;
  createTileElements(state);
  renderAll();
}

function handleStartClick() {
  startGame();
}

// --- イベント ---

function getFlickTargetIndex(dir) {
  const { emptyIndex, gridSize } = state;
  const emptyRow = getRowFromIndex(emptyIndex, gridSize);
  const emptyCol = getColFromIndex(emptyIndex, gridSize);

  // フリック方向にタイルが動く → 空きマスの逆側にあるタイルを移動
  const offset = {
    right: [0, -1],  // 右フリック → 空きの左のタイルが右へ
    left:  [0,  1],  // 左フリック → 空きの右のタイルが左へ
    down:  [-1, 0],  // 下フリック → 空きの上のタイルが下へ
    up:    [1,  0],  // 上フリック → 空きの下のタイルが上へ
  }[dir];

  if (!offset) return -1;

  const targetRow = emptyRow + offset[0];
  const targetCol = emptyCol + offset[1];

  if (targetRow < 0 || targetRow >= gridSize || targetCol < 0 || targetCol >= gridSize) return -1;
  return getIndexFromRowCol(targetRow, targetCol, gridSize);
}

function setupEventListeners() {
  startBtnEl.addEventListener('click', handleStartClick);

  // マウスクリック（デスクトップ用）
  boardEl.addEventListener('click', (e) => {
    const tileEl = e.target.closest('.slide-tile');
    if (!tileEl || tileEl.classList.contains('slide-tile--last')) return;
    const index = parseInt(tileEl.dataset.index ?? '', 10);
    if (!Number.isNaN(index)) handleTileClick(index);
  });

  // タッチ操作（タップ・フリック共用）
  let touchStartX = 0;
  let touchStartY = 0;

  boardEl.addEventListener('touchstart', (e) => {
    if (state.phase !== Phase.PLAYING) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    // preventDefault するとクリックイベントが発火しなくなるため、ここでは呼ばない
  }, { passive: true });

  boardEl.addEventListener('touchend', (e) => {
    if (state.phase !== Phase.PLAYING) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));

    const MIN_SWIPE = 20;

    if (dist < MIN_SWIPE) {
      // タップ：タッチした座標の要素を取得して移動
      const tileEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.slide-tile');
      if (!tileEl || tileEl.classList.contains('slide-tile--last')) return;
      const index = parseInt(tileEl.dataset.index ?? '', 10);
      if (!Number.isNaN(index)) handleMove(index);
    } else {
      // フリック：スワイプ方向から移動対象タイルを決定
      const dir = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');
      const targetIndex = getFlickTargetIndex(dir);
      if (targetIndex >= 0) handleMove(targetIndex);
    }

    // フリック後にclickイベントが二重発火するのを防ぐ
    e.preventDefault();
  }, { passive: false });
}

// --- 初期化 ---

export function init() {
  boardEl = document.getElementById('puzzle-board');
  msgEl = document.getElementById('message');
  moveEl = document.getElementById('move-count');
  startBtnEl = document.getElementById('start-btn');

  state.imageSrc = generateSampleImage();

  initRenderer(boardEl);
  initializePuzzle(state);
  createTileElements(state);
  renderAll();

  setupEventListeners();

  window.addEventListener('resize', () => {
    if (state.phase !== Phase.READY) {
      renderBoard(state);
    }
  });
}
