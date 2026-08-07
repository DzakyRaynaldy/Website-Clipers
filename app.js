// === ClipCutter MVP ===

const $ = (sel) => document.querySelector(sel);
const uploadArea = $('#uploadArea');
const uploadBox = $('#uploadBox');
const fileInput = $('#fileInput');
const browseBtn = $('#browseBtn');
const editor = $('#editor');
const video = $('#videoPlayer');
const playBtn = $('#playBtn');
const seekBar = $('#seekBar');
const currentTimeEl = $('#currentTime');
const durationEl = $('#duration');
const waveformCanvas = $('#waveformCanvas');
const playhead = $('#playhead');
const trimStartHandle = $('#trimStart');
const trimEndHandle = $('#trimEnd');
const trimStartTime = $('#trimStartTime');
const trimEndTime = $('#trimEndTime');
const trimDuration = $('#trimDuration');
const trimStatus = $('#trimStatus');
const previewClipBtn = $('#previewClipBtn');
const setStartBtn = $('#setStartBtn');
const setEndBtn = $('#setEndBtn');
const resetBtn = $('#resetBtn');
const exportBtn = $('#exportBtn');
const exportModal = $('#exportModal');
const cancelExport = $('#cancelExport');
const startExport = $('#startExport');
const fullscreenBtn = $('#fullscreenBtn');
const progressFill = $('#progressFill');
const progressText = $('#progressText');
const exportProgress = $('#exportProgress');

// State
let audioCtx, waveformData = [];
let trimStartPct = 0, trimEndPct = 100;
let videoDuration = 0;
let isDragging = null; // 'start' | 'end' | null

// === Upload ===
browseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
uploadBox.addEventListener('click', () => fileInput.click());
uploadBox.addEventListener('dragover', (e) => { e.preventDefault(); uploadBox.classList.add('dragover'); });
uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('dragover'));
uploadBox.addEventListener('drop', (e) => {
    e.preventDefault(); uploadBox.classList.remove('dragover');
    if (e.dataTransfer.files.length) loadVideo(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => { if (fileInput.files.length) loadVideo(fileInput.files[0]); });

function loadVideo(file) {
    const url = URL.createObjectURL(file);
    video.src = url;
    video.load();
    video.addEventListener('loadedmetadata', () => {
        videoDuration = video.duration;
        durationEl.textContent = formatTime(videoDuration);
        uploadArea.classList.add('hidden');
        editor.classList.remove('hidden');
        extractWaveform(file);
    }, { once: true });
}

// === Waveform ===
async function extractWaveform(file) {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const channel = audioBuffer.getChannelData(0);
        const samples = 500;
        const blockSize = Math.floor(channel.length / samples);
        waveformData = [];
        for (let i = 0; i < samples; i++) {
            let sum = 0;
            const start = i * blockSize;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(channel[start + j]);
            }
            waveformData.push(sum / blockSize);
        }
        const max = Math.max(...waveformData);
        waveformData = waveformData.map(v => v / max);
        drawWaveform();
    } catch (e) {
        // Fallback: generate random waveform from video
        waveformData = Array.from({ length: 500 }, () => Math.random() * 0.8 + 0.2);
        drawWaveform();
    }
}

function drawWaveform() {
    const ctx = waveformCanvas.getContext('2d');
    const rect = waveformCanvas.parentElement.getBoundingClientRect();
    waveformCanvas.width = rect.width * 2;
    waveformCanvas.height = rect.height * 2;
    ctx.scale(2, 2);
    const w = rect.width, h = rect.height;
    const barW = w / waveformData.length;

    // Dark background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    ctx.fillRect(0, 0, w, h);

    // Bars
    waveformData.forEach((val, i) => {
        const x = i * barW;
        const barH = val * h * 0.8;
        const y = (h - barH) / 2;

        // Color: accent in trim region, muted outside
        const pct = (i / waveformData.length) * 100;
        if (pct >= trimStartPct && pct <= trimEndPct) {
            const grad = ctx.createLinearGradient(x, y, x, y + barH);
            grad.addColorStop(0, '#a855f7');
            grad.addColorStop(1, '#7c3aed');
            ctx.fillStyle = grad;
        } else {
            ctx.fillStyle = '#2a2a3e';
        }
        ctx.fillRect(x + 1, y, Math.max(barW - 2, 1), barH);
    });
}

// === Video Controls ===
playBtn.addEventListener('click', togglePlay);
fullscreenBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else video.requestFullscreen();
});

function togglePlay() {
    if (video.paused) { video.play(); playBtn.textContent = '⏸'; }
    else { video.pause(); playBtn.textContent = '▶'; }
}

video.addEventListener('timeupdate', () => {
    const pct = (video.currentTime / videoDuration) * 100;
    seekBar.value = pct;
    currentTimeEl.textContent = formatTime(video.currentTime);
    playhead.style.left = pct + '%';
});

seekBar.addEventListener('input', () => {
    video.currentTime = (seekBar.value / 100) * videoDuration;
});

// === Trim Handles ===
trimStartHandle.addEventListener('mousedown', () => { isDragging = 'start'; });
trimEndHandle.addEventListener('mousedown', () => { isDragging = 'end'; });

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = $('#waveformContainer').getBoundingClientRect();
    let pct = ((e.clientX - rect.left) / rect.width) * 100;
    pct = Math.max(0, Math.min(100, pct));

    if (isDragging === 'start') {
        trimStartPct = Math.min(pct, trimEndPct - 1);
        trimStartHandle.style.left = trimStartPct + '%';
        $('.trim-overlay-left').style.width = trimStartPct + '%';
    } else {
        trimEndPct = Math.max(pct, trimStartPct + 1);
        trimEndHandle.style.left = trimEndPct + '%';
        $('.trim-overlay-right').style.width = (100 - trimEndPct) + '%';
    }

    updateTrimInfo();
    drawWaveform();
});

document.addEventListener('mouseup', () => { isDragging = null; });

// Click on waveform to seek
$('#waveformContainer').addEventListener('click', (e) => {
    if (isDragging) return;
    const rect = $('#waveformContainer').getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * videoDuration;
});

// === Trim Info ===
function updateTrimInfo() {
    const startTime = (trimStartPct / 100) * videoDuration;
    const endTime = (trimEndPct / 100) * videoDuration;
    const dur = endTime - startTime;

    trimStartTime.textContent = formatTime(startTime);
    trimEndTime.textContent = formatTime(endTime);
    trimDuration.textContent = formatTime(dur);

    if (dur <= 15) { trimStatus.textContent = '👍 Shorts/TikTok'; trimStatus.style.color = '#22c55e'; }
    else if (dur <= 60) { trimStatus.textContent = '📱 Reels'; trimStatus.style.color = '#f59e0b'; }
    else { trimStatus.textContent = '🎬 Video Panjang'; trimStatus.style.color = '#ef4444'; }
}

// === Quick Actions ===
setStartBtn.addEventListener('click', () => {
    trimStartPct = (video.currentTime / videoDuration) * 100;
    trimStartHandle.style.left = trimStartPct + '%';
    $('.trim-overlay-left').style.width = trimStartPct + '%';
    updateTrimInfo(); drawWaveform();
});

setEndBtn.addEventListener('click', () => {
    trimEndPct = (video.currentTime / videoDuration) * 100;
    trimEndHandle.style.left = trimEndPct + '%';
    $('.trim-overlay-right').style.width = (100 - trimEndPct) + '%';
    updateTrimInfo(); drawWaveform();
});

resetBtn.addEventListener('click', () => {
    trimStartPct = 0; trimEndPct = 100;
    trimStartHandle.style.left = '0%';
    trimEndHandle.style.left = '100%';
    $('.trim-overlay-left').style.width = '0%';
    $('.trim-overlay-right').style.width = '0%';
    updateTrimInfo(); drawWaveform();
});

previewClipBtn.addEventListener('click', () => {
    video.currentTime = (trimStartPct / 100) * videoDuration;
    video.play(); playBtn.textContent = '⏸';
    const endTime = (trimEndPct / 100) * videoDuration;
    const check = setInterval(() => {
        if (video.currentTime >= endTime) { video.pause(); playBtn.textContent = '▶'; clearInterval(check); }
    }, 50);
});

// === Keyboard Shortcuts ===
document.addEventListener('keydown', (e) => {
    if (editor.classList.contains('hidden')) return;
    switch (e.key) {
        case ' ':
            e.preventDefault(); togglePlay(); break;
        case 'i': case 'I':
            setStartBtn.click(); break;
        case 'o': case 'O':
            setEndBtn.click(); break;
        case 'ArrowLeft':
            video.currentTime = Math.max(0, video.currentTime - 1); break;
        case 'ArrowRight':
            video.currentTime = Math.min(videoDuration, video.currentTime + 1); break;
        case 'j': case 'J':
            video.currentTime = Math.max(0, video.currentTime - 5); break;
        case 'l': case 'L':
            video.currentTime = Math.min(videoDuration, video.currentTime + 5); break;
    }
});

// === Export ===
exportBtn.addEventListener('click', () => exportModal.classList.remove('hidden'));
cancelExport.addEventListener('click', () => exportModal.classList.add('hidden'));

startExport.addEventListener('click', async () => {
    const format = $('#exportFormat').value;
    exportProgress.classList.remove('hidden');
    progressText.textContent = 'Merekam clip...';
    progressFill.style.width = '0%';

    const startTime = (trimStartPct / 100) * videoDuration;
    const endTime = (trimEndPct / 100) * videoDuration;
    const clipDuration = endTime - startTime;

    // Use MediaRecorder to capture the clip
    video.currentTime = startTime;
    await new Promise(r => video.addEventListener('seeked', r, { once: true }));

    const canvas = document.createElement('canvas');
    const res = $('#exportRes').value;
    let w = video.videoWidth, h = video.videoHeight;
    if (res !== 'original') {
        const targetH = parseInt(res);
        w = Math.round((targetH / h) * w);
        h = targetH;
    }
    // Ensure even dimensions (required for some codecs)
    w = w % 2 ? w + 1 : w;
    h = h % 2 ? h + 1 : h;
    canvas.width = w; canvas.height = h;

    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);

    // Add audio track if available
    try {
        if (video.captureStream) {
            const audioTracks = video.captureStream().getAudioTracks();
            if (audioTracks.length) stream.addTrack(audioTracks[0]);
        }
    } catch (e) { /* no audio track available */ }

    const mimeType = format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4;codecs=h264')
        ? 'video/mp4;codecs=h264'
        : 'video/webm;codecs=vp9';

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
    const chunks = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clip_${Date.now()}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        progressFill.style.width = '100%';
        progressText.textContent = '✅ Export selesai!';
        setTimeout(() => exportModal.classList.add('hidden'), 2000);
    };

    recorder.start();
    video.play();

    const updateProgress = () => {
        const elapsed = video.currentTime - startTime;
        const pct = Math.min((elapsed / clipDuration) * 100, 100);
        progressFill.style.width = pct + '%';
        progressText.textContent = `Merekam... ${Math.round(pct)}%`;

        if (video.currentTime >= endTime) {
            video.pause(); playBtn.textContent = '▶';
            recorder.stop();
            return;
        }
        requestAnimationFrame(updateProgress);
    };
    requestAnimationFrame(updateProgress);
});

// === Helpers ===
function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00.000';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

// Init trim display
updateTrimInfo();
