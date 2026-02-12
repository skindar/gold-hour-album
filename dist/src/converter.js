// ============== CONVERTER ==============
const MAX_SIZE = 10 * 1024 * 1024;
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const progressEl = document.getElementById('progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const resultsEl = document.getElementById('results');
const downloadAllBtn = document.getElementById('download-all');

const converted = [];

// Upload area events
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files).filter(
    (f) => f.type.startsWith('image/') || isHeic(f)
  );
  if (files.length) processConverterFiles(files);
});

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  if (files.length) processConverterFiles(files);
  fileInput.value = '';
});

function isHeic(file) {
  const n = file.name.toLowerCase();
  return n.endsWith('.heic') || n.endsWith('.heif') ||
    file.type === 'image/heic' || file.type === 'image/heif';
}

async function heicToJpeg(file) {
  try {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width > 0 && bitmap.height > 0) {
      const c = document.createElement('canvas');
      c.width = bitmap.width;
      c.height = bitmap.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const sample = ctx.getImageData(0, 0, Math.min(c.width, 10), Math.min(c.height, 10)).data;
      if (sample.some((v) => v !== 0)) {
        return await new Promise((resolve, reject) => {
          c.toBlob((b) => b ? resolve(b) : reject(new Error('Canvas export failed')), 'image/jpeg', 0.95);
        });
      }
    }
  } catch { /* native not supported */ }

  // Fallback: heic-to library
  return HeicTo({ blob: file, type: 'image/jpeg', quality: 0.95 });
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(blob);
  });
}

function canvasToJpeg(img, w, h, quality) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    c.toBlob((b) => b ? resolve(b) : reject(new Error('JPEG export failed')), 'image/jpeg', quality);
  });
}

async function convertFile(file) {
  let blob = file;

  if (isHeic(file)) {
    blob = await heicToJpeg(file);
  }

  const img = await loadImage(blob);
  let { width, height } = img;

  let quality = 0.92;
  let jpegBlob = await canvasToJpeg(img, width, height, quality);

  while (jpegBlob.size > MAX_SIZE && quality > 0.5) {
    quality -= 0.1;
    jpegBlob = await canvasToJpeg(img, width, height, quality);
  }

  while (jpegBlob.size > MAX_SIZE && width > 800) {
    const scale = 0.8;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    jpegBlob = await canvasToJpeg(img, width, height, quality);
  }

  return {
    originalName: file.name,
    blob: jpegBlob
  };
}

async function processConverterFiles(files) {
  progressEl.classList.add('active');

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const pct = Math.round(((i) / files.length) * 100);
    progressFill.style.width = pct + '%';
    progressText.textContent = `Converting ${i + 1} / ${files.length}: ${file.name}`;

    try {
      const result = await convertFile(file);
      addConverterResult(result.originalName, result.blob);
    } catch (err) {
      addConverterError(file.name, err.message || 'Conversion failed');
    }
  }

  progressFill.style.width = '100%';
  progressText.textContent = `Done — ${files.length} file(s) processed`;
}

function addConverterResult(originalName, blob) {
  const url = URL.createObjectURL(blob);
  converted.push({ originalName, url, blob });

  const div = document.createElement('div');
  div.className = 'result-item';
  const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
  div.innerHTML = `
    <img src="${url}" alt="">
    <div class="result-info">
      <div class="result-name">${escapeHtml(originalName)}</div>
      <div class="result-size">${sizeMB} MB</div>
    </div>
    <a href="${url}" download="${escapeHtml(originalName.replace(/\.[^.]+$/, '.jpg'))}">Download</a>`;
  resultsEl.appendChild(div);
  downloadAllBtn.classList.add('visible');
}

function addConverterError(name, msg) {
  const div = document.createElement('div');
  div.className = 'result-item';
  div.style.borderLeftColor = '#d32f2f';
  div.innerHTML = `
    <div style="width:60px;height:60px;background:#f5f5f5;border-radius:4px;flex-shrink:0"></div>
    <div class="result-info">
      <div class="result-name">${escapeHtml(name)}</div>
      <div class="error">${escapeHtml(msg)}</div>
    </div>`;
  resultsEl.appendChild(div);
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

downloadAllBtn.addEventListener('click', () => {
  for (const { url, originalName } of converted) {
    const a = document.createElement('a');
    a.href = url;
    a.download = originalName.replace(/\.[^.]+$/, '.jpg');
    a.click();
  }
});

console.log('✨ Converter ready');
