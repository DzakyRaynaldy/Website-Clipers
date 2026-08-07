// ===== UniversalClip — app.js =====
(function () {
    'use strict';

    // ===== THEME TOGGLE =====
    var themeBtn = document.getElementById('themeBtn');
    var savedTheme = localStorage.getItem('uc-theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light');
        themeBtn.textContent = '☀️';
    }
    themeBtn.addEventListener('click', function () {
        document.body.classList.toggle('light');
        var isLight = document.body.classList.contains('light');
        themeBtn.textContent = isLight ? '☀️' : '🌙';
        localStorage.setItem('uc-theme', isLight ? 'light' : 'dark');
    });

    // ===== TAB NAV =====
    var tabs = document.querySelectorAll('.tab');
    var pages = document.querySelectorAll('.page');
    tabs.forEach(function (t) {
        t.addEventListener('click', function () {
            switchToTab(t.dataset.t);
        });
    });
    function switchToTab(name) {
        tabs.forEach(function (x) { x.classList.toggle('active', x.dataset.t === name); });
        pages.forEach(function (x) { x.classList.remove('active'); });
        document.getElementById('pg-' + name).classList.add('active');
    }

    // ===== HOME BUTTONS =====
    document.getElementById('goClip').addEventListener('click', function () { switchToTab('clip'); });
    document.getElementById('goRiset').addEventListener('click', function () { switchToTab('riset'); });

    // ===== STATE =====
    var videoUrl = '', vidId = '', title = '', duration = 0;
    var clips = [], filteredClips = [], commentTS = [];
    var selectedClip = null, ytPlayer = null, ytReady = false, phRAF = null;
    var stepNames = ['📥 Download', '🔍 Analisis', '💬 Komentar', '🏷️ Subtitle'];

    window.onYouTubeIframeAPIReady = function () { ytReady = true; };
    if (typeof window._ytReady !== 'undefined') window._ytReady.then(function () { ytReady = true; });

    // ===== CLIP =====
    document.getElementById('clipGo').addEventListener('click', doAnalyze);
    document.getElementById('clipUrl').addEventListener('keydown', function (e) { if (e.key === 'Enter') doAnalyze(); });
    document.getElementById('clipBack').addEventListener('click', function () {
        if (ytPlayer) { ytPlayer.destroy(); ytPlayer = null; }
        if (phRAF) cancelAnimationFrame(phRAF);
        hide('clipEdit'); show('clipLand');
    });
    document.getElementById('btnPlay').addEventListener('click', togglePlay);
    document.getElementById('btnB5').addEventListener('click', function () { seekRel(-5); });
    document.getElementById('btnF5').addEventListener('click', function () { seekRel(5); });
    document.getElementById('seek').addEventListener('input', onSeek);
    document.getElementById('btnPre').addEventListener('click', previewClip);
    document.getElementById('btnDl').addEventListener('click', downloadClip);
    document.getElementById('filterSel').addEventListener('change', function () { applyFilter(this.value); });

    // ===== ANALYZE =====
    async function doAnalyze() {
        var url = document.getElementById('clipUrl').value.trim();
        if (!url) { toast('Paste link YouTube dulu!'); return; }
        hide('clipLand'); show('clipLoad');

        try {
            setStep(1, 'Download audio...', 10);
            var dl = await api('/api/download-audio', { url: url });
            if (dl.error) throw new Error(dl.error);
            vidId = dl.vid_id; title = dl.title || 'Video'; videoUrl = url; duration = dl.duration || 0;

            setStep(2, 'Scan momen epic...', 35);
            var an = await api('/api/analyze', { filename: dl.filename });
            if (an.error) throw new Error(an.error);
            clips = an.clips || []; duration = an.duration || duration;

            setStep(3, 'Ambil komentar...', 60);
            try { var cm = await api('/api/comments', { vid_id: vidId }); commentTS = cm.timestamps || []; } catch (e) { commentTS = []; }
            annotateComments();

            setStep(4, 'Ambil subtitle...', 80);
            try { var sub = await api('/api/subtitles', { vid_id: vidId, clips: clips }); if (sub.clips) clips = sub.clips; } catch (e) {}

            setStep(4, 'Selesai!', 100);
            filteredClips = clips.slice();
            applyFilter('intensity');
            buildEditor(an.waveform || []);

            setTimeout(function () { hide('clipLoad'); show('clipEdit'); toast(clips.length + ' momen terdeteksi!'); }, 400);
        } catch (err) {
            toast('Error: ' + err.message); hide('clipLoad'); show('clipLand');
        }
    }

    function annotateComments() {
        clips.forEach(function (c) {
            var sc = 0;
            commentTS.forEach(function (ts) { if (ts.time >= c.start - 10 && ts.time <= c.end + 10) sc += ts.score; });
            c.commentScore = Math.round(sc);
        });
    }

    function applyFilter(m) {
        if (m === 'comments') filteredClips = clips.slice().sort(function (a, b) { return (b.commentScore || 0) - (a.commentScore || 0); });
        else if (m === 'duration') filteredClips = clips.slice().sort(function (a, b) { return a.duration - b.duration; });
        else if (m === 'lucu') filteredClips = clips.slice().sort(function (a, b) { return (b.lucu_score || 0) - (a.lucu_score || 0); });
        else if (m === 'kaget') filteredClips = clips.slice().sort(function (a, b) { return (b.kaget_score || 0) - (a.kaget_score || 0); });
        else filteredClips = clips.slice().sort(function (a, b) { return b.intensity - a.intensity; });
        renderClipList();
    }

    // ===== BUILD EDITOR =====
    function buildEditor(wf) {
        document.getElementById('vidTitle').textContent = title.substring(0, 30);
        document.getElementById('clipCount').textContent = filteredClips.length;
        document.getElementById('timeEnd').textContent = fmt(duration);
        renderTimeline(wf); resetDetail(); initPlayer();
    }

    function initPlayer() {
        if (!ytReady || !vidId) return;
        if (ytPlayer) ytPlayer.destroy();
        ytPlayer = new YT.Player('ytPlayer', {
            height: '100%', width: '100%', videoId: vidId,
            playerVars: { autoplay: 0, rel: 0, modestbranding: 1 },
            events: {
                onReady: function () { duration = ytPlayer.getDuration() || duration; document.getElementById('timeEnd').textContent = fmt(duration); startPH(); },
                onStateChange: function (e) { document.getElementById('btnPlay').textContent = e.data === YT.PlayerState.PLAYING ? '⏸' : '▶'; }
            }
        });
    }

    function startPH() {
        if (phRAF) cancelAnimationFrame(phRAF);
        (function tick() {
            if (!ytPlayer || !ytPlayer.getCurrentTime) { phRAF = requestAnimationFrame(tick); return; }
            var t = ytPlayer.getCurrentTime(), dur = ytPlayer.getDuration() || duration;
            document.getElementById('timeNow').textContent = fmt(t);
            document.getElementById('seek').value = dur ? (t / dur) * 1000 : 0;
            var ph = document.getElementById('tlph');
            if (ph) ph.style.left = (dur ? (t / dur) * 100 : 0) + '%';
            phRAF = requestAnimationFrame(tick);
        })();
    }

    function renderClipList() {
        var list = document.getElementById('clipList');
        list.innerHTML = '';
        document.getElementById('clipCount').textContent = filteredClips.length;
        filteredClips.forEach(function (c) {
            var d = document.createElement('div'); d.className = 'cli'; d.dataset.id = c.id;
            var tc = c.label === 'Shorts/TikTok' ? 'ts' : c.label === 'Reels' ? 'tr' : 'tv';
            var kw = c.keyword || '';
            var cm = c.commentScore ? ' <span style="color:var(--accent);font-size:10px">💬' + c.commentScore + '</span>' : '';
                        var kaget = c.tag_kaget ? ' <span style="color:#ef4444;font-size:10px;font-weight:700">😱 KAGET</span>' : '';
                        var lucuBadge = c.lucu_score > 5 ? ' <span style="color:#22c55e;font-size:10px">😂' + c.lucu_score + '</span>' : '';
            d.innerHTML = '<span class="cn">#' + c.id + '</span><div class="ci"><div class="cn2">' + (kw || 'Momen #' + c.id) + cm + '</div><div class="ct">' + fmt(c.start) + ' → ' + fmt(c.end) + ' (' + c.duration.toFixed(1) + 's)</div></div><span class="tag ' + tc + '">' + c.label + '</span>';
            d.addEventListener('click', function () { selectClip(c); });
            list.appendChild(d);
        });
    }

    function renderTimeline(wf) {
        var tl = document.getElementById('timeline');
        tl.innerHTML = '<div class="tlph" id="tlph"></div>';
        if (!duration) return;
        clips.forEach(function (c) {
            var el = document.createElement('div'); el.className = 'tlc'; el.dataset.id = c.id;
            el.style.left = ((c.start / duration) * 100) + '%'; el.style.width = Math.max((c.duration / duration) * 100, 0.3) + '%';
            el.style.background = c.commentScore > 5 ? 'var(--green)' : 'var(--accent)';
            el.textContent = '#' + c.id;
            el.addEventListener('click', function () { selectClip(c); });
            tl.appendChild(el);
        });
        if (wf.length) {
            var cv = document.createElement('canvas');
            cv.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;opacity:.15';
            tl.appendChild(cv);
            requestAnimationFrame(function () {
                cv.width = tl.clientWidth; cv.height = tl.clientHeight;
                var ctx = cv.getContext('2d'), w = cv.width, h = cv.height, bw = w / wf.length;
                ctx.fillStyle = '#7c3aed';
                wf.forEach(function (v, i) { var bh = Math.max(v * h * .8, 1); ctx.fillRect(i * bw, (h - bh) / 2, Math.max(bw - 1, 1), bh); });
            });
        }
    }

    function selectClip(c) {
        selectedClip = c;
        document.querySelectorAll('.cli').forEach(function (el) { el.classList.toggle('active', +el.dataset.id === c.id); });
        document.querySelectorAll('.tlc').forEach(function (el) { el.classList.toggle('active', +el.dataset.id === c.id); });
        document.getElementById('dS').textContent = fmt(c.start);
        document.getElementById('dE').textContent = fmt(c.end);
        document.getElementById('dD').textContent = c.duration.toFixed(1) + 's';
        document.getElementById('dP').textContent = c.label;
        document.getElementById('dI').textContent = Math.round(c.intensity * 100) + '%';
        document.getElementById('dK').textContent = c.keyword || '—';
        document.getElementById('dC').textContent = c.commentScore ? '💬 ' + c.commentScore : '—';
        document.getElementById('dT').textContent = c.transcript || '—';
        if (ytPlayer && ytPlayer.seekTo) { ytPlayer.seekTo(c.start, true); ytPlayer.playVideo(); }
    }

    function resetDetail() { selectedClip = null; ['dS', 'dE', 'dD', 'dP', 'dI', 'dK', 'dC', 'dT'].forEach(function (id) { document.getElementById(id).textContent = '—'; }); }

    function togglePlay() { if (!ytPlayer) return; ytPlayer.getPlayerState() === YT.PlayerState.PLAYING ? ytPlayer.pauseVideo() : ytPlayer.playVideo(); }
    function seekRel(s) { if (ytPlayer) ytPlayer.seekTo(ytPlayer.getCurrentTime() + s, true); }
    function onSeek() { if (ytPlayer) ytPlayer.seekTo((document.getElementById('seek').value / 1000) * (ytPlayer.getDuration() || duration), true); }
    function previewClip() { if (!selectedClip || !ytPlayer) return; ytPlayer.seekTo(selectedClip.start, true); ytPlayer.playVideo(); }
    async function downloadClip() {
        if (!selectedClip) { toast('Pilih clip dulu!'); return; }
        if (!vidId) { toast('Analisis video dulu!'); return; }
        var btn = document.getElementById('btnDl');
        btn.textContent = '⏳ Downloading...';
        btn.disabled = true;
        try {
            var d = await api('/api/download-video-segment', { url: videoUrl, vid_id: vidId, start: selectedClip.start, end: selectedClip.end });
            if (d.error) throw new Error(d.error);
            // Trigger download via hidden iframe
            var iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = d.download_url;
            document.body.appendChild(iframe);
            setTimeout(function () { document.body.removeChild(iframe); }, 30000);
            toast('✅ Download started! Cek folder Downloads browser');
        } catch (e) { toast('❌ Error: ' + e.message); }
        finally { btn.textContent = '⬇ Download Clip'; btn.disabled = false; }
    }

    // ===== CAPCUT TIMELINE EDITOR =====
    var tlState = { start: 0, end: 0, dragging: null };
    function initTimeline() {
        tlState.start = 0; tlState.end = duration;
        updateTLRange();
    }
    function updateTLRange() {
        var track = document.getElementById('tlTrack');
        var range = document.getElementById('tlRange');
        var hL = document.getElementById('tlHandleL');
        var hR = document.getElementById('tlHandleR');
        if (!track || !duration) return;
        var w = track.offsetWidth;
        var lPct = (tlState.start / duration) * 100;
        var rPct = (tlState.end / duration) * 100;
        range.style.left = lPct + '%';
        range.style.width = (rPct - lPct) + '%';
        hL.style.left = 'calc(' + lPct + '% - 8px)';
        hR.style.left = 'calc(' + rPct + '% - 8px)';
        document.getElementById('tlStartLabel').textContent = fmt(tlState.start);
        document.getElementById('tlEndLabel').textContent = fmt(tlState.end);
        document.getElementById('tlDurLabel').textContent = 'Durasi: ' + Math.round(tlState.end - tlState.start) + 's';
    }
    function tlSetStart(t) { tlState.start = Math.max(0, Math.min(t, tlState.end - 1)); updateTLRange(); }
    function tlSetEnd(t) { tlState.end = Math.min(duration, Math.max(t, tlState.start + 1)); updateTLRange(); }
    // Drag handles
    function handleDrag(e, which) {
        e.preventDefault(); e.stopPropagation();
        tlState.dragging = which;
        var track = document.getElementById('tlTrack');
        function onMove(ev) {
            var rect = track.getBoundingClientRect();
            var x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
            var pct = Math.max(0, Math.min(1, x / rect.width));
            var t = pct * duration;
            if (which === 'left') tlSetStart(t); else tlSetEnd(t);
        }
        function onUp() { tlState.dragging = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp); }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove);
        document.addEventListener('touchend', onUp);
    }
    document.getElementById('tlHandleL').addEventListener('mousedown', function (e) { handleDrag(e, 'left'); });
    document.getElementById('tlHandleL').addEventListener('touchstart', function (e) { handleDrag(e, 'left'); });
    document.getElementById('tlHandleR').addEventListener('mousedown', function (e) { handleDrag(e, 'right'); });
    document.getElementById('tlHandleR').addEventListener('touchstart', function (e) { handleDrag(e, 'right'); });
    // Click on track to set playhead + drag range
    document.getElementById('tlTrack').addEventListener('click', function (e) {
        if (tlState.dragging) return;
        var rect = this.getBoundingClientRect();
        var pct = (e.clientX - rect.left) / rect.width;
        var t = pct * duration;
        if (ytPlayer) { ytPlayer.seekTo(t, true); }
    });
    // Update playhead position every frame
    function updatePlayhead() {
        if (!ytPlayer || !ytPlayer.getCurrentTime) { requestAnimationFrame(updatePlayhead); return; }
        var t = ytPlayer.getCurrentTime();
        var pct = (t / duration) * 100;
        var ph = document.getElementById('tlPlayhead');
        if (ph) ph.style.left = pct + '%';
        requestAnimationFrame(updatePlayhead);
    }
    requestAnimationFrame(updatePlayhead);
    // Set Start / End buttons
    document.getElementById('btnSetStart').addEventListener('click', function () {
        if (!ytPlayer || !ytPlayer.getCurrentTime) return;
        tlSetStart(ytPlayer.getCurrentTime());
        toast('[ Start: ' + fmt(tlState.start));
    });
    document.getElementById('btnSetEnd').addEventListener('click', function () {
        if (!ytPlayer || !ytPlayer.getCurrentTime) return;
        tlSetEnd(ytPlayer.getCurrentTime());
        toast('] End: ' + fmt(tlState.end));
    });
    // Reset range
    document.getElementById('btnResetRange').addEventListener('click', function () { tlState.start = 0; tlState.end = duration; updateTLRange(); toast('Range reset'); });
    // Download manual clip
    document.getElementById('btnManualDl').addEventListener('click', async function () {
        if (!vidId) { toast('Analisis video dulu!'); return; }
        toast('⏳ Download clip (' + Math.round(tlState.end - tlState.start) + 's)...');
        try {
            var d = await api('/api/download-video-segment', { url: videoUrl, vid_id: vidId, start: tlState.start, end: tlState.end });
            if (d.error) throw new Error(d.error);
            var iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = d.download_url;
            document.body.appendChild(iframe);
            setTimeout(function () { document.body.removeChild(iframe); }, 30000);
            toast('✅ Clip downloaded!');
        } catch (err) { toast('❌ Error: ' + err.message); }
    });

    // ===== RISET KONTEN =====
    document.getElementById('btnRiset').addEventListener('click', doRiset);
    async function doRiset() {
        var cat = document.getElementById('catSelect').value;
        var audience = document.getElementById('audSelect').value;
        var jumlah = parseInt(document.getElementById('jumSelect').value);
        var ide = document.getElementById('ideInput').value.trim();

        hide('risetResult'); show('risetLoad');
        document.getElementById('risetText').textContent = '🔍 Mencari trending ' + cat + '...';

        try {
            var tr = await api('/api/trending', { category: cat });
            if (tr.error) throw new Error(tr.error);
            document.getElementById('risetText').textContent = '💡 Generate saran...';
            var sar = await api('/api/saran-konten', { category: cat, videos: tr.videos, audience: audience, jumlah: jumlah, ide_spesifik: ide });
            renderRiset(tr, sar);
            hide('risetLoad');
        } catch (e) {
            toast('Error: ' + e.message); hide('risetLoad');
        }
    }

    function renderRiset(tr, sar) {
        document.getElementById('resTitle').textContent = (tr.icon || '') + ' ' + (tr.label || '') + ' — Trending';
        var kwp = document.getElementById('resKw'); kwp.innerHTML = '';
        (sar.top_keywords || []).forEach(function (kw) { var s = document.createElement('span'); s.className = 'kpill'; s.textContent = kw; kwp.appendChild(s); });

        var list = document.getElementById('saranList'); list.innerHTML = '';
        (sar.suggestions || []).forEach(function (idea, i) {
            var card = document.createElement('div'); card.className = 'saran-card';
            var fmt = idea.format || 'normal';
            var fmtBadge = fmt === 'short'
                ? '<span class="stag fmt-short">📱 Short (15-60s)</span>'
                : '<span class="stag fmt-normal">🎬 Normal (Video Panjang)</span>';
            var tags = (idea.hashtags || '').split(' ').map(function (t) { return '<span class="stag">' + t + '</span>'; }).join('');
            card.innerHTML =
                '<div class="saran-num">#' + (i + 1) + '</div>' +
                '<div class="saran-hook">' + idea.hook_title + '</div>' +
                '<div class="saran-row"><span class="saran-label">🔑 Keyword</span><span class="saran-val">' + idea.keywords + '</span></div>' +
                '<div class="saran-row"><span class="saran-label">📝 Deskripsi</span><span class="saran-val">' + idea.description + '</span></div>' +
                '<div class="saran-row"><span class="saran-label">🎬 Sumber</span><span class="saran-val">' + (idea.source_videos || []).join(', ') + '</span></div>' +
                '<div class="saran-tags">' + fmtBadge + tags + '</div>';
            list.appendChild(card);
        });
        show('risetResult');
    }

    // ===== HELPERS =====
    function setStep(n, text, pct) {
        document.getElementById('loadText').textContent = text;
        document.getElementById('barFill').style.width = pct + '%';
        document.getElementById('barPct').textContent = pct + '%';
        var pills = document.getElementById('stepsPills'); pills.innerHTML = '';
        stepNames.forEach(function (name, i) {
            var s = document.createElement('span'); s.className = 'pill';
            if (i + 1 < n) s.classList.add('done'); else if (i + 1 === n) s.classList.add('active');
            s.textContent = name; pills.appendChild(s);
        });
    }

    async function api(url, body) {
        var res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        return await res.json();
    }
    function show(id) { document.getElementById(id).classList.remove('hidden'); }
    function hide(id) { document.getElementById(id).classList.add('hidden'); }
    function fmt(s) { if (isNaN(s) || s < 0) return '0:00'; var m = Math.floor(s / 60), sc = Math.floor(s % 60); return m + ':' + (sc < 10 ? '0' : '') + sc; }
    var tt;
    function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('show'); }, 3500); }
})();
