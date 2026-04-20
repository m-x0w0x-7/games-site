import { TILE_COLORS } from '../lib/colors.js';

const N = 4;
let board, score, best, prev, prevScore, won, isAnimating;
let nextTileId = 1;
const tileElements = new Map(); // id → HTMLElement

function $(id) {
  return document.getElementById(id);
}

function buildGrid() {
  const g = $('grid');
  g.innerHTML = '';
  for (let i = 0; i < N * N; i++) {
    const d = document.createElement('div');
    d.className = 'cell';
    g.appendChild(d);
  }
}

function cellSize() {
  return $('grid').children[0].getBoundingClientRect().width;
}

function tilePos(r, c) {
  const cs = cellSize();
  const gap = 10;
  return { left: c * (cs + gap), top: r * (cs + gap), size: cs };
}

function applyTileStyle(el, tile, r, c, cls = 'tile') {
  const { left, top, size } = tilePos(r, c);
  el.className = cls;
  el.style.width = size + 'px';
  el.style.height = size + 'px';
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  const cfg = TILE_COLORS[tile.value] || { bg: '#e8c200', fg: '#0f0f14', fs: 18 };
  el.style.background = cfg.bg;
  el.style.color = cfg.fg;
  el.style.fontSize = cfg.fs + 'px';
  el.textContent = tile.value;
}

// アニメーションなしで全タイルを再描画（新ゲーム・undo・リサイズ時）
function render(newPos = [], mergedIds = new Set()) {
  const layer = $('tiles');
  layer.innerHTML = '';
  tileElements.clear();

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const tile = board[r][c];
      if (!tile.id) continue;

      const el = document.createElement('div');
      const isNew = newPos.some((p) => p[0] === r && p[1] === c);
      const isMerged = mergedIds.has(tile.id);
      const cls = isMerged ? 'tile merged' : isNew ? 'tile new' : 'tile';
      applyTileStyle(el, tile, r, c, cls);

      layer.appendChild(el);
      tileElements.set(tile.id, el);
    }
  }
}

function slideWithTracking(row) {
  const items = row.map((t, i) => ({ id: t.id, value: t.value, origIdx: i })).filter((t) => t.id !== 0);
  const resultItems = [];
  const moves = [];
  let scoreGain = 0;
  const mergedIds = new Set();
  let i = 0;
  while (i < items.length) {
    const cur = items[i];
    const toIdx = resultItems.length;
    if (i + 1 < items.length && cur.value === items[i + 1].value) {
      const next = items[i + 1];
      const newVal = cur.value * 2;
      scoreGain += newVal;
      resultItems.push({ id: cur.id, value: newVal });
      mergedIds.add(cur.id);
      moves.push({ id: cur.id, from: cur.origIdx, to: toIdx });
      moves.push({ id: next.id, from: next.origIdx, to: toIdx });
      i += 2;
    } else {
      resultItems.push({ id: cur.id, value: cur.value });
      moves.push({ id: cur.id, from: cur.origIdx, to: toIdx });
      i++;
    }
  }
  while (resultItems.length < N) resultItems.push({ id: 0, value: 0 });
  return { arr: resultItems, moves, scoreGain, mergedIds };
}

// 移動アニメーション: タイル要素を新位置へ動かす（CSSトランジション発動）
function animateMove(allMoves) {
  for (const { id, toR, toC } of allMoves) {
    const el = tileElements.get(id);
    if (!el) continue;
    const { left, top } = tilePos(toR, toC);
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }
}

function updateScore() {
  const el = $('score');
  el.textContent = score;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 200);
  if (score > best) {
    best = score;
    localStorage.setItem('2048b', best);
    $('best').textContent = best;
  }
}

function addTile() {
  const empties = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!board[r][c].id) empties.push([r, c]);
  if (!empties.length) return null;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  board[r][c] = { id: nextTileId++, value: Math.random() < 0.9 ? 2 : 4 };
  return [r, c];
}

function move(dir) {
  if (won || isAnimating) return;
  const old = board.map((r) => r.map((t) => ({ ...t })));
  const oldScore = score;
  const allMoves = []; // {id, toR, toC}
  const mergedIds = new Set();

  for (let i = 0; i < N; i++) {
    let row, positions;
    if (dir === 'left') {
      row = [...board[i]];
      positions = Array.from({ length: N }, (_, c) => [i, c]);
    } else if (dir === 'right') {
      row = [...board[i]].reverse();
      positions = Array.from({ length: N }, (_, c) => [i, N - 1 - c]);
    } else if (dir === 'up') {
      row = board.map((r) => r[i]);
      positions = Array.from({ length: N }, (_, r) => [r, i]);
    } else {
      row = board.map((r) => r[i]).reverse();
      positions = Array.from({ length: N }, (_, r) => [N - 1 - r, i]);
    }

    const { arr, moves, scoreGain, mergedIds: rowMergedIds } = slideWithTracking(row);
    score += scoreGain;
    rowMergedIds.forEach((id) => mergedIds.add(id));

    moves.forEach((m) => {
      const [toR, toC] = positions[m.to];
      allMoves.push({ id: m.id, toR, toC });
    });

    arr.forEach((tile, k) => {
      const [r, c] = positions[k];
      board[r][c] = tile;
    });
  }

  const moved = board.some((row, r) => row.some((t, c) => t.id !== old[r][c].id));
  if (!moved) {
    score = oldScore;
    return;
  }

  prev = old;
  prevScore = oldScore;
  isAnimating = true;

  animateMove(allMoves);

  setTimeout(() => {
    const newCell = addTile();
    updateScore();
    render(newCell ? [newCell] : [], mergedIds);
    isAnimating = false;

    if (board.some((r) => r.some((t) => t.value === 2048)) && !won) {
      won = true;
      showOverlay('You Win!', 'Keep Going', () => {
        won = false;
        hideOverlay();
      });
      return;
    }
    if (!canMove()) {
      showOverlay('Game Over', 'Try Again', newGame);
    }
  }, 110);
}

function canMove() {
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      if (!board[r][c].id) return true;
      if (c < N - 1 && board[r][c].value === board[r][c + 1].value) return true;
      if (r < N - 1 && board[r][c].value === board[r + 1][c].value) return true;
    }
  return false;
}

function showOverlay(title, btnLabel, action) {
  $('ov-title').textContent = title;
  $('ov-sub').textContent = 'Score: ' + score;
  const btn = $('ov-btn');
  btn.textContent = btnLabel;
  btn.onclick = action;
  $('overlay').classList.add('on');
}

function hideOverlay() {
  $('overlay').classList.remove('on');
}

function newGame() {
  board = Array.from({ length: N }, () => Array.from({ length: N }, () => ({ id: 0, value: 0 })));
  score = 0;
  prev = null;
  prevScore = 0;
  won = false;
  isAnimating = false;
  hideOverlay();
  addTile();
  addTile();
  render();
  updateScore();
  $('score').textContent = '0';
}

function undo() {
  if (!prev) return;
  board = prev.map((r) => r.map((t) => ({ ...t })));
  score = prevScore;
  prev = null;
  $('score').textContent = score;
  render();
}

// ボタンへのイベントリスナー
$('btn-new-game').addEventListener('click', newGame);
$('btn-undo').addEventListener('click', undo);

// Touch
let tx, ty;
const game = document.querySelector('.game');
game.addEventListener(
  'touchstart',
  (e) => {
    if (e.target.closest('#overlay')) return;
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
    e.preventDefault();
  },
  { passive: false },
);
game.addEventListener(
  'touchend',
  (e) => {
    if (e.target.closest('#overlay')) return;
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
    e.preventDefault();
  },
  { passive: false },
);

// Keyboard
document.addEventListener('keydown', (e) => {
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  if (map[e.key]) {
    e.preventDefault();
    move(map[e.key]);
  }
});

// Init
best = parseInt(localStorage.getItem('2048b') || '0');
$('best').textContent = best;
buildGrid();
newGame();
window.addEventListener('resize', () => render());

// background
const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');

let particles = [];
const particleCount = 30;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

class Particle {
  constructor() {
    this.init();
  }

  init() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 3 + 1;
    this.speed = Math.random() * 0.08 + 0.05;
    this.opacity = Math.random() * 0.4;
    this.blur = Math.random() * 4;
  }

  update() {
    this.y -= this.speed;
    if (this.y < -10) this.init();
    this.x += Math.sin(this.y / 30) * 0.3;
    this.y -= this.speed * (this.size / 2);
  }

  draw() {
    ctx.save();
    ctx.filter = `blur(${this.blur}px)`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    if (this.index % 10 === 0) {
      ctx.fillStyle = `rgb(235 225 197 / ${this.opacity})`;
    } else {
      ctx.fillStyle = `rgb(164 226 241 / ${this.opacity})`;
    }
    ctx.fill();
    ctx.restore();
  }
}

for (let i = 0; i < particleCount; i++) {
  particles.push(new Particle());
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p) => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animate);
}

animate();
