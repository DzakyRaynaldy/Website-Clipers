# ✂️ Website-Clipers

> AI-powered YouTube video clipper & content research tool — built entirely by AI Agent (Hermes)

## 🎯 Fitur

### 🎬 Auto-Clip Editor
- **Paste link YouTube** → auto-detect momen epic, kata mutiara, highlight
- Audio-only analysis (hemat bandwidth, 60MB vs 200MB+ full video)
- Filter: Audio Peak / Komentar Populer / Durasi Pendek
- YouTube subtitle integration → keyword per clip
- Comment timestamps analysis → momen paling dibahas penonton
- Export: Preview + Download clip MP4 (YouTube Shorts, Reels, Video)

### 💡 Riset Konten (AI-Powered)
- 6 kategori: Gaming, Berita, Anime, Cerita, Sejarah, Video Lucu
- Search trending YouTube per kategori (via yt-dlp)
- **AI generate** judul hook, keyword, deskripsi, hashtag (via LLM)
- Format: Short (15-60s) vs Normal (video panjang)
- Target audience: Indonesia / Global

### 🌙 Dark/Light Mode
- Toggle tema via tombol di navbar
- Riset Konten: always white cards (CurioVerse-inspired)

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Python + Flask |
| Audio Analysis | FFmpeg + Python struct (raw PCM RMS) |
| YouTube Download | yt-dlp (open source) |
| Subtitle Extraction | yt-dlp (auto/manual subs) |
| Comment Analysis | yt-dlp (YouTube comments API) |
| AI Content Generation | LLM via 9Router API |
| Frontend | Vanilla JS + CSS |
| Video Player | YouTube IFrame API |

## 📁 Struktur

```
├── server.py           # Flask backend (API endpoints)
├── static/
│   ├── index.html      # Main UI (3 tab: Home, Clip, Riset)
│   ├── style.css       # Dark/Light theme + CurioVerse-style
│   └── app.js          # Frontend logic
├── downloads/          # Cache audio & clip
└── README.md
```

## 🚀 Cara Pakai

```bash
# Install dependencies
pip install flask flask-cors yt-dlp

# Pastikan FFmpeg terinstall
ffmpeg -version

# Run server
python server.py

# Buka browser
http://localhost:5000
```

## 📡 API Endpoints

| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/api/download-audio` | POST | Download audio YouTube |
| `/api/analyze` | POST | Analisis audio → detect momen |
| `/api/comments` | POST | Ambil timestamp komentar |
| `/api/subtitles` | POST | Ambil subtitle per clip |
| `/api/trending` | POST | Search trending per kategori |
| `/api/saran-konten` | POST | AI generate ide konten |
| `/api/download-video-segment` | POST | Export clip MP4 |

## 🤖 Built by AI Agent

Project ini **100% dibuat oleh AI Agent** (Hermes Agent by Nous Research):
- Code generation dari natural language prompt
- Iterasi UI/UX berdasarkan feedback real-time
- Integrasi fitur: audio analysis, subtitle, komentar, LLM
- Debugging & optimization otomatis

## 💰 Cost: $0

- yt-dlp → open source
- FFmpeg → open source
- YouTube IFrame API → free
- LLM (MiMo v2.5 Pro via 9Router) → free tier

## 📄 License

MIT
