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

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function duration(clip: Clip): number {
  return clip.end - clip.start
}

// ─── API Service ─────────────────────────────────────────────────────────────

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
      return data.videos?.map((v: any, i: number) => ({
        id: i,
        format: i % 2 === 0 ? 'Short' : 'Normal',
        judul: v.title || 'Untitled',
        keyword: category,
        deskripsi: v.description || 'Video trending dari YouTube',
        hashtags: ['#viral', `#${category}`, '#youtube'],
        sumber: `youtube.com/watch?v=${v.id}`,
      })) || []
    } catch (e) {
      console.error('Trending API error:', e)
      return []
    }
  },
}

// ─── Toast System ─────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          style={{
            background: t.type === 'success' ? 'rgba(34,197,94,0.15)' : t.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.15)',
            border: t.type === 'success' ? '1px solid rgba(34,197,94,0.3)' : t.type === 'error' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(124,58,237,0.3)',
            borderRadius: 10,
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--foreground)',
            cursor: 'pointer',
          }}
        >
          <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ activeTab, setActiveTab, dark, setDark }: any) {
  return (
    <nav style={{
      background: 'rgba(11,11,16,0.85)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 60, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
          <span style={{ fontSize: 22 }}>📋</span>
          <span style={{ fontSize: 18, fontWeight: 800, background: 'linear-gradient(135deg, #a855f7, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            UniversalClip
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'home', label: '🏠 Home' },
            { id: 'clip', label: '🎬 Clip' },
            { id: 'riset', label: '💡 Riset' },
          ].map((t: any) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: activeTab === t.id ? 'rgba(124,58,237,0.08)' : 'none',
                border: activeTab === t.id ? '2px solid #a855f7' : '2px solid transparent',
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: activeTab === t.id ? 600 : 500,
                color: activeTab === t.id ? '#a855f7' : 'var(--muted-foreground)',
                cursor: 'pointer',
                borderRadius: '8px 8px 0 0',
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
              color: 'var(--foreground)',
            }}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  )
}

// ─── Home Page ────────────────────────────────────────────────────────────────

function HomePage({ setActiveTab }: any) {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, marginBottom: 20, lineHeight: 1.1 }}>
        Selamat Datang di{' '}
        <span style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          UniversalClip
        </span>
      </h1>

      <p style={{ fontSize: 'clamp(16px, 2.5vw, 22px)', color: 'var(--muted-foreground)', marginBottom: 48, maxWidth: 600, lineHeight: 1.6 }}>
        Auto-clip & riset konten YouTube <strong style={{ color: 'var(--foreground)' }}>powered by AI</strong>
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 48 }}>
        <button className="btn-primary" onClick={() => setActiveTab('clip')} style={{ padding: '16px 36px', fontSize: 16 }}>
          🎬 Mulai Clip
        </button>
        <button className="btn-secondary" onClick={() => setActiveTab('riset')} style={{ padding: '16px 36px', fontSize: 16 }}>
          💡 Riset Konten
        </button>
      </div>
    </div>
  )
}

// ─── CapCut Timeline Editor ────────────────────────────────────────────────────

function TimelineEditor({ clip, onUpdate }: { clip: Clip; onUpdate: (start: number, end: number) => void }) {
  const totalDuration = clip.end - clip.start
  const trackRef = useRef<HTMLDivElement>(null)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(100)
  const [playhead, setPlayhead] = useState(0)
  const [playing, setPlaying] = useState(false)
  const dragging = useRef<'left' | 'right' | null>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    if (!playing) return
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000
      const range = (trimEnd - trimStart) / 100 * totalDuration
      const pct = (elapsed / range) * (trimEnd - trimStart)
      if (trimStart + pct >= trimEnd) {
        setPlayhead(trimStart)
        setPlaying(false)
        return
      }
      setPlayhead(trimStart + pct)
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [playing, trimStart, trimEnd, totalDuration])

  const getPct = (e: React.MouseEvent) => {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    return Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
  }

  const onMouseDown = (handle: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = handle
    const onMove = (ev: MouseEvent) => {
      const pct = getPct(ev as any)
      if (handle === 'left') setTrimStart(Math.min(pct, trimEnd - 5))
      if (handle === 'right') setTrimEnd(Math.max(pct, trimStart + 5))
    }
    const onUp = () => {
      dragging.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const startSec = clip.start + (trimStart / 100) * totalDuration
  const endSec = clip.start + (trimEnd / 100) * totalDuration

  return (
    <div style={{ background: '#13131d', border: '1px solid #252538', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#e8e8ef', flex: 1 }}>✂️ Manual Timeline</span>
        <button
          onClick={() => setPlaying(!playing)}
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
      </div>

      <div ref={trackRef} style={{ width: '100%', height: 48, background: '#0b0b10', borderRadius: 8, position: 'relative', userSelect: 'none' }}>
        {/* Purple range */}
        <div style={{ position: 'absolute', left: `${trimStart}%`, width: `${trimEnd - trimStart}%`, top: 0, bottom: 0, background: 'rgba(124,58,237,0.3)', border: '2px solid #7c3aed', borderRadius: 6, pointerEvents: 'none' }} />

        {/* Left handle */}
        <div onMouseDown={onMouseDown('left')} style={{ position: 'absolute', left: `${trimStart}%`, transform: 'translateX(-50%)', top: 0, width: 20, height: 48, background: '#7c3aed', borderRadius: '6px 2px 2px 6px', cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
          <span style={{ color: '#fff', fontSize: 10 }}>◀</span>
        </div>

        {/* Right handle */}
        <div onMouseDown={onMouseDown('right')} style={{ position: 'absolute', left: `${trimEnd}%`, transform: 'translateX(-50%)', top: 0, width: 20, height: 48, background: '#7c3aed', borderRadius: '2px 6px 6px 2px', cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
          <span style={{ color: '#fff', fontSize: 10 }}>▶</span>
        </div>

        {/* Playhead */}
        <div style={{ position: 'absolute', left: `${playhead}%`, top: 0, bottom: 0, width: 3, background: '#ef4444', zIndex: 4, transform: 'translateX(-50%)', borderRadius: 2 }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#8888a0' }}>
        <span>{formatTime(Math.round(startSec))}</span>
        <span>Durasi: {Math.round(endSec - startSec)}s</span>
        <span>{formatTime(Math.round(endSec))}</span>
      </div>
    </div>
  )
}

// ─── Clip Editor ──────────────────────────────────────────────────────────────

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
    transkrip: 'Dan tiba-tiba... WAH! Kucing itu melompat keluar dari balik lemari!',
  },
]

function ClipEditor({ addToast }: any) {
  const [selectedClip, setSelectedClip] = useState<Clip>(MOCK_CLIPS[0])

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 300px', gap: 16 }}>
        {/* LEFT */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--muted-foreground)' }}>📋 Daftar Clip</h3>
          {MOCK_CLIPS.map((clip) => (
            <div
              key={clip.id}
              onClick={() => setSelectedClip(clip)}
              style={{
                background: selectedClip.id === clip.id ? 'rgba(124,58,237,0.12)' : 'var(--muted)',
                border: `1px solid ${selectedClip.id === clip.id ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: '10px 12px',
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{clip.keyword}</div>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                {formatTime(clip.start)} – {formatTime(clip.end)} · {duration(clip)}s
              </div>
            </div>
          ))}
        </div>

        {/* CENTER */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ background: '#000', borderRadius: 12, width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <span style={{ color: '#666' }}>🎥 Video Player</span>
          </div>
          <TimelineEditor clip={selectedClip} onUpdate={() => {}} />
        </div>

        {/* RIGHT */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700 }}>📊 Detail</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div>Start: {formatTime(selectedClip.start)}</div>
            <div>End: {formatTime(selectedClip.end)}</div>
            <div>Durasi: {duration(selectedClip)}s</div>
            <div style={{ marginTop: 8 }}>Keyword: <strong>{selectedClip.keyword}</strong></div>
          </div>
          <button className="btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={() => addToast('✅ Downloaded!', 'success')}>
            ⬇ Download Clip
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Riset Konten ─────────────────────────────────────────────────────────────

function RisetKonten({ addToast }: any) {
  const [kategori, setKategori] = useState('gaming')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<IdeKonten[]>([])

  const KATEGORI_OPTIONS = [
    { value: 'gaming', label: 'Gaming 🎮' },
    { value: 'berita', label: 'Berita 📰' },
    { value: 'anime', label: 'Anime ⚔️' },
    { value: 'cerita', label: 'Cerita 📖' },
    { value: 'sejarah', label: 'Sejarah 🏛️' },
    { value: 'lucu', label: 'Video Lucu 😂' },
  ]

  const generate = async () => {
    setLoading(true)
    addToast('Menganalisis konten dari YouTube...', 'info')
    try {
      const data = await API.trending(kategori)
      setResults(data)
      addToast(`✅ Ditemukan ${data.length} ide konten!`, 'success')
    } catch (e) {
      addToast('❌ Gagal fetch konten', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#a855f7' }}>💡 LANGKAH 1 — Pilih Kategori</h2>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Kategori</label>
          <select value={kategori} onChange={e => setKategori(e.target.value)} style={{ width: '100%' }}>
            {KATEGORI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <button className="btn-primary" onClick={generate} disabled={loading} style={{ width: '100%' }}>
          {loading ? '⏳ Menganalisis...' : '✨ Generate Riset Konten'}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
          {results.map((ide, i) => (
            <div key={ide.id} style={{ marginBottom: i < results.length - 1 ? 24 : 0, paddingBottom: i < results.length - 1 ? 24 : 0, borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>#{i + 1}</span>
                <span style={{ background: ide.format === 'Short' ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.15)', color: ide.format === 'Short' ? '#f87171' : '#a855f7', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>
                  {ide.format === 'Short' ? '📱 Short' : '🎬 Normal'}
                </span>
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700 }}>{ide.judul}</h3>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                {ide.deskripsi}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ide.hashtags.map(h => (
                  <span key={h} style={{ background: 'rgba(124,58,237,0.1)', color: '#a855f7', borderRadius: 4, padding: '4px 10px', fontSize: 11 }}>
                    {h}
                  </span>
                ))}
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', transition: 'all 0.3s ease' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} dark={dark} setDark={setDark} />

      <main>
        {activeTab === 'home' && <HomePage setActiveTab={setActiveTab} />}
        {activeTab === 'clip' && <ClipEditor addToast={addToast} />}
        {activeTab === 'riset' && <RisetKonten addToast={addToast} />}
      </main>

      <ToastContainer toasts={toasts} onDismiss={(id: number) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  )
}
