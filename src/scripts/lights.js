const SIZE = 5;

let board = [];
let initialBoard = [];
let moves = 0;
let isCleared = false;

function $(sel) {
  return document.querySelector(sel);
}

function createAllLitBoard() {
  return Array(SIZE * SIZE).fill(true);
}

function getNeighbors(index) {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  const targets = [index];
  if (row > 0) targets.push(index - SIZE);
  if (row < SIZE - 1) targets.push(index + SIZE);
  if (col > 0) targets.push(index - 1);
  if (col < SIZE - 1) targets.push(index + 1);
  return targets;
}

function flipCells(targetBoard, index) {
  getNeighbors(index).forEach((i) => {
    targetBoard[i] = !targetBoard[i];
  });
}

function generateBoard() {
  let b;
  do {
    b = createAllLitBoard();
    const count = 10 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      flipCells(b, Math.floor(Math.random() * SIZE * SIZE));
    }
  } while (b.every((cell) => cell));
  return b;
}

function renderBoard() {
  const boardEl = $('.js-lights-board');
  boardEl.innerHTML = '';
  board.forEach((isLit, index) => {
    const btn = document.createElement('button');
    btn.className = 'lights_cell' + (isLit ? ' is-on' : '');
    btn.addEventListener('click', () => handleCellClick(index));
    boardEl.appendChild(btn);
  });
}

function updateMoves() {
  $('.js-lights-moves').textContent = moves;
}

function handleCellClick(index) {
  if (isCleared) return;
  flipCells(board, index);
  moves++;
  updateMoves();
  renderBoard();
  if (board.every((cell) => cell)) {
    isCleared = true;
    $('.js-lights-clear').classList.add('is-visible');
  }
}

function reset() {
  board = [...initialBoard];
  moves = 0;
  isCleared = false;
  updateMoves();
  renderBoard();
  $('.js-lights-clear').classList.remove('is-visible');
}

function init() {
  const generated = generateBoard();
  board = [...generated];
  initialBoard = [...generated];
  moves = 0;
  isCleared = false;
  updateMoves();
  renderBoard();
  $('.js-lights-reset').addEventListener('click', reset);
}

init();
