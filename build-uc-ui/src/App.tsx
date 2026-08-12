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

interface ViewerComment {
  time: number
  text: string
  likes: number
  author: string
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
  async comments(vid_id: string): Promise<any> {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vid_id }),
    })
    if (!res.ok) throw new Error('Komentar gagal')
    return res.json()
  },
  async downloadSegment(url: string, vid_id: string, start: number, end: number, title?: string): Promise<any> {
    const res = await fetch('/api/download-video-segment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, vid_id, start, end, title }),
    })
    if (!res.ok) throw new Error('Gagal download segment')
    return res.json()
  },
  async downloadProgress(jobId: string): Promise<any> {
    const res = await fetch(`/api/download-progress/${jobId}`)
    if (!res.ok) throw new Error('Gagal cek progress')
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

// ── Dropdown pilihan N detik sebelum (dipakai komentar & clip) ──
function SecPickDrop({ title, sec, onPick, onClear }: {
  title: string
  sec: number | null
  onPick: (n: number) => void
  onClear: () => void
}) {
  return (
    <div style={{
      background: '#1c1c22',
      border: '1px solid rgba(168,85,247,0.35)',
      borderRadius: 10,
      padding: 10,
      marginTop: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ color: '#fbbf24', fontWeight: 800, fontSize: 13 }}>!</span>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{title}</div>
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 8px 19px' }}>
        Ambil berapa detik sebelum momen?
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[5, 10, 15, 20, 25, 30].map(n => (
          <button
            key={n}
            className="btn-secondary"
            onClick={() => onPick(n)}
            style={{
              padding: '8px 0',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 999,
              background: sec === n ? 'rgba(168,85,247,0.35)' : '#2a2a33',
              border: `1px solid ${sec === n ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.14)'}`,
              color: '#fff',
            }}
          >
            {n}s sebelum
          </button>
        ))}
      </div>
      {/* Before / After tambahan 10 detik */}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button
          className="btn-secondary"
          onClick={() => onPick((sec || 10) + 10)}
          style={{ flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700, borderRadius: 8,
            background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa' }}
        >
          +10s before
        </button>
        <button
          className="btn-secondary"
          onClick={() => onPick(Math.max(5, (sec || 10) - 10))}
          style={{ flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700, borderRadius: 8,
            background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171' }}
        >
          -10s before
        </button>
      </div>
      {!sec && (
        <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: 4 }}>
          Tanpa pilih = clip asli
        </div>
      )}
    </div>
  )
}



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
  const [viewerComments, setViewerComments] = useState<ViewerComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const pollRef = useRef<number | null>(null)
  const [dlJob, setDlJob] = useState<{ percent: number; stage: string; status: string } | null>(null)
  const [commentHl, setCommentHl] = useState<{ start: number; end: number } | null>(null)
  const [commentDlTime, setCommentDlTime] = useState<number | null>(null)
  const [commentDlSec, setCommentDlSec] = useState<number | null>(null)
  const [clipDlSec, setClipDlSec] = useState<number | null>(null)
  const [openSecFor, setOpenSecFor] = useState<number | null>(null)
  const [openCmtFor, setOpenCmtFor] = useState<number | null>(null)

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
          onStateChange: (e: any) => {
            setPlaying(e.data === 1)
            // sinkron: nangkep seek dari native bar YT (pause/play/buffering semua kirim posisi)
            if (e.data === 1 || e.data === 2 || e.data === 3) {
              const t = playerRef.current?.getCurrentTime?.()
              if (typeof t === 'number') setCurrentTime(t)
            }
          },
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
    setCommentHl(null)
    setClipDlSec(null)
    if (playerReadyRef.current && playerRef.current?.seekTo) {
      playerRef.current.seekTo(t, true)
    } else {
      pendingSeekRef.current = t
    }
  }, [activeClip?.id, vidId])

  // ── Polling posisi player (selalu jalan, timeline selalu sinkron) ──
  useEffect(() => {
    if (!vidId || phase !== 'editor') return
    const id = setInterval(() => {
      const p = playerRef.current
      if (p && typeof p.getCurrentTime === 'function') {
        const t = p.getCurrentTime()
        setCurrentTime(t)
        // sinkron: saat pause & posisi di luar clip aktif → pindah ke clip yang berisi t
        if (!playing) {
          const c = clips.find(c => t >= c.start && t <= c.end)
          if (c && c.id !== activeClip?.id) setSelectedId(c.id)
        }
      }
    }, 200)
    return () => clearInterval(id)
  }, [vidId, phase, playing, clips, activeClip?.id])

  // ── Ambil komentar viewer (timestamp dari penonton) ──
  useEffect(() => {
    if (!vidId || phase !== 'editor') return
    setCommentsLoading(true)
    API.comments(vidId)
      .then(res => {
        setViewerComments(Array.isArray(res.comments) ? res.comments : [])
      })
      .catch(err => console.error('comments error:', err))
      .finally(() => setCommentsLoading(false))
  }, [vidId, phase])

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
        const st = Math.round(m.start || 0)
        const en = Math.round(m.end || 0)
        return {
          id: i,
          keyword: `Momen ${isKaget ? 'kaget' : isLucu ? 'lucu' : 'menarik'} di ${formatTime(st)}`,
          badge: isKaget ? '😱 KAGET' : isLucu ? '😂 LUCU' : '🔊 AUDIO',
          badgeType: isKaget ? 'kaget' : isLucu ? 'lucu' : 'audio',
          start: st,
          end: en,
          intensityScore: Math.round((m.intensity || 0) * 100),
          kagetScore: Math.round((m.kaget_score || 0) * 10),
          lucuScore: Math.round((m.lucu_score || 0) * 10),
          label: labelFor(dur),
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

  // seek tanpa auto-play (dipakai pas drag playhead / reset)
  const rawSeek = (t: number) => {
    const p = playerRef.current
    setCurrentTime(t)
    if (p && playerReadyRef.current) p.seekTo(t, true)
    else pendingSeekRef.current = t
  }

  // seek + auto-play: klik timeline/komentar langsung muter
  const seekTo = (t: number) => {
    rawSeek(t)
    const p = playerRef.current
    if (p && playerReadyRef.current) {
      p.playVideo()
      setPlaying(true)
    }
  }

  // ── Download range [start, end] (potong segmen via backend, polling progress) ──
  const downloadRange = async (start: number, end: number, title?: string) => {
    if (!vidId) return
    // job baru → berhentikan polling job lama (bisa download berikutnya sambil jalan)
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    setDownloading(true)
    setDlJob({ percent: 0, stage: 'Memulai...', status: 'processing' })

    const triggerDownload = (url: string, filename?: string) => {
      const a = document.createElement('a')
      a.href = url
      a.download = filename || ''
      document.body.appendChild(a)
      a.click()
      a.remove()
    }

    try {
      const res = await API.downloadSegment(youtubeUrl, vidId, start, end)
      if (res.status === 'done' && res.download_url) {
        setDlJob({ percent: 100, stage: 'Selesai', status: 'done' })
        triggerDownload(res.download_url, res.filename)
        addToast(`Download ${res.filename || 'clip'} dimulai!`, 'success')
        setDownloading(false)
        return
      }
      const poll = setInterval(async () => {
        try {
          const p = await API.downloadProgress(res.job_id)
          setDlJob(p)
          if (p.status === 'done') {
            clearInterval(poll); pollRef.current = null
            triggerDownload(p.download_url, p.filename)
            addToast(`Download ${p.filename || 'clip'} dimulai!`, 'success')
            setDownloading(false)
          } else if (p.status === 'error') {
            clearInterval(poll); pollRef.current = null
            addToast(`Download gagal: ${(p.error || p.stage || '').slice(0, 60)}`, 'error')
            setDownloading(false)
          }
        } catch (e) {
          clearInterval(poll); pollRef.current = null
          addToast('Gagal cek progress download', 'error')
          setDownloading(false)
        }
      }, 500)
      pollRef.current = poll
    } catch (e) {
      addToast(`Download gagal: ${String(e).slice(0, 60)}`, 'error')
      setDownloading(false)
    }
  }

  const handleDownloadClip = () => {
    if (!activeClip) return
    const title = activeClip.keyword || ''
    if (commentDlSec != null && commentDlTime != null) {
      downloadRange(Math.max(0, commentDlTime - commentDlSec), commentDlTime, title)
    } else if (clipDlSec != null) {
      downloadRange(Math.max(0, activeClip.start - clipDlSec), activeClip.end, title)
    } else {
      downloadRange(activeClip.start, activeClip.end, title)
    }
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
            {filter === 'komentar' ? (
              commentsLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13, padding: '24px 0' }}>
                  <div className="spinner" style={{ width: 16, height: 16, margin: '0 auto 8px' }} />
                  Mengambil komentar...
                </div>
              ) : viewerComments.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13, padding: '24px 0' }}>
                  Belum ada komentar dengan timestamp
                </div>
              ) : (
                <>
                {viewerComments.map((c, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                  <div
                    onClick={() => {
                      const wasOpen = openCmtFor === c.time
                      // play TEPAT di timestamp komentar (sinkron sama yang diklik)
                      seekTo(c.time)
                      setCurrentTime(c.time)
                      // highlight range = 30 detik sebelum → detik komentar
                      setCommentHl({ start: Math.max(0, c.time - 30), end: c.time })
                      // dropdown konteks: buka/tutup di bawah komentar ini
                      setOpenCmtFor(wasOpen ? null : c.time)
                      setCommentDlTime(c.time)
                      // pilihan konteks hanya berlaku per komentar — reset saat pindah
                      if (!wasOpen) setCommentDlSec(null)
                    }}
                    style={{
                      background: commentHl && c.time >= commentHl.start && c.time <= commentHl.end ? 'rgba(234,179,8,0.1)' : 'var(--muted)',
                      border: `1px solid ${commentHl && c.time >= commentHl.start && c.time <= commentHl.end ? 'rgba(234,179,8,0.4)' : 'var(--border)'}`,
                      borderRadius: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span className="pill" style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', fontSize: 11, fontWeight: 700 }}>
                        ⏱ {formatTime(c.time)}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>@{c.author}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted-foreground)', marginLeft: 'auto' }}>👍 {c.likes}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--foreground)', lineHeight: 1.5 }}>{c.text}</div>
                  </div>
                  {/* Dropdown konteks — muncul di bawah komentar yang diklik */}
                  {openCmtFor === c.time && (
                    <SecPickDrop
                      title={`Download clip dari komentar ${formatTime(c.time)}`}
                      sec={commentDlSec}
                      onPick={n => {
                        setCommentDlTime(c.time)
                        setCommentDlSec(n)
                        // dropdown tetap kebuka — ganti pilihan langsung klik tombol lain
                      }}
                      onClear={() => {
                        setCommentDlSec(null)
                        setCommentDlTime(null)
                        setOpenCmtFor(null)
                      }}
                    />
                  )}
                  </div>
                ))}
                </>
              )
            ) : (
              <>
                {filteredClips.map((clip, i) => (
                <div key={clip.id} style={{ marginBottom: 8 }}>
              <div
                onClick={() => {
                  const wasOpen = openSecFor === clip.id
                  setSelectedId(clip.id)
                  // klik clip = langsung buka dropdown konteks (toggle: klik lagi = tutup)
                  setOpenSecFor(wasOpen ? null : clip.id)
                  // pilihan konteks hanya berlaku per clip — reset saat PINDAH ke clip lain
                  if (!wasOpen) setClipDlSec(prev => (prev != null ? null : prev))
                }}
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
              {/* Dropdown konteks — muncul di bawah clip yang diklik */}
              {openSecFor === clip.id && (
                <SecPickDrop
                  title="Download clip dengan konteks sebelum momen"
                  sec={clipDlSec}
                  onPick={n => setClipDlSec(n)}
                  onClear={() => {
                    setClipDlSec(null)
                    setOpenSecFor(null)
                  }}
                />
              )}
                </div>
              ))}
              </>
            )}
            {filter !== 'komentar' && filteredClips.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13, padding: '24px 0' }}>
                Tidak ada clip ditemukan
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: Video Player ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card-base" style={{ overflow: 'hidden' }}>
            <div style={{ position: 'relative', background: '#000', borderRadius: '12px 12px 0 0' }}>
              <div ref={playerHostRef} style={{ width: '100%', aspectRatio: '16/9' }} />
            </div>
            {/* Strip highlight: range yang bakal di-download (konteks 5-30s + clip) */}
            <div style={{ padding: '10px 14px 12px' }}>
              <div style={{ position: 'relative', height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 5, overflow: 'hidden' }}>
                {(() => {
                  // range yang bakal didownload
                  const dlStart = commentDlSec != null && commentDlTime != null
                    ? Math.max(0, commentDlTime - commentDlSec)
                    : clipDlSec != null
                      ? Math.max(0, activeClip.start - clipDlSec)
                      : activeClip.start
                  const dlEnd = commentDlSec != null && commentDlTime != null
                    ? commentDlTime
                    : activeClip.end
                  const span = Math.max(1, dlEnd - dlStart)
                  // posisi relatif clip di dalam range
                  const cs = Math.max(0, ((activeClip.start - dlStart) / span) * 100)
                  const ce = Math.min(100, ((activeClip.end - dlStart) / span) * 100)
                  // playhead relatif
                  const ph = Math.min(100, Math.max(0, ((currentTime - dlStart) / span) * 100))
                  const hasCtx = (clipDlSec != null) || (commentDlSec != null && commentDlTime != null)
                  return (
                    <>
                      {/* seluruh range download = kuning kalau ada konteks */}
                      {hasCtx && <div style={{ position: 'absolute', inset: 0, background: 'rgba(251,191,36,0.25)' }} />}
                      {/* clip aktif = ungu */}
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${cs}%`, width: `${Math.max(1, ce - cs)}%`, background: 'rgba(168,85,247,0.65)' }} />
                      {/* playhead merah */}
                      <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${ph}%`, width: 3, background: '#ef4444', borderRadius: 2, zIndex: 2 }} />
                    </>
                  )
                })()}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--muted-foreground)' }}>
                {(() => {
                  const dlStart = commentDlSec != null && commentDlTime != null
                    ? Math.max(0, commentDlTime - commentDlSec)
                    : clipDlSec != null
                      ? Math.max(0, activeClip.start - clipDlSec)
                      : activeClip.start
                  const dlEnd = commentDlSec != null && commentDlTime != null
                    ? commentDlTime
                    : activeClip.end
                  const hasCtx = (clipDlSec != null) || (commentDlSec != null && commentDlTime != null)
                  return (
                    <>
                      <span style={{ color: hasCtx ? '#fbbf24' : 'var(--muted-foreground)' }}>
                        ⬇ {formatTime(dlStart)}
                      </span>
                      <span style={{ color: '#a855f7' }}>🎬 {formatTime(activeClip.start)} – {formatTime(activeClip.end)}</span>
                      <span>{formatTime(dlEnd)}</span>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
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
                  {(() => {
                    // komentar viewer asli yang timestamp-nya ada di range clip ini
                    const inRange = viewerComments.filter(c => c.time >= activeClip.start && c.time <= activeClip.end)
                    if (inRange.length === 0) {
                      return 'Belum ada komentar viewer di range clip ini'
                    }
                    const top = [...inRange].sort((a, b) => b.likes - a.likes)[0]
                    return `${formatTime(top.time)} · @${top.author}: "${top.text}" 👍${top.likes}`
                  })()}
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
                onClick={handleDownloadClip}
              >
                {downloading && dlJob ? (
                  <span style={{ display: 'block' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11 }}>{dlJob.stage || 'Memotong...'}</span>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{dlJob.percent}%</span>
                    </span>
                    <span className="progress-bar" style={{ height: 6, display: 'block' }}>
                      <span
                        className="progress-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, dlJob.percent || 0))}%`,
                          transition: 'width 0.3s ease',
                          display: 'block',
                        }}
                      />
                    </span>
                  </span>
                ) : downloading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div className="spinner" style={{ width: 14, height: 14 }} />
                    Memotong...
                  </span>
                ) : '⬇ Download Clip'}
              </button>
              {!downloading && clipDlSec != null && activeClip && (
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 8, textAlign: 'center', lineHeight: 1.5 }}>
                  Konteks: <span style={{ color: '#fbbf24', fontWeight: 600 }}>{clipDlSec}s sebelum</span> momen
                  ({formatTime(Math.max(0, activeClip.start - clipDlSec))} – {formatTime(activeClip.end)})
                </div>
              )}
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
