import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'home' | 'clip'
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

const FILTER_OPTIONS = [
  { value: 'all', label: 'Semua Filter' },
  { value: 'audio', label: '🔊 Audio Peak' },
  { value: 'lucu', label: '😂 Paling Lucu' },
  { value: 'kaget', label: '😱 Adegan Kaget' },
  { value: 'komentar', label: '💬 Komentar' },
  { value: 'pendek', label: '⏱ Pendek' },
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

function labelFor(dur: number): Clip['label'] {
  if (dur <= 15) return 'Shorts'
  if (dur <= 60) return 'Reels'
  return 'Video'
}

// ─── API ──────────────────────────────────────────────────────────────────────

const API = {
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
  onSplit: () => void
}

function TimelineEditor({ clip, currentTime, playing, onTogglePlay, onSeek, onReset, onSplit }: TimelineProps) {
  const clipDur = Math.max(1, clip.end - clip.start)
  const trackRef = useRef<HTMLDivElement>(null)

  const [trimStart, setTrimStart] = useState(0)   // 0–100 percent
  const [trimEnd, setTrimEnd] = useState(100)     // 0–100 percent
  const [hoveredHandle, setHoveredHandle] = useState<'left' | 'right' | null>(null)
  const dragging = useRef<'left' | 'right' | null>(null)

  useEffect(() => {
    setTrimStart(0)
    setTrimEnd(100)
  }, [clip.id])

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
        <button
          onClick={onSplit}
          style={{
            background: 'rgba(124,58,237,0.15)',
            border: '1px solid #252538',
            borderRadius: 6,
            padding: '3px 10px',
            fontSize: 11,
            color: '#a855f7',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
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

// ─── Clip Editor (2 fase: input link → editor) ────────────────────────────────

function ClipEditor({ addToast }: { addToast: (msg: string, type: ToastType) => void }) {
  const [phase, setPhase] = useState<'input' | 'editor'>('input')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [statusText, setStatusText] = useState('')
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [clips, setClips] = useState<Clip[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const [vidId, setVidId] = useState('')
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const playerHostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const playerReadyRef = useRef(false)
  const pendingSeekRef = useRef<number | null>(null)
  const nextIdRef = useRef(1000)

  const activeClip = clips.find(c => c.id === selectedId) || null

  // ── YouTube IFrame API: buat player sekali per vidId, setelah editor tampil ──
  useEffect(() => {
    if (!vidId || phase !== 'editor') return
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
  }, [vidId, phase])

  // ── Ganti clip → seek tanpa reload iframe ──
  useEffect(() => {
    if (!vidId || !activeClip) return
    const t = activeClip.start
    setCurrentTime(t)
    if (playerReadyRef.current && playerRef.current?.seekTo) {
      playerRef.current.seekTo(t, true)
    } else {
      pendingSeekRef.current = t
    }
  }, [activeClip?.id, vidId])

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

  // ── Analisis: progress 0→100 + status text ──
  const handleAnalyze = async () => {
    const url = youtubeUrl.trim()
    if (!url) {
      addToast('Masukkan URL YouTube terlebih dahulu', 'error')
      return
    }
    setBusy(true)
    setProgress(0)
    setStatusText('Memulai download audio...')
    addToast('Memulai download audio...', 'info')

    // Progress simulasi: request asli gak streaming, jadi animasi 0→90
    let prog = 0
    const tick = setInterval(() => {
      prog = Math.min(90, prog + Math.random() * 4 + 1)
      setProgress(Math.round(prog))
    }, 400)

    try {
      const data = await API.downloadAudio(url)
      setVidId(data.vid_id)
      setStatusText('Menganalisis audio, mencari momen viral...')

      const moments = await API.analyze(data.filename, data.vid_id)
      setStatusText('Mengambil subtitle...')

      const rawMoments: any[] = moments.clips || []
      const newClips: Clip[] = rawMoments.map((m: any, i: number) => {
        const isKaget = !!m.tag_kaget
        const isLucu = (m.lucu_score || 0) >= 5
        const dur = Math.round((m.end || 0) - (m.start || 0))
        return {
          id: i,
          keyword: 'Moment terdeteksi',
          badge: isKaget ? '😱 KAGET' : isLucu ? '😂 LUCU' : '🔊 AUDIO',
          badgeType: isKaget ? 'kaget' : isLucu ? 'lucu' : 'audio',
          start: Math.round(m.start),
          end: Math.round(m.end),
          intensityScore: Math.round((m.intensity || 0) * 100),
          kagetScore: Math.round((m.kaget_score || 0) * 10),
          lucuScore: Math.round((m.lucu_score || 0) * 10),
          label: labelFor(dur),
          komentar: 'Moment terdeteksi dari analisis audio',
          transkrip: 'Video telah dianalisis oleh UniversalClip',
        }
      })

      if (newClips.length > 0) {
        // Keyword dari subtitle (omongan asli)
        try {
          const subRes = await API.subtitles(data.vid_id, rawMoments.map((m: any) => ({ start: m.start, end: m.end })))
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

        nextIdRef.current = newClips.length
        setClips(newClips)
        setSelectedId(newClips[0].id)
        clearInterval(tick)
        setProgress(100)
        setTimeout(() => {
          setBusy(false)
          setPhase('editor')
          setStatusText('')
          addToast(`Ditemukan ${newClips.length} moment!`, 'success')
        }, 400)
      } else {
        clearInterval(tick)
        setBusy(false)
        setPhase('input')
        setStatusText('')
        addToast('Tidak ada moment terdeteksi, coba video lain', 'info')
      }
    } catch (e) {
      clearInterval(tick)
      setBusy(false)
      setStatusText('')
      addToast(`Error: ${String(e).slice(0, 60)}`, 'error')
    }
  }

  // ── Kontrol player ──
  const togglePlay = () => {
    const p = playerRef.current
    if (!p || !activeClip) return
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
    if (!activeClip) return
    seekTo(activeClip.start)
    const p = playerRef.current
    if (p) p.pauseVideo()
  }

  // ── Split: potong clip aktif di posisi playhead ──
  const handleSplit = () => {
    if (!activeClip) return
    const t = Math.round(currentTime)
    if (t <= activeClip.start + 1 || t >= activeClip.end - 1) {
      addToast('Geser playhead dulu ke tengah clip', 'error')
      return
    }
    const left: Clip = { ...activeClip, end: t, label: labelFor(t - activeClip.start) }
    const right: Clip = {
      ...activeClip,
      id: nextIdRef.current++,
      start: t,
      label: labelFor(activeClip.end - t),
    }
    const idx = clips.findIndex(c => c.id === activeClip.id)
    const next = [...clips]
    next.splice(idx, 1, left, right)
    setClips(next)
    setSelectedId(right.id)
    seekTo(t)
    addToast('Clip di-split jadi 2!', 'success')
  }

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

  // ── FASE 1: Input Link + Progress ──
  if (phase === 'input') {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 20px' }}>
        <div className="card-base fade-in" style={{ padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎬</div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>Mulai Clip</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground)' }}>
              Masukkan link YouTube, UniversalClip akan otomatis mendeteksi momen viral-nya
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              LINK YOUTUBE
            </label>
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAnalyze() }}
              disabled={busy}
              style={{ width: '100%', padding: '13px 14px', fontSize: 14 }}
            />
          </div>

          <button
            className="btn-primary glow-purple"
            onClick={handleAnalyze}
            disabled={busy}
            style={{ width: '100%', padding: '14px', fontSize: 14 }}
          >
            {busy ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div className="spinner" style={{ width: 16, height: 16 }} />
                {statusText}
              </span>
            ) : '⬇️ Analisis Video'}
          </button>

          {/* Progress bar 0→100 */}
          {busy && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{statusText}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#a855f7' }}>{progress}%</span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: `${progress}%`, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── FASE 2: Editor ──
  if (!activeClip) return null

  const filteredClips = clips.filter(c => {
    const matchSearch = c.keyword.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || c.badgeType === filter || (filter === 'pendek' && duration(c) <= 30)
    return matchSearch && matchFilter
  })

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button
          className="btn-secondary"
          onClick={() => { setPhase('input'); setClips([]); setSelectedId(null); setVidId('') }}
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          ← Input Link Baru
        </button>
        <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{clips.length} clip terdeteksi</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 300px', gap: 16 }}>

        {/* ── LEFT: Clip List ── */}
        <div className="card-base" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
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
                onClick={() => setSelectedId(clip.id)}
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

        {/* ── CENTER: Video Player + Timeline ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card-base" style={{ overflow: 'hidden' }}>
            <div style={{ position: 'relative', background: '#000', borderRadius: '12px 12px 0 0' }}>
              <div ref={playerHostRef} style={{ width: '100%', aspectRatio: '16/9' }} />
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
            onSplit={handleSplit}
          />
        </div>

        {/* ── RIGHT: Detail & Download ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
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
                onClick={() => addToast('Download clip belum tersedia', 'info')}
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
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
