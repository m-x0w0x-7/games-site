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
import { openCropper } from './cropper.js';

const state = createInitialState();

// プリセット画像リスト
const IMAGE_LIST = [
  '/assets/images/slides/img_01.jpg',
  '/assets/images/slides/img_02.jpg',
  '/assets/images/slides/img_03.jpg',
];

let appEl, boardEl, msgEl, moveEl, startBtnEl, retryBtnEl, reselectBtnEl, customImageBtnEl, imageFileInputEl;

// --- フェーズ管理 ---

function setPhase(phase) {
  state.phase = phase;
  appEl.dataset.phase = phase;
  renderMessage(phase, msgEl);
}

// --- 描画ヘルパー ---

function renderGameUI() {
  renderBoard(state);
  renderMoveCount(state, moveEl);
}

// --- 画像選択 ---

function handleImageSelect(index) {
  state.imageSrc = IMAGE_LIST[index];

  // 選択状態をピッカーに反映
  document.querySelectorAll('.picker-btn').forEach((btn, i) => {
    btn.classList.toggle('picker-btn--selected', i === index);
    btn.setAttribute('aria-pressed', String(i === index));
  });

  // ボードを先に表示してから描画（display:none のままだと getBoundingClientRect が 0 を返すため）
  setPhase(Phase.READY);

  initializePuzzle(state);
  createTileElements(state);
  renderGameUI();
}

// --- ゲームロジック ---

function checkGameComplete() {
  if (!isSolved(state)) return;
  state.isComplete = true;
  renderClear(state);
  setPhase(Phase.CLEAR);
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

function handleTileClick(index) {
  handleMove(index);
}

function startGame() {
  initializePuzzle(state);
  shuffleTiles(state);
  createTileElements(state);
  renderGameUI();
  setPhase(Phase.PLAYING);
}

// 同じ画像でもう一度
function handleRetry() {
  startGame();
}

// 画像を選び直す
function handleReselect() {
  setPhase(Phase.SELECTING);
}

// --- フリック操作 ---

function getFlickTargetIndex(dir) {
  const { emptyIndex, gridSize } = state;
  const emptyRow = getRowFromIndex(emptyIndex, gridSize);
  const emptyCol = getColFromIndex(emptyIndex, gridSize);

  const offset = {
    right: [0, -1],
    left:  [0,  1],
    down:  [-1, 0],
    up:    [1,  0],
  }[dir];

  if (!offset) return -1;

  const targetRow = emptyRow + offset[0];
  const targetCol = emptyCol + offset[1];

  if (targetRow < 0 || targetRow >= gridSize || targetCol < 0 || targetCol >= gridSize) return -1;
  return getIndexFromRowCol(targetRow, targetCol, gridSize);
}

// --- イベント ---

function setupEventListeners() {
  // プリセット画像ピッカー
  document.querySelectorAll('.picker-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index ?? '', 10);
      if (!Number.isNaN(index)) handleImageSelect(index);
    });
  });

  // カスタム画像ボタン → ファイル選択を起動
  customImageBtnEl.addEventListener('click', () => {
    imageFileInputEl.click();
  });

  // ファイル選択後 → クロッパーを開く
  imageFileInputEl.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    imageFileInputEl.value = ''; // 同じファイルを再選択できるようリセット
    if (!file) return;

    openCropper(
      file,
      (blobUrl) => {
        // カスタム画像を使う場合はプリセットの選択を解除
        document.querySelectorAll('.picker-btn').forEach((btn) => {
          btn.classList.remove('picker-btn--selected');
          btn.setAttribute('aria-pressed', 'false');
        });

        // 前のカスタム画像 URL を解放
        if (state.imageSrc.startsWith('blob:')) {
          URL.revokeObjectURL(state.imageSrc);
        }

        state.imageSrc = blobUrl;
        setPhase(Phase.READY);
        initializePuzzle(state);
        createTileElements(state);
        renderGameUI();
      },
    );
  });

  // スタートボタン
  startBtnEl.addEventListener('click', () => startGame());

  // クリア後ボタン
  retryBtnEl.addEventListener('click', handleRetry);
  reselectBtnEl.addEventListener('click', handleReselect);

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
  }, { passive: true });

  boardEl.addEventListener('touchend', (e) => {
    if (state.phase !== Phase.PLAYING) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));

    const MIN_SWIPE = 20;

    if (dist < MIN_SWIPE) {
      const tileEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.slide-tile');
      if (!tileEl || tileEl.classList.contains('slide-tile--last')) return;
      const index = parseInt(tileEl.dataset.index ?? '', 10);
      if (!Number.isNaN(index)) handleMove(index);
    } else {
      const dir = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');
      const targetIndex = getFlickTargetIndex(dir);
      if (targetIndex >= 0) handleMove(targetIndex);
    }

    e.preventDefault();
  }, { passive: false });
}

// --- 初期化 ---

export function init() {
  appEl = document.getElementById('slides-app');
  boardEl = document.getElementById('puzzle-board');
  msgEl = document.getElementById('message');
  moveEl = document.getElementById('move-count');
  startBtnEl       = document.getElementById('start-btn');
  retryBtnEl       = document.getElementById('retry-btn');
  reselectBtnEl    = document.getElementById('reselect-btn');
  customImageBtnEl = document.getElementById('custom-image-btn');
  imageFileInputEl = document.getElementById('image-file-input');

  initRenderer(boardEl);
  setupEventListeners();

  window.addEventListener('resize', () => {
    if (state.phase !== Phase.SELECTING) {
      renderBoard(state);
    }
  });
}
