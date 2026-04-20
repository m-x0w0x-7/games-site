/** クロッパーの出力解像度 */
const OUTPUT_SIZE = 900;
/** フレームの最小辺長（px） */
const MIN_SIZE = 60;

/**
 * 画像クロップモーダルを開く
 * @param {File}     file       選択された画像ファイル
 * @param {Function} onConfirm  確定時コールバック (blobUrl: string) => void
 * @param {Function} [onCancel] キャンセル時コールバック () => void
 */
export function openCropper(file, onConfirm, onCancel) {
  const objectUrl = URL.createObjectURL(file);

  // --- DOM 構築 ---
  const overlay = document.createElement('div');
  overlay.className = 'cropper-overlay';
  overlay.innerHTML = `
    <div class="cropper-modal">
      <p class="cropper-hint">ドラッグで位置・コーナーでサイズを調整</p>
      <div class="cropper-viewport">
        <img class="cropper-image" src="${objectUrl}" alt="" draggable="false" />
        <div class="cropper-shade" data-side="top"></div>
        <div class="cropper-shade" data-side="bottom"></div>
        <div class="cropper-shade" data-side="left"></div>
        <div class="cropper-shade" data-side="right"></div>
        <div class="cropper-frame">
          <div class="cropper-handle" data-corner="tl"></div>
          <div class="cropper-handle" data-corner="tr"></div>
          <div class="cropper-handle" data-corner="bl"></div>
          <div class="cropper-handle" data-corner="br"></div>
        </div>
      </div>
      <div class="cropper-actions">
        <button class="cropper-btn cropper-btn--cancel"  type="button">キャンセル</button>
        <button class="cropper-btn cropper-btn--confirm" type="button">確定</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const imgEl   = overlay.querySelector('.cropper-image');
  const frameEl = overlay.querySelector('.cropper-frame');
  const vpEl    = overlay.querySelector('.cropper-viewport');
  const shade   = {
    top:    overlay.querySelector('[data-side="top"]'),
    bottom: overlay.querySelector('[data-side="bottom"]'),
    left:   overlay.querySelector('[data-side="left"]'),
    right:  overlay.querySelector('[data-side="right"]'),
  };

  // --- フレーム状態（ビューポート座標系・px） ---
  let fx = 0, fy = 0, fs = 0;
  // 画像の表示領域（ビューポート内の actual 描画サイズ・オフセット）
  let imgX = 0, imgY = 0, imgW = 0, imgH = 0;
  // ドラッグ中の状態
  let drag = null;

  // --- 初期フレーム計算 ---
  function initFrame() {
    const vr = vpEl.getBoundingClientRect();
    const vW = vr.width;
    const vH = vr.height;
    const nW = imgEl.naturalWidth;
    const nH = imgEl.naturalHeight;

    const scale = Math.min(vW / nW, vH / nH);
    imgW = nW * scale;
    imgH = nH * scale;
    imgX = (vW - imgW) / 2;
    imgY = (vH - imgH) / 2;

    // 短辺の 85% を初期フレームサイズに
    fs = Math.min(imgW, imgH) * 0.85;
    fx = imgX + (imgW - fs) / 2;
    fy = imgY + (imgH - fs) / 2;

    render();
  }

  imgEl.addEventListener('load', initFrame);
  // すでにキャッシュ済みの場合に対応
  if (imgEl.complete && imgEl.naturalWidth > 0) initFrame();
  imgEl.addEventListener('error', () => { cleanup(); onCancel?.(); });

  // --- 描画 ---
  function clampFrame() {
    fs = Math.max(MIN_SIZE, Math.min(fs, imgW, imgH));
    fx = Math.max(imgX, Math.min(fx, imgX + imgW - fs));
    fy = Math.max(imgY, Math.min(fy, imgY + imgH - fs));
  }

  function render() {
    clampFrame();

    frameEl.style.left   = `${fx}px`;
    frameEl.style.top    = `${fy}px`;
    frameEl.style.width  = `${fs}px`;
    frameEl.style.height = `${fs}px`;

    const fr = fx + fs;
    const fb = fy + fs;
    shade.top.style.cssText    = `top:0;left:0;right:0;height:${fy}px`;
    shade.bottom.style.cssText = `top:${fb}px;left:0;right:0;bottom:0`;
    shade.left.style.cssText   = `top:${fy}px;left:0;width:${fx}px;height:${fs}px`;
    shade.right.style.cssText  = `top:${fy}px;left:${fr}px;right:0;height:${fs}px`;
  }

  // --- Pointer イベント ---
  function getPos(e) {
    const r = vpEl.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e) {
    if (e.button > 0) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const corner = e.target.dataset.corner;
    drag = corner
      ? { type: 'resize', corner, sx: x, sy: y, sfx: fx, sfy: fy, sfs: fs }
      : { type: 'move',           sx: x, sy: y, sfx: fx, sfy: fy };
  }

  function onMove(e) {
    if (!drag) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const dx = x - drag.sx;
    const dy = y - drag.sy;

    if (drag.type === 'move') {
      fx = drag.sfx + dx;
      fy = drag.sfy + dy;
    } else {
      // コーナーごとに「外方向」のデルタを計算
      let delta;
      switch (drag.corner) {
        case 'br': delta =  (dx + dy) / 2; break;
        case 'tl': delta = -(dx + dy) / 2; break;
        case 'tr': delta =  (dx - dy) / 2; break;
        case 'bl': delta = (-dx + dy) / 2; break;
        default:   delta = 0;
      }

      const next = Math.max(MIN_SIZE, Math.min(drag.sfs + delta, imgW, imgH));
      const diff = next - drag.sfs;

      fs = next;
      // 固定コーナーの逆側を動かす
      fx = (drag.corner === 'tl' || drag.corner === 'bl') ? drag.sfx - diff : drag.sfx;
      fy = (drag.corner === 'tl' || drag.corner === 'tr') ? drag.sfy - diff : drag.sfy;
    }

    render();
  }

  function onUp() { drag = null; }

  frameEl.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove',  onMove);
  window.addEventListener('pointerup',    onUp);

  // --- 確定 ---
  overlay.querySelector('.cropper-btn--confirm').addEventListener('click', () => {
    const vr    = vpEl.getBoundingClientRect();
    const scale = Math.min(vr.width / imgEl.naturalWidth, vr.height / imgEl.naturalHeight);
    const ox    = (vr.width  - imgEl.naturalWidth  * scale) / 2;
    const oy    = (vr.height - imgEl.naturalHeight * scale) / 2;

    // ビューポート座標 → 元画像座標へ変換
    const srcX = (fx - ox) / scale;
    const srcY = (fy - oy) / scale;
    const srcS = fs / scale;

    const canvas = document.createElement('canvas');
    canvas.width  = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    canvas.getContext('2d').drawImage(imgEl, srcX, srcY, srcS, srcS, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      cleanup();
      onConfirm(blobUrl);
    }, 'image/jpeg', 0.92);
  });

  // --- キャンセル ---
  overlay.querySelector('.cropper-btn--cancel').addEventListener('click', () => {
    cleanup();
    onCancel?.();
  });

  // --- クリーンアップ ---
  function cleanup() {
    frameEl.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointermove',  onMove);
    window.removeEventListener('pointerup',    onUp);
    overlay.remove();
    URL.revokeObjectURL(objectUrl);
  }
}
