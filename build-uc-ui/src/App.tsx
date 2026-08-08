import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'home' | 'clip' | 'riset'
type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface Clip {
  id: number
  keyword: string
  badge: string
  badgeType: 'kaget' | 'lucu' | 'audio' | 'komentar'
  start: number
  end: number
  intensityScore: number
  kagetScore: number
  lucuScore: number
  label: 'Shorts' | 'Reels' | 'Video'
  komentar: string
  transkrip: string
}

interface IdeKonten {
  id: number
  format: 'Short' | 'Normal'
  judul: string
  keyword: string
  deskripsi: string
  hashtags: string[]
  sumber: string
}

// YouTube IFrame API global
declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

// ─── Mock Data (dari desain Figma) ────────────────────────────────────────────

const MOCK_CLIPS: Clip[] = [
  {
    id: 1,
    keyword: 'jumpscare kucing',
    badge: '😱 KAGET',
    badgeType: 'kaget',
    start: 12,
    end: 27,
    intensityScore: 94,
    kagetScore: 91,
    lucuScore: 45,
    label: 'Shorts',
    komentar: '"Gila sih kocak banget 😂" — @user123',
    transkrip: 'Dan tiba-tiba... WAH! Kucing itu melompat keluar dari balik lemari dengan suara yang memekakkan telinga!',
  },
  {
    id: 2,
    keyword: 'momen ngakak host',
    badge: '😂 LUCU',
    badgeType: 'lucu',
    start: 45,
    end: 78,
    intensityScore: 87,
    kagetScore: 22,
    lucuScore: 95,
    label: 'Shorts',
    komentar: '"Ngakak parah sampe nangis 🤣" — @ngakak_terus',
    transkrip: 'Host-nya langsung jatuh dari kursi karena nggak kuat nahan tawa. Semua orang di studio ikutan ketawa.',
  },
  {
    id: 3,
    keyword: 'reveal ending twist',
    badge: '😱 KAGET',
    badgeType: 'kaget',
    start: 120,
    end: 148,
    intensityScore: 89,
    kagetScore: 88,
    lucuScore: 30,
    label: 'Video',
    komentar: '"Plotnya gak nyangka banget!!" — @filmbro99',
    transkrip: 'Dan di sinilah terungkap bahwa selama ini karakter utama adalah pelakunya sendiri.',
  },
  {
    id: 4,
    keyword: 'reaksi penonton kaget',
    badge: '🔊 AUDIO',
    badgeType: 'audio',
    start: 200,
    end: 215,
    intensityScore: 76,
    kagetScore: 72,
    lucuScore: 55,
    label: 'Reels',
    komentar: '"Suaranya pecah banget di earphone" — @audiophile_id',
    transkrip: 'Tiba-tiba suara keras menggelegar dari speaker dan semua penonton berteriak kencang.',
  },
  {
    id: 5,
    keyword: 'komentar viral netizen',
    badge: '💬 KOMENTAR',
    badgeType: 'komentar',
    start: 300,
    end: 328,
    intensityScore: 71,
    kagetScore: 15,
    lucuScore: 82,
    label: 'Reels',
    komentar: '"Ini mah emang queens banget timing-nya" — @komentator_ulung',
    transkrip: 'Bagian ini jadi viral karena komentar netizen yang lucu-lucu di kolom komentar YouTube.',
  },
]

const MOCK_IDE_KONTEN: IdeKonten[] = [
  {
    id: 1,
    format: 'Short',
    judul: '10 Jumpscare Anime yang Bikin Jantungan — Dijamin Kaget!',
    keyword: 'jumpscare anime kaget',
    deskripsi: 'Kompilasi momen paling mengejutkan di anime populer 2024, dikurasi berdasarkan reaksi penonton paling viral.',
    hashtags: ['#anime', '#jumpscare', '#viral', '#shorts', '#animeindonesia'],
    sumber: 'youtube.com/watch?v=dQw4w9WgXcQ',
  },
  {
    id: 2,
    format: 'Normal',
    judul: 'Sejarah Perang Diponegoro yang Tidak Diajarkan di Sekolah',
    keyword: 'sejarah indonesia tersembunyi',
    deskripsi: 'Fakta-fakta mengejutkan tentang Perang Diponegoro yang jarang dibahas, dari sumber primer dan arsip kolonial Belanda.',
    hashtags: ['#sejarahindonesia', '#diponegoro', '#faktalucu', '#edukasi'],
    sumber: 'youtube.com/watch?v=abc123def',
  },
  {
    id: 3,
    format: 'Short',
    judul: 'Momen Ngakak Gaming yang Bikin Viewers Nggak Bisa Berhenti Ketawa',
    keyword: 'gaming lucu fail indonesia',
    deskripsi: 'Clip gaming paling kocak minggu ini dari streamer Indonesia — cocok untuk dijadikan konten Shorts harian.',
    hashtags: ['#gaming', '#streamerindonesia', '#ngakak', '#gamingfails', '#shorts'],
    sumber: 'youtube.com/watch?v=xyz789',
  },
  {
    id: 4,
    format: 'Normal',
    judul: 'Kenapa Anime One Piece Masih Relevan Setelah 25 Tahun?',
    keyword: 'one piece analisis mendalam',
    deskripsi: 'Analisis mendalam tentang formula storytelling Oda yang mempertahankan jutaan penonton global selama lebih dari dua dekade.',
    hashtags: ['#onepiece', '#anime', '#analisis', '#mangavsanime'],
    sumber: 'youtube.com/watch?v=onepiece25',
  },
  {
    id: 5,
    format: 'Short',
    judul: 'Berita Hari Ini yang Bikin Warganet Heboh — Recap 60 Detik',
    keyword: 'berita viral hari ini',
    deskripsi: 'Rangkuman berita trending hari ini dalam format 60 detik, cocok untuk penonton yang sibuk.',
    hashtags: ['#berita', '#viral', '#infoterkini', '#shorts', '#newsindonesia'],
    sumber: 'youtube.com/watch?v=beritaviral',
  },
]

const FILTER_OPTIONS = [
  { value: 'all', label: 'Semua Filter' },
  { value: 'audio', label: '🔊 Audio Peak' },
  { value: 'lucu', label: '😂 Paling Lucu' },
  { value: 'kaget', label: '😱 Adegan Kaget' },
  { value: 'komentar', label: '💬 Komentar' },
  { value: 'pendek', label: '⏱ Pendek' },
]

const KATEGORI_OPTIONS = [
  { value: 'gaming', label: 'Gaming 🎮' },
  { value: 'berita', label: 'Berita 📰' },
  { value: 'anime', label: 'Anime ⚔️' },
  { value: 'cerita', label: 'Cerita 📖' },
  { value: 'sejarah', label: 'Sejarah 🏛️' },
  { value: 'lucu', label: 'Video Lucu 😂' },
]

const TOP_KEYWORDS = [
  'viral 2025', 'jumpscare gaming', 'epic moment', 'fail compilation',
  'review jujur', 'behind the scene', 'reaction terbaik', 'top 10 indonesia',
  'drama korea', 'tutorial viral',
]

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function duration(clip: Clip): number {
  return Math.round(clip.end - clip.start)
}

// ─── API (wiring backend, fallback ke mock kalau gagal) ──────────────────────

const API = {
  async trending(category: string): Promise<IdeKonten[]> {
    try {
      const res = await fetch('/api/trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const videos = data.videos || []
      if (videos.length === 0) return []
      return videos.map((v: any, i: number) => ({
        id: i,
        format: i % 2 === 0 ? 'Short' : 'Normal',
        judul: v.title || 'Untitled',
        keyword: category,
        deskripsi: v.description || 'Video trending dari YouTube',
        hashtags: ['#viral', `#${category}`, '#youtube', '#shorts', '#trending'],
        sumber: `youtube.com/watch?v=${v.id}`,
      }))
    } catch (e) {
      console.error('Trending API error:', e)
      return []
    }
  },
  async downloadAudio(url: string): Promise<any> {
    const res = await fetch('/api/download-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (!res.ok) throw new Error('Download gagal')
    return res.json()
  },
  async analyze(filename: string, vid_id: string): Promise<any> {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, vid_id }),
    })
    if (!res.ok) throw new Error('Analisis gagal')
    return res.json()
  },
  async subtitles(vid_id: string, clips: any[]): Promise<any> {
    const res = await fetch('/api/subtitles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vid_id, clips }),
    })
    if (!res.ok) throw new Error('Subtitles gagal')
    return res.json()
  },
}

// ─── Toast System ─────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  const colors: Record<ToastType, string> = {
    success: 'rgba(34,197,94,0.15)',
    error: 'rgba(239,68,68,0.15)',
    info: 'rgba(124,58,237,0.15)',
  }
  const icons: Record<ToastType, string> = { success: '✅', error: '❌', info: 'ℹ️' }
  const borderColors: Record<ToastType, string> = {
    success: 'rgba(34,197,94,0.3)',
    error: 'rgba(239,68,68,0.3)',
    info: 'rgba(124,58,237,0.3)',
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast-enter"
          style={{
            background: colors[t.type],
            border: `1px solid ${borderColors[t.type]}`,
            borderRadius: 10,
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--foreground)',
            backdropFilter: 'blur(12px)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          onClick={() => onDismiss(t.id)}
        >
          <span>{icons[t.type]}</span>
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ activeTab, setActiveTab, dark, setDark }: {
  activeTab: Tab
  setActiveTab: (t: Tab) => void
  dark: boolean
  setDark: (d: boolean) => void
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'home', label: '🏠 Home' },
    { id: 'clip', label: '🎬 Clip' },
    { id: 'riset', label: '💡 Riset Konten' },
  ]

  return (
    <nav style={{
      background: 'rgba(11,11,16,0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 60, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
          <span style={{ fontSize: 22 }}>📋</span>
          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: '"Oxanium", sans-serif', background: 'linear-gradient(135deg, #a855f7, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.04em' }}>
            UniversalClip
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: activeTab === t.id ? 'rgba(124,58,237,0.08)' : 'none',
                border: 'none',
                borderBottom: activeTab === t.id ? '2px solid #a855f7' : '2px solid transparent',
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: activeTab === t.id ? 600 : 500,
                color: activeTab === t.id ? '#a855f7' : 'var(--muted-foreground)',
                cursor: 'pointer',
                borderRadius: '8px 8px 0 0',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setDark(!dark)}
            style={{
              background: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: 16,
              transition: 'all 0.2s ease',
              color: 'var(--foreground)',
            }}
            title={dark ? 'Switch to Light' : 'Switch to Dark'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  )
}

// ─── Home Page ────────────────────────────────────────────────────────────────

function HomePage({ setActiveTab }: { setActiveTab: (t: Tab) => void }) {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        height: 300,
        background: 'radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div className="fade-in" style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 999, padding: '4px 16px', marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, background: '#a855f7', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #a855f7' }} />
          <span style={{ fontSize: 12, color: '#a855f7', fontWeight: 600 }}>Powered by MiMo v2.5 Pro AI</span>
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, margin: '0 0 20px', lineHeight: 1.1 }}>
          Selamat Datang di{' '}
          <span style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            UniversalClip
          </span>
        </h1>

        <p style={{ fontSize: 'clamp(16px, 2.5vw, 22px)', color: 'var(--muted-foreground)', margin: '0 0 48px', maxWidth: 600, lineHeight: 1.6 }}>
          Auto-clip & riset konten YouTube <strong style={{ color: 'var(--foreground)' }}>powered by AI</strong> — temukan momen terbaik, buat konten viral lebih cepat.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 64 }}>
          <button className="btn-primary glow-purple" onClick={() => setActiveTab('clip')} style={{ padding: '16px 36px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            🎬 Mulai Clip
          </button>
          <button className="btn-secondary" onClick={() => setActiveTab('riset')} style={{ padding: '16px 36px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            💡 Riset Konten
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 64 }}>
          {['😱 Kaget Detection', '😂 Lucu Score', '🔊 Audio Peak', '📊 AI Analysis', '⬇️ Auto Download', '📱 Multi Format'].map(f => (
            <span key={f} style={{
              background: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: 999,
              padding: '6px 16px',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--muted-foreground)',
            }}>
              {f}
            </span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, width: '100%', maxWidth: 680, margin: '0 auto' }}>
          {[
            { val: '10K+', label: 'Video Diproses' },
            { val: '98%', label: 'Akurasi AI' },
            { val: '5×', label: 'Lebih Cepat' },
          ].map(s => (
            <div key={s.val} className="card-base" style={{ padding: '24px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg, #a855f7, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {s.val}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Timeline Editor (CapCut style, sync dengan YouTube player) ───────────────

interface TimelineProps {
  clip: Clip
  currentTime: number          // detik absolut di video
  playing: boolean
  onTogglePlay: () => void
  onSeek: (t: number) => void  // detik absolut
  onReset: () => void
}

function TimelineEditor({ clip, currentTime, playing, onTogglePlay, onSeek, onReset }: TimelineProps) {
  const clipDur = Math.max(1, clip.end - clip.start)
  const trackRef = useRef<HTMLDivElement>(null)

  const [trimStart, setTrimStart] = useState(0)   // 0–100 percent
  const [trimEnd, setTrimEnd] = useState(100)     // 0–100 percent
  const [hoveredHandle, setHoveredHandle] = useState<'left' | 'right' | null>(null)
  const dragging = useRef<'left' | 'right' | null>(null)

  // Reset trim saat ganti clip
  useEffect(() => {
    setTrimStart(0)
    setTrimEnd(100)
  }, [clip.id])

  // Playhead mengikuti currentTime dari player
  const playheadPct = Math.max(0, Math.min(100, ((currentTime - clip.start) / clipDur) * 100))

  const getPct = (e: MouseEvent | React.MouseEvent) => {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
  }

  const onMouseDown = (handle: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragging.current = handle

    const onMove = (ev: MouseEvent) => {
      const pct = getPct(ev)
      if (dragging.current === 'left') setTrimStart(Math.min(pct, trimEnd - 5))
      if (dragging.current === 'right') setTrimEnd(Math.max(pct, trimStart + 5))
    }
    const onUp = () => {
      dragging.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Klik track → seek player ke titik itu
  const onTrackClick = (e: React.MouseEvent) => {
    if (dragging.current) return
    const pct = getPct(e)
    onSeek(clip.start + (pct / 100) * clipDur)
  }

  const reset = () => {
    setTrimStart(0)
    setTrimEnd(100)
    onReset()
  }

  const startSec = clip.start + (trimStart / 100) * clipDur
  const endSec = clip.start + (trimEnd / 100) * clipDur
  const durSec = Math.round(endSec - startSec)

  return (
    <div style={{ background: '#13131d', border: '1px solid #252538', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#e8e8ef', flex: 1 }}>✂️ Manual Timeline</span>
        <button
          onClick={onTogglePlay}
          style={{
            background: playing ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.15)',
            border: `1px solid ${playing ? '#ef4444' : '#252538'}`,
            borderRadius: 6,
            padding: '3px 10px',
            fontSize: 11,
            color: playing ? '#ef4444' : '#e8e8ef',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        {/* ponytail: Split bikin clip baru butuh logika slice — nanti kalau mau */}
        <button
          style={{ background: 'none', border: '1px solid #252538', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#e8e8ef', cursor: 'pointer', fontFamily: 'inherit' }}
          onClick={() => {}}
        >
          ✂ Split
        </button>
        <button
          style={{ background: 'none', border: '1px solid #252538', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#e8e8ef', cursor: 'pointer', fontFamily: 'inherit' }}
          onClick={reset}
        >
          ↻ Reset
        </button>
      </div>

      <div
        ref={trackRef}
        onMouseDown={onTrackClick}
        style={{ width: '100%', height: 48, background: '#0b0b10', borderRadius: 8, position: 'relative', userSelect: 'none', cursor: 'pointer' }}
      >
        {[0, 25, 50, 75, 100].map(p => (
          <div key={p} style={{
            position: 'absolute', left: `${p}%`, top: 0, bottom: 0,
            width: 1, background: 'rgba(255,255,255,0.04)',
          }} />
        ))}

        <div style={{
          position: 'absolute',
          left: `${trimStart}%`,
          width: `${trimEnd - trimStart}%`,
          top: 0, bottom: 0,
          background: 'rgba(124,58,237,0.3)',
          border: '2px solid #7c3aed',
          borderRadius: 6,
          pointerEvents: 'none',
        }} />

        <div
          onMouseDown={onMouseDown('left')}
          onMouseEnter={() => setHoveredHandle('left')}
          onMouseLeave={() => setHoveredHandle(null)}
          style={{
            position: 'absolute',
            left: `${trimStart}%`,
            transform: 'translateX(-50%)',
            top: 0,
            width: 20, height: 48,
            background: hoveredHandle === 'left' ? '#a855f7' : '#7c3aed',
            borderRadius: '6px 2px 2px 6px',
            cursor: 'ew-resize',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 3,
            transition: 'background 0.15s ease',
            boxShadow: hoveredHandle === 'left' ? '0 0 10px rgba(168,85,247,0.5)' : 'none',
          }}
        >
          <span style={{ color: '#fff', fontSize: 10, pointerEvents: 'none' }}>◀</span>
        </div>

        <div
          onMouseDown={onMouseDown('right')}
          onMouseEnter={() => setHoveredHandle('right')}
          onMouseLeave={() => setHoveredHandle(null)}
          style={{
            position: 'absolute',
            left: `${trimEnd}%`,
            transform: 'translateX(-50%)',
            top: 0,
            width: 20, height: 48,
            background: hoveredHandle === 'right' ? '#a855f7' : '#7c3aed',
            borderRadius: '2px 6px 6px 2px',
            cursor: 'ew-resize',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 3,
            transition: 'background 0.15s ease',
            boxShadow: hoveredHandle === 'right' ? '0 0 10px rgba(168,85,247,0.5)' : 'none',
          }}
        >
          <span style={{ color: '#fff', fontSize: 10, pointerEvents: 'none' }}>▶</span>
        </div>

        <div style={{
          position: 'absolute',
          left: `${playheadPct}%`,
          top: 0,
          bottom: 0,
          width: 3,
          background: '#ef4444',
          zIndex: 4,
          transform: 'translateX(-50%)',
          borderRadius: 2,
          pointerEvents: 'none',
          transition: 'left 0.15s linear',
        }}>
          <span style={{
            position: 'absolute',
            top: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#ef4444',
            fontSize: 10,
            lineHeight: 1,
          }}>▼</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: '#8888a0' }}>{formatTime(Math.round(startSec))}</span>
        <span style={{ fontSize: 11, color: '#8888a0' }}>Durasi: {durSec}s</span>
        <span style={{ fontSize: 11, color: '#8888a0' }}>{formatTime(Math.round(endSec))}</span>
      </div>
    </div>
  )
}

// ─── Clip Editor ──────────────────────────────────────────────────────────────

function ClipEditor({ addToast }: { addToast: (msg: string, type: ToastType) => void }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedClip, setSelectedClip] = useState<Clip>(MOCK_CLIPS[0])
  const [progress, setProgress] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [vidId, setVidId] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [realClips, setRealClips] = useState<Clip[]>([])
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const playerHostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const playerReadyRef = useRef(false)
  const pendingSeekRef = useRef<number | null>(null)

  const clips = realClips.length > 0 ? realClips : MOCK_CLIPS
  const activeClip = clips.find(c => c.id === selectedClip.id) || clips[0]

  // ── YouTube IFrame API: buat player sekali per vidId ──
  useEffect(() => {
    if (!vidId) return
    let cancelled = false

    const initPlayer = () => {
      if (cancelled || !playerHostRef.current || playerRef.current) return
      playerRef.current = new window.YT.Player(playerHostRef.current, {
        videoId: vidId,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            playerReadyRef.current = true
            if (pendingSeekRef.current != null) {
              playerRef.current.seekTo(pendingSeekRef.current, true)
              pendingSeekRef.current = null
            }
          },
          onStateChange: (e: any) => setPlaying(e.data === 1),
        },
      })
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      window.onYouTubeIframeAPIReady = initPlayer
      if (!document.querySelector('script[src*="iframe_api"]')) {
        const s = document.createElement('script')
        s.src = 'https://www.youtube.com/iframe_api'
        document.body.appendChild(s)
      }
    }

    return () => { cancelled = true }
  }, [vidId])

  // ── Ganti clip → seek tanpa reload iframe ──
  useEffect(() => {
    if (!vidId) return
    const t = activeClip.start
    setCurrentTime(t)
    if (playerReadyRef.current && playerRef.current?.seekTo) {
      playerRef.current.seekTo(t, true)
    } else {
      pendingSeekRef.current = t
    }
  }, [activeClip.id, vidId])

  // ── Polling posisi player ──
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      const p = playerRef.current
      if (p && typeof p.getCurrentTime === 'function') {
        setCurrentTime(p.getCurrentTime())
      }
    }, 250)
    return () => clearInterval(id)
  }, [playing])

  const filteredClips = clips.filter(c => {
    const matchSearch = c.keyword.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || c.badgeType === filter || (filter === 'pendek' && duration(c) <= 30)
    return matchSearch && matchFilter
  })

  const badgeColors: Record<string, string> = {
    kaget: 'rgba(239,68,68,0.2)',
    lucu: 'rgba(234,179,8,0.2)',
    audio: 'rgba(59,130,246,0.2)',
    komentar: 'rgba(34,197,94,0.2)',
  }
  const badgeTextColors: Record<string, string> = {
    kaget: '#f87171',
    lucu: '#fbbf24',
    audio: '#60a5fa',
    komentar: '#4ade80',
  }

  const labelColors: Record<string, string> = {
    Shorts: 'rgba(239,68,68,0.15)',
    Reels: 'rgba(236,72,153,0.15)',
    Video: 'rgba(124,58,237,0.15)',
  }
  const labelTextColors: Record<string, string> = {
    Shorts: '#f87171',
    Reels: '#f472b6',
    Video: '#a855f7',
  }

  const handleAnalyze = async () => {
    if (!youtubeUrl.trim()) {
      addToast('Masukkan URL YouTube terlebih dahulu', 'error')
      return
    }
    setAnalyzing(true)
    addToast('Memulai download audio...', 'info')
    try {
      const data = await API.downloadAudio(youtubeUrl)
      setVidId(data.vid_id)
      addToast('Menganalisis audio, ini agak lama...', 'info')
      const moments = await API.analyze(data.filename, data.vid_id)

      // Server return key "clips" (max 20)
      const rawMoments: any[] = moments.clips || []
      const newClips: Clip[] = rawMoments.map((m: any, i: number) => {
        const isKaget = !!m.tag_kaget
        const isLucu = (m.lucu_score || 0) >= 5
        return {
          id: i,
          keyword: isLucu ? 'momen ngakak' : isKaget ? 'adegan kaget' : 'epic moment',
          badge: isKaget ? '😱 KAGET' : isLucu ? '😂 LUCU' : '🔊 AUDIO',
          badgeType: isKaget ? 'kaget' : isLucu ? 'lucu' : 'audio',
          start: Math.round(m.start),
          end: Math.round(m.end),
          intensityScore: Math.round((m.intensity || 0) * 100),
          kagetScore: Math.round((m.kaget_score || 0) * 10),
          lucuScore: Math.round((m.lucu_score || 0) * 10),
          label: m.label === 'Reels' ? 'Reels' : m.label === 'Video' ? 'Video' : 'Shorts',
          komentar: 'Moment terdeteksi dari analisis audio',
          transkrip: 'Video telah dianalisis oleh UniversalClip',
        }
      })

      // Ambil subtitle → keyword & transkrip kontekstual per clip
      if (newClips.length > 0) {
        try {
          const subRes = await API.subtitles(data.vid_id, rawMoments.map((m: any, i: number) => ({ id: i, start: m.start, end: m.end })))
          const subClips: any[] = subRes.clips || []
          if (subClips.length === newClips.length) {
            subClips.forEach((sc: any, i: number) => {
              if (sc.keyword) newClips[i].keyword = sc.keyword
              if (sc.transcript) newClips[i].transkrip = sc.transcript
            })
          }
        } catch (e) {
          console.error('Subtitles error:', e)
        }
      }

      if (newClips.length > 0) {
        setRealClips(newClips)
        setSelectedClip(newClips[0])
        addToast(`Ditemukan ${newClips.length} moment!`, 'success')
      } else {
        addToast('Tidak ada moment terdeteksi, pakai data contoh', 'info')
      }
    } catch (e) {
      addToast(`Error: ${String(e).slice(0, 60)}`, 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  const togglePlay = () => {
    const p = playerRef.current
    if (!p) return
    if (playing) {
      p.pauseVideo()
    } else {
      if (currentTime < activeClip.start || currentTime > activeClip.end) {
        p.seekTo(activeClip.start, true)
      }
      p.playVideo()
    }
  }

  const seekTo = (t: number) => {
    const p = playerRef.current
    setCurrentTime(t)
    if (p && playerReadyRef.current) p.seekTo(t, true)
    else pendingSeekRef.current = t
  }

  const resetPlayback = () => {
    seekTo(activeClip.start)
    const p = playerRef.current
    if (p) p.pauseVideo()
  }

  const simulateDownload = (label: string) => {
    setDownloading(true)
    setProgress(0)
    addToast(`Memulai download ${label}...`, 'info')
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          setDownloading(false)
          addToast(`${label} berhasil didownload!`, 'success')
          return 0
        }
        return p + 10
      })
    }, 200)
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 300px', gap: 16 }}>

        {/* ── LEFT: Clip List ── */}
        <div className="card-base" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            📋 Daftar Clip <span style={{ color: '#a855f7', fontWeight: 700 }}>({clips.length})</span>
          </h3>

          <input
            type="text"
            placeholder="🔍 Cari clip..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />

          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: '100%' }}>
            {FILTER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredClips.map((clip, i) => (
              <div
                key={clip.id}
                onClick={() => setSelectedClip(clip)}
                style={{
                  background: activeClip.id === clip.id ? 'rgba(124,58,237,0.12)' : 'var(--muted)',
                  border: `1px solid ${activeClip.id === clip.id ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
                  borderRadius: 10,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600 }}>#{i + 1}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <span className="pill" style={{ background: badgeColors[clip.badgeType], color: badgeTextColors[clip.badgeType], fontSize: 10 }}>
                      {clip.badge}
                    </span>
                    <span className="pill" style={{ background: labelColors[clip.label], color: labelTextColors[clip.label], fontSize: 10 }}>
                      {clip.label}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--foreground)' }}>{clip.keyword}</div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                  {formatTime(clip.start)} – {formatTime(clip.end)} · {duration(clip)}s
                </div>
              </div>
            ))}
            {filteredClips.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13, padding: '24px 0' }}>
                Tidak ada clip ditemukan
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: Video Player ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card-base" style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="🔗 Paste link YouTube lalu analisis..."
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAnalyze() }}
                style={{ flex: 1 }}
              />
              <button
                className="btn-primary"
                onClick={handleAnalyze}
                disabled={analyzing}
                style={{ padding: '8px 20px', fontSize: 13, whiteSpace: 'nowrap' }}
              >
                {analyzing ? '⏳...' : 'Analisis'}
              </button>
            </div>
            {downloading && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Mengunduh...</span>
                  <span style={{ fontSize: 11, color: '#a855f7' }}>{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="card-base" style={{ overflow: 'hidden' }}>
            <div style={{ position: 'relative', background: '#000', borderRadius: '12px 12px 0 0' }}>
              {vidId ? (
                <div ref={playerHostRef} style={{ width: '100%', aspectRatio: '16/9' }} />
              ) : (
                <div style={{ height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
                  <span style={{ fontSize: 48 }}>🎥</span>
                  <span style={{ color: '#666', fontSize: 14 }}>Analisis video dulu untuk tampilkan player</span>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }} onClick={() => seekTo(activeClip.start - 5)}>⏪ 5s</button>
              <button className="btn-primary" style={{ padding: '7px 20px', fontSize: 13 }} onClick={togglePlay}>
                {playing ? '⏸ Pause' : '▶ Play'}
              </button>
              <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: 13 }} onClick={() => seekTo(activeClip.start + 5)}>⏩ 5s</button>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                {formatTime(activeClip.start)} / {formatTime(activeClip.end)}
              </span>
            </div>
          </div>

          <TimelineEditor
            clip={activeClip}
            currentTime={currentTime}
            playing={playing}
            onTogglePlay={togglePlay}
            onSeek={seekTo}
            onReset={resetPlayback}
          />
        </div>

        {/* ── RIGHT: Detail & Download ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
          <div className="card-base" style={{ padding: 16 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              📊 Detail Clip
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Start', val: formatTime(activeClip.start) },
                { label: 'End', val: formatTime(activeClip.end) },
                { label: 'Durasi', val: `${duration(activeClip)}s` },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{r.val}</span>
                </div>
              ))}

              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

              {[
                { label: 'Intensity', val: activeClip.intensityScore, color: '#a855f7' },
                { label: 'Kaget Score', val: activeClip.kagetScore, color: '#f87171' },
                { label: 'Lucu Score', val: activeClip.lucuScore, color: '#fbbf24' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{s.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.val}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(100, s.val)}%`, background: s.color }} />
                  </div>
                </div>
              ))}

              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

              <div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 4 }}>Keyword</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#a855f7' }}>{activeClip.keyword}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 4 }}>Komentar Viral</div>
                <div style={{ fontSize: 11, color: 'var(--foreground)', fontStyle: 'italic', lineHeight: 1.5, background: 'var(--muted)', borderRadius: 8, padding: '8px 10px' }}>
                  {activeClip.komentar}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 4 }}>Transkrip</div>
                <div style={{ fontSize: 11, color: 'var(--foreground)', lineHeight: 1.6, background: 'var(--muted)', borderRadius: 8, padding: '8px 10px' }}>
                  {activeClip.transkrip}
                </div>
              </div>
            </div>
          </div>

          <div className="card-base" style={{ padding: 16 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ⚡ Aksi
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn-secondary"
                style={{ padding: '10px', fontSize: 13, width: '100%' }}
                onClick={() => togglePlay()}
              >
                ▶ Preview Clip
              </button>
              <button
                className="btn-primary glow-purple-sm"
                style={{ padding: '10px', fontSize: 13, width: '100%' }}
                onClick={() => simulateDownload(`Clip #${activeClip.id + 1}`)}
              >
                ⬇ Download Clip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Riset Konten ─────────────────────────────────────────────────────────────

function RisetKonten({ addToast }: { addToast: (msg: string, type: ToastType) => void }) {
  const [kategori, setKategori] = useState('gaming')
  const [target, setTarget] = useState('indonesia')
  const [jumlah, setJumlah] = useState('5')
  const [ide, setIde] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<IdeKonten[]>([])

  const generate = async () => {
    setLoading(true)
    addToast('AI sedang menganalisis konten terbaik...', 'info')
    try {
      const data = await API.trending(kategori)
      const list = data.length > 0
        ? data.slice(0, parseInt(jumlah))
        : MOCK_IDE_KONTEN.slice(0, parseInt(jumlah))
      setResults(list)
      addToast(data.length > 0 ? 'Riset konten berhasil digenerate!' : 'Riset konten berhasil digenerate! (data contoh)', 'success')
    } catch (e) {
      setResults(MOCK_IDE_KONTEN.slice(0, parseInt(jumlah)))
      addToast('Riset konten berhasil digenerate! (data contoh)', 'success')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div className="card-base" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff' }}>1</div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#a855f7' }}>💡 LANGKAH 1 — Pilih Kategori & Filter</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Kategori</label>
            <select value={kategori} onChange={e => setKategori(e.target.value)} style={{ width: '100%' }}>
              {KATEGORI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Target Audiens</label>
            <select value={target} onChange={e => setTarget(e.target.value)} style={{ width: '100%' }}>
              <option value="indonesia">Indonesia 🇮🇩</option>
              <option value="global">Global 🌍</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Jumlah Ide</label>
            <select value={jumlah} onChange={e => setJumlah(e.target.value)} style={{ width: '100%' }}>
              {['5', '10', '15', '20'].map(n => <option key={n} value={n}>{n} ide</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Ide Spesifik (Opsional)
          </label>
          <input
            type="text"
            placeholder="Contoh: konten tentang sejarah kuliner Indonesia..."
            value={ide}
            onChange={e => setIde(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <button
          className="btn-primary glow-purple"
          onClick={generate}
          disabled={loading}
          style={{ padding: '12px 32px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: 16, height: 16 }} />
              Menganalisis dengan AI...
            </>
          ) : (
            '✨ Generate Riset Konten'
          )}
        </button>
      </div>

      {results.length > 0 && (
        <div className="card-base fade-in" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            🔥 Top Keywords
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TOP_KEYWORDS.map((kw, i) => (
              <span
                key={kw}
                className="pill"
                style={{
                  background: i < 3 ? 'rgba(124,58,237,0.2)' : 'var(--muted)',
                  color: i < 3 ? '#a855f7' : 'var(--muted-foreground)',
                  border: `1px solid ${i < 3 ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`,
                  padding: '5px 14px',
                  fontSize: 12,
                }}
              >
                {i < 3 && '🔥 '}{kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {results.map((ideKonten, i) => (
            <div key={ideKonten.id} className="card-base fade-in" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 600 }}>#{i + 1}</span>
                  <span className="pill" style={{
                    background: ideKonten.format === 'Short' ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.15)',
                    color: ideKonten.format === 'Short' ? '#f87171' : '#a855f7',
                    fontSize: 11,
                  }}>
                    {ideKonten.format === 'Short' ? '📱 Short' : '🎬 Normal'}
                  </span>
                </div>
                <button
                  className="btn-secondary"
                  style={{ padding: '5px 14px', fontSize: 11 }}
                  onClick={() => addToast(`Ide "${ideKonten.judul.slice(0, 30)}..." disimpan!`, 'success')}
                >
                  💾 Simpan
                </button>
              </div>

              <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, lineHeight: 1.4, color: 'var(--foreground)' }}>
                {ideKonten.judul}
              </h3>

              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>🔑 Keyword:</span>
                <span style={{ fontSize: 11, color: '#a855f7', fontWeight: 600 }}>{ideKonten.keyword}</span>
              </div>

              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                {ideKonten.deskripsi}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {ideKonten.hashtags.map(h => (
                  <span key={h} className="pill" style={{ background: 'rgba(124,58,237,0.1)', color: '#a855f7', border: '1px solid rgba(124,58,237,0.2)', fontSize: 11 }}>
                    {h}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>🔗 Sumber:</span>
                <a
                  href={`https://${ideKonten.sumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: '#60a5fa', textDecoration: 'none' }}
                >
                  {ideKonten.sumber}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [dark, setDark] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
  }, [dark])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', transition: 'all 0.3s ease' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} dark={dark} setDark={setDark} />

      <main>
        {activeTab === 'home' && <HomePage setActiveTab={setActiveTab} />}
        {activeTab === 'clip' && <ClipEditor addToast={addToast} />}
        {activeTab === 'riset' && <RisetKonten addToast={addToast} />}
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
