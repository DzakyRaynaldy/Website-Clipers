"""
UniversalClip Backend
All free: yt-dlp + ffmpeg + YouTube IFrame API
"""
import os, json, subprocess, re, math, struct
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='build-uc-ui/dist', static_url_path='/')
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"]}})

DOWNLOADS = Path(__file__).parent / 'downloads'
DOWNLOADS.mkdir(exist_ok=True)

# ========== Categories Config (Naratif AI Focused) ==========
CATEGORIES = {
    'fakta_game': {'label': 'Fakta Unik Game', 'icon': '🎮', 'queries': ['fakta rahasia video game', 'easter eggs game', 'fakta unik karakter game']},
    'lore_karakter': {'label': 'Lore Karakter', 'icon': '👤', 'queries': ['lore karakter anime', 'masa lalu karakter game', 'sejarah karakter ikonik']},
    'misteri': {'label': 'Misteri & Teori', 'icon': '🕵️', 'queries': ['teori konspirasi game', 'misteri yang belum terpecahkan', 'creepypasta viral']},
    'horror': {'label': 'Kisah Horror', 'icon': '👻', 'queries': ['kisah horror nyata', 'cerita hantu viral', 'tempat paling angker']},
    'sejarah': {'label': 'Sejarah Unik', 'icon': '📜', 'queries': ['fakta sejarah yang jarang diketahui', 'peristiwa aneh di masa lalu', 'tokoh sejarah misterius']},
    'lucu': {'label': 'Fakta Lucu', 'icon': '😂', 'queries': ['fakta random lucu', 'kejadian unik menghibur', 'fakta hewan aneh']},
}

# ========== Download Audio ==========
@app.route('/api/download-audio', methods=['POST'])
def download_audio():
    url = request.json.get('url', '')
    if not url:
        return jsonify({'error': 'URL kosong'}), 400
    try:
        import yt_dlp
        with yt_dlp.YoutubeDL({'quiet': True, 'no_warnings': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            vid_id = info.get('id', 'video')
        for f in DOWNLOADS.glob(f'{vid_id}_audio.*'):
            return jsonify({'filename': f.name, 'vid_id': vid_id, 'title': info.get('title', ''), 'duration': info.get('duration', 0)})
        outtmpl = str(DOWNLOADS / f'{vid_id}_audio.%(ext)s')
        ydl_opts = {'format': 'bestaudio/best', 'outtmpl': outtmpl, 'quiet': True, 'no_warnings': True, 'noplaylist': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        for ext in ['m4a', 'webm', 'opus', 'mp3']:
            p = DOWNLOADS / f'{vid_id}_audio.{ext}'
            if p.exists():
                return jsonify({'filename': p.name, 'vid_id': vid_id, 'title': info.get('title', ''), 'duration': info.get('duration', 0)})
        return jsonify({'error': 'Gagal download'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== Subtitles ==========
def _whisper_transcript(vid_id):
    """Transkripsi lokal via faster-whisper (fallback saat YouTube caption kosong)."""
    cache = DOWNLOADS / f'{vid_id}_whisper.json'
    if cache.exists():
        return json.loads(cache.read_text(encoding='utf-8'))
    audio = None
    for ext in ['webm', 'm4a', 'opus', 'mp3']:
        p = DOWNLOADS / f'{vid_id}_audio.{ext}'
        if p.exists():
            audio = p
            break
    if audio is None:
        return []
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel('base', device='cpu', compute_type='int8')
        segments, _ = model.transcribe(str(audio), language='id', vad_filter=True, beam_size=1)
        out = [{'start': round(s.start, 2), 'text': s.text.strip()} for s in segments if s.text.strip()]
        cache.write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
        return out
    except Exception:
        return []

def _keyword_from(subs, cs, ce, max_words=6):
    words = ' '.join(s['text'] for s in subs if cs - 2 <= s['start'] <= ce + 2).split()
    unique = []
    for w in words:
        if not unique or unique[-1].lower() != w.lower():
            unique.append(w)
    return ' '.join(unique[:max_words])

@app.route('/api/subtitles', methods=['POST'])
def get_subtitles():
    data = request.json
    vid_id = data.get('vid_id', '')
    clips = data.get('clips', [])
    if not vid_id or not clips:
        return jsonify({'clips': clips})
    url = f'https://www.youtube.com/watch?v={vid_id}'
    sub_file = DOWNLOADS / f'{vid_id}_subs.json'
    if not sub_file.exists():
        sub_data = []
        try:
            import yt_dlp
            for lang in ['id', 'en', 'id-orig']:
                ydl_opts = {'skip_download': True, 'writesubtitles': True, 'writeautomaticsub': True, 'subtitleslangs': [lang], 'subtitlesformat': 'json3', 'outtmpl': str(DOWNLOADS / f'{vid_id}_sub'), 'quiet': True, 'no_warnings': True}
                try:
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        ydl.download([url])
                    for f in DOWNLOADS.glob(f'{vid_id}_sub*.{lang}.*'):
                        with open(f, 'r', encoding='utf-8') as fh:
                            raw = json.load(fh)
                        if 'events' in raw:
                            for ev in raw['events']:
                                if 'segs' in ev:
                                    text = ''.join(s.get('utf8', '') for s in ev['segs']).strip()
                                    if text:
                                        sub_data.append({'start': round(ev.get('tStartMs', 0) / 1000, 2), 'text': text})
                    if sub_data:
                        break
                except Exception:
                    continue
            with open(sub_file, 'w', encoding='utf-8') as fh:
                json.dump(sub_data, fh)
        except Exception:
            with open(sub_file, 'w') as fh:
                json.dump([], fh)
    with open(sub_file, 'r', encoding='utf-8') as fh:
        sub_data = json.load(fh)
    # Fallback: transkripsi lokal kalau YouTube caption gak nyambung di range clip
    whisper = None
    for clip in clips:
        cs, ce = clip.get('start', 0), clip.get('end', 0)
        kw = _keyword_from(sub_data, cs, ce)
        if not kw and whisper is None:
            whisper = _whisper_transcript(vid_id)
        if not kw and whisper:
            kw = _keyword_from(whisper, cs, ce)
        clip['keyword'] = kw
        clip['transcript'] = _keyword_from(whisper or sub_data, cs, ce, 20)
    return jsonify({'clips': clips})

# ========== Comment Timestamps ==========
@app.route('/api/comments', methods=['POST'])
def get_comments():
    vid_id = request.json.get('vid_id', '')
    if not vid_id:
        return jsonify({'timestamps': [], 'comments': []})
    cache = DOWNLOADS / f'{vid_id}_comments.json'
    if cache.exists():
        data = json.loads(cache.read_text(encoding='utf-8'))
        if 'comments' in data:
            return jsonify(data)
        # cache format lama — fetch ulang dengan komentar asli
    try:
        import yt_dlp
        ydl_opts = {'skip_download': True, 'getcomments': True, 'quiet': True, 'no_warnings': True,
                    'extractor_args': {'youtube': {'comment_sort': ['top']}}}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f'https://www.youtube.com/watch?v={vid_id}', download=False)
        duration = info.get('duration', 0) or 0
        comments = info.get('comments', [])
        ts_pattern = re.compile(r'(?:(\d{1,2}):)?(\d{1,2}):(\d{2})')
        ts_counts = {}
        comment_items = []
        for c in comments:
            text = c.get('text', '')
            likes = c.get('like_count', 0) or 0
            author = c.get('author', 'viewer')
            for m in ts_pattern.finditer(text):
                total = int(m.group(1) or 0) * 3600 + int(m.group(2)) * 60 + int(m.group(3))
                if duration and total > duration:
                    continue
                bucket = round(total / 5) * 5
                ts_counts[bucket] = ts_counts.get(bucket, 0) + 1 + likes * 0.5
                comment_items.append({'time': total, 'text': text[:200], 'likes': likes, 'author': author})
        # dedup (time + awal teks), urut likes desc, max 50
        seen = set()
        unique_items = []
        for ci in sorted(comment_items, key=lambda x: -x['likes']):
            k = (ci['time'], ci['text'][:60])
            if k in seen:
                continue
            seen.add(k)
            unique_items.append(ci)
            if len(unique_items) >= 50:
                break
        sorted_ts = sorted(ts_counts.items(), key=lambda x: x[1], reverse=True)[:30]
        result = {'timestamps': [{'time': t, 'score': round(sc, 1)} for t, sc in sorted_ts],
                  'comments': unique_items, 'total_comments': len(comments)}
        cache.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
        return jsonify(result)
    except Exception as e:
        return jsonify({'timestamps': [], 'comments': [], 'error': str(e)})

# ========== Audio Analysis ==========
@app.route('/api/analyze', methods=['POST'])
def analyze_audio():
    filename = request.json.get('filename', '')
    if not filename:
        return jsonify({'error': 'Filename kosong'}), 400
    filepath = DOWNLOADS / filename
    if not filepath.exists():
        return jsonify({'error': 'File tidak ditemukan'}), 404
    try:
        probe = subprocess.run(['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'json', str(filepath)], capture_output=True, text=True, timeout=30)
        duration = float(json.loads(probe.stdout).get('format', {}).get('duration', 0))
        cmd = ['ffmpeg', '-i', str(filepath), '-ac', '1', '-ar', '8000', '-f', 's16le', '-']
        result = subprocess.run(cmd, capture_output=True, timeout=180)
        if result.returncode != 0 or not result.stdout:
            return jsonify({'waveform': [], 'duration': duration, 'clips': []})
        raw = result.stdout
        total = len(raw) // 2
        window = 8000
        levels = []
        for i in range(0, total - window, window):
            chunk = struct.unpack(f'{window}h', raw[i*2:(i+window)*2])
            rms = math.sqrt(sum(s*s for s in chunk) / window)
            levels.append(20 * math.log10(rms / 32768 + 1e-10))
        if not levels:
            return jsonify({'waveform': [], 'duration': duration, 'clips': []})
        min_l, max_l = min(levels), max(levels)
        rng = max_l - min_l if max_l != min_l else 1
        norm = [max(0, (l - min_l) / rng) for l in levels]
        samples = 500
        if len(norm) > samples:
            block = len(norm) // samples
            waveform = [sum(norm[i*block:(i+1)*block])/block for i in range(samples)]
        else:
            waveform = norm
        mean = sum(waveform) / len(waveform)
        std = math.sqrt(sum((x - mean)**2 for x in waveform) / len(waveform))
        clips = []
        in_peak = False
        peak_start = peak_max = 0
        for i, val in enumerate(waveform):
            t = (i / len(waveform)) * duration
            # Dynamic threshold: lower if video is quiet
            threshold = max(0.2, mean + std * 0.6)
            if val > threshold and not in_peak:
                in_peak = True; peak_start = t; peak_max = val
            elif in_peak:
                peak_max = max(peak_max, val)
                if val <= threshold or i == len(waveform) - 1:
                    in_peak = False
                    if t - peak_start >= 1.5:
                        s, e = max(0, peak_start - 1), min(duration, t + 1)
                        clips.append({'start': round(s, 2), 'end': round(e, 2), 'duration': round(e - s, 2), 'intensity': round(peak_max, 3)})
        merged = []
        for clip in clips:
            if merged and clip['start'] <= merged[-1]['end'] + 2:
                merged[-1]['end'] = clip['end']
                merged[-1]['duration'] = round(merged[-1]['end'] - merged[-1]['start'], 2)
                merged[-1]['intensity'] = max(merged[-1]['intensity'], clip['intensity'])
            else:
                merged.append(clip)
        # Detect kaget (sudden spike): rate of change in volume
        # Compare peak intensity vs area before it
        for clip in merged:
            # Find the waveform index range for this clip
            clip_start_idx = max(0, int((clip['start'] / duration) * len(waveform)) - 3)
            clip_end_idx = min(len(waveform), int((clip['end'] / duration) * len(waveform)) + 1)
            # Average before the clip (quiet area)
            before_start = max(0, clip_start_idx - 5)
            before_avg = sum(waveform[before_start:clip_start_idx]) / max(1, clip_start_idx - before_start) if clip_start_idx > before_start else 0
            # Spike = difference between peak and before
            spike = clip['intensity'] - before_avg
            clip['kaget_score'] = round(max(0, spike * 10), 2)  # 0-10 scale
            # Lucu score = combination of intensity + spike + duration sweet spot (5-20s is funniest)
            dur_bonus = 1.0 if 5 <= clip['duration'] <= 20 else 0.7
            clip['lucu_score'] = round((clip['intensity'] * 0.4 + spike * 0.4 + dur_bonus * 0.2) * 10, 2)
            # Tag kaget if spike is high
            if clip['kaget_score'] >= 4:
                clip['tag_kaget'] = True
        merged.sort(key=lambda c: c['intensity'], reverse=True)
        for i, c in enumerate(merged):
            c['id'] = i + 1
            c['label'] = 'Shorts/TikTok' if c['duration'] <= 15 else ('Reels' if c['duration'] <= 60 else 'Video')
        return jsonify({'waveform': [round(x, 3) for x in waveform], 'duration': round(duration, 2), 'clips': merged[:20]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== Download Video Segment ==========
@app.route('/api/download-video-segment', methods=['POST'])
def download_video_segment():
    data = request.json
    url, vid_id, start, end = data.get('url', ''), data.get('vid_id', ''), data.get('start', 0), data.get('end', 0)
    if not url:
        return jsonify({'error': 'URL kosong'}), 400
    try:
        import yt_dlp
        out_name = f'clip_{vid_id}_{int(start)}_{int(end)}.mp4'
        out_path = DOWNLOADS / out_name
        if out_path.exists():
            return jsonify({'filename': out_name, 'download_url': f'/api/download-file/{out_name}'})
        outtmpl = str(DOWNLOADS / f'clip_{vid_id}_{int(start)}_{int(end)}.%(ext)s')
        ydl_opts = {'format': 'bestvideo[height<=1080]+bestaudio/best', 'outtmpl': outtmpl, 'quiet': True, 'no_warnings': True, 'merge_output_format': 'mp4', 'noplaylist': True, 'download_ranges': yt_dlp.utils.download_range_func(None, [[start, end]]), 'force_keyframes_at_cuts': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        for f in DOWNLOADS.glob(f'clip_{vid_id}_{int(start)}_{int(end)}.*'):
            if f.suffix in ['.mp4', '.mkv', '.webm']:
                if f.suffix != '.mp4':
                    subprocess.run(['ffmpeg', '-y', '-i', str(f), '-c', 'copy', str(out_path)], capture_output=True, timeout=120)
                    f.unlink(missing_ok=True)
                else:
                    out_path = f
                return jsonify({'filename': out_path.name, 'download_url': f'/api/download-file/{out_path.name}'})
        return jsonify({'error': 'Gagal export'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== Trending by Category ==========
@app.route('/api/trending', methods=['POST'])
def trending():
    """Search YouTube by category, return top viewed videos."""
    cat = request.json.get('category', '')
    if cat not in CATEGORIES:
        return jsonify({'error': 'Kategori tidak valid'}), 400

    cache = DOWNLOADS / f'trending_{cat}.json'
    if cache.exists():
        age = os.path.getmtime(cache)
        import time
        if time.time() - age < 3600:  # cache 1 hour
            with open(cache, 'r') as f:
                return jsonify(json.load(f))

    try:
        import yt_dlp
        cat_info = CATEGORIES[cat]
        results = []
        for q in cat_info['queries'][:2]:  # limit queries
            ydl_opts = {
                'quiet': True, 'no_warnings': True, 'noplaylist': True,
                'extract_flat': True, 'force_generic_extractor': False,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                search_url = f'ytsearch10:{q}'
                info = ydl.extract_info(search_url, download=False)
                entries = info.get('entries', [])
                for e in entries:
                    if e and e.get('id'):
                        vid_id = e.get('id', '')
                        results.append({
                            'id': vid_id,
                            'title': e.get('title', ''),
                            'url': f'https://youtube.com/watch?v={vid_id}',
                            'channel': e.get('channel', '') or e.get('uploader', ''),
                            'duration': e.get('duration') or 0,
                            'view_count': e.get('view_count') or 0,
                        })

        # Dedupe by id, sort by views
        seen = set()
        unique = []
        for r in results:
            if r['id'] not in seen:
                seen.add(r['id'])
                unique.append(r)
        unique.sort(key=lambda x: x['view_count'], reverse=True)
        unique = unique[:20]

        result_data = {'category': cat, 'label': cat_info['label'], 'icon': cat_info['icon'], 'videos': unique}
        with open(cache, 'w') as f:
            json.dump(result_data, f)
        return jsonify(result_data)
    except Exception as e:
        return jsonify({'error': str(e), 'videos': []})

# ========== Saran Konten (LLM-powered) ==========
LLM_BASE = 'http://localhost:20128/v1'
LLM_KEY = 'GANTI_DENGAN_ENV_VARIABLE'
LLM_MODEL = 'Combo_Mantap'

@app.route('/api/saran-konten', methods=['POST'])
def saran_konten():
    """Generate content suggestions via LLM."""
    data = request.json
    cat = data.get('category', '')
    if cat not in CATEGORIES:
        return jsonify({'error': 'Kategori tidak valid'}), 400

    cat_info = CATEGORIES[cat]
    videos = data.get('videos', [])[:10]
    audience = data.get('audience', 'indonesia')
    jumlah = data.get('jumlah', 5)
    ide_spesifik = data.get('ide_spesifik', '')

    # Analyze keywords from titles
    words = {}
    stop = {'yang', 'dan', 'ini', 'itu', 'di', 'ke', 'dari', 'untuk', 'dengan', 'ya', 'the', 'a', 'is', 'aja', 'dong', 'nih', 'sih', 'deh', 'gak', 'enggak', 'nggak', 'bukan', 'ada', 'dalam', 'oleh', 'pada', 'juga', 'akan', 'tidak', 'adalah', 'sudah', 'semua', 'tapi', 'karena', 'kalau', 'cara', 'apa', 'bagaimana', 'kenapa', 'kapan'}
    for v in videos:
        title = v.get('title', '').lower()
        for w in re.findall(r'\b\w+\b', title):
            if len(w) > 2 and w not in stop:
                words[w] = words.get(w, 0) + 1
    top_words = sorted(words.items(), key=lambda x: x[1], reverse=True)[:10]
    top_kw = [w for w, _ in top_words]

    video_titles = '\n'.join(f"- {v.get('title', '')} ({v.get('view_count', 0):,} views)" for v in videos[:8])

    extra = f"\nIde spesifik user: {ide_spesifik}" if ide_spesifik else ""
    prompt = f"""Kamu adalah content creator YouTube expert. Buat {jumlah} ide konten UNIK dan BERBEDA satu sama lain.

Kategori: {cat_info['label']} {cat_info['icon']}
Target: {audience}
Trending keywords: {', '.join(top_kw[:8])}
{extra}

Video trending:
{video_titles}

Output JSON array MURNI:
[
  {{
    "hook_title": "judul unik yang bikin penasaran (pakai emoji, JANGAN sama dengan yang lain)",
    "keywords": "keyword1 keyword2 keyword3",
    "description": "deskripsi konten 1-2 kalimat yang menjelaskan isi video",
    "hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5",
    "source_videos": ["sumber 1", "sumber 2"],
    "format": "short"
  }}
]

Field "format" = "short" (TikTok/Reels, 15-60 detik) ATAU "normal" (video panjang).

Rules:
- Bahasa Indonesia, casual, viral
- Setiap judul HARUS BERBEDA, jangan copy paste
- Judul harus hook — bikin orang klik
- Campurkan: 50% short + 50% normal
- Deskripsi harus jelas isi kontennya apa, bukan template
- Output JSON array MURNI, tanpa markdown, tanpa explanation"""

    suggestions = []
    try:
        import requests as req
        resp = req.post(f'{LLM_BASE}/chat/completions', json={
            'model': LLM_MODEL,
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.8,
            'max_tokens': 2000,
            'stream': False
        }, headers={'Authorization': f'Bearer {LLM_KEY}', 'Content-Type': 'application/json'}, timeout=60)
        # Handle SSE: strip trailing data: lines
        body = resp.text.strip()
        if body.startswith('{'):
            # Find end of JSON object (handle SSE trailing data)
            depth = 0
            end_idx = 0
            for i, ch in enumerate(body):
                if ch == '{': depth += 1
                elif ch == '}': depth -= 1
                if depth == 0 and i > 0:
                    end_idx = i + 1
                    break
            body = body[:end_idx]
        import json as _json
        llm_resp = _json.loads(body)
        content = llm_resp['choices'][0]['message']['content']
        # Extract JSON from response
        json_match = re.search(r'\[[\s\S]*\]', content)
        if json_match:
            suggestions = _json.loads(json_match.group())
            for i, s in enumerate(suggestions):
                s['id'] = i + 1
    except Exception as e:
        # Fallback to simple templates
        for i in range(min(jumlah, 6)):
            kw = top_kw[:3]
            kw_str = ' '.join(kw)
            suggestions.append({
                'id': i + 1,
                'hook_title': f'{cat_info["icon"]} {kw[0].title() if kw else cat_info["label"]} — Yang Wajib Kamu Tonton!',
                'keywords': kw_str or cat_info['label'],
                'description': f'Video {cat_info["label"].lower()} tentang {kw_str}. Tonton sampai habis!',
                'hashtags': f'#{cat} #trending #{kw_str.replace(" ", "")} #viral #shorts',
                'source_videos': [v['title'][:40] for v in videos[i:i+2]],
            })

    return jsonify({'suggestions': suggestions, 'top_keywords': top_kw[:8], 'category': cat_info['label']})

# ========== Static ==========
@app.route('/api/download-file/<filename>')
def serve_file(filename):
    filepath = os.path.join(str(DOWNLOADS), filename)
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    with open(filepath, 'rb') as f:
        data = f.read()
    resp = app.make_response(data)
    resp.headers['Content-Type'] = 'video/mp4'
    resp.headers['Content-Disposition'] = f'attachment; filename={filename}'
    resp.headers['Content-Length'] = len(data)
    return resp

@app.route('/')
def index():
    return send_from_directory('build-uc-ui/dist', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    # If file exists in dist, serve it
    try:
        return send_from_directory('build-uc-ui/dist', path)
    except:
        # Otherwise serve index.html for React routing
        return send_from_directory('build-uc-ui/dist', 'index.html')

if __name__ == '__main__':
    print("UniversalClip running at http://localhost:5000")
    app.run(debug=False, port=5000)
