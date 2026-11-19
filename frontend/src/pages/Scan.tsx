import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { AnalysisCard } from '../components/AnalysisCard'
import { useToast } from '../components/Toast'
import { useAddMeal } from '../hooks/data'
import { api, ApiError, type AnalysisResult } from '../lib/api'
import { normalizeImageToJpeg } from '../lib/image'

export default function Scan() {
  const navigate = useNavigate()
  const toast = useToast()
  const addMeal = useAddMeal()

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [hint, setHint] = useState('')
  const [description, setDescription] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const jpeg = useRef<{ base64: string; mediaType: 'image/jpeg' } | null>(null)

  // Free the preview's object URL when it changes or the screen closes.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    // Reset so choosing the same photo again still fires `change`.
    e.target.value = ''
    if (!picked) return
    jpeg.current = null
    setFile(picked)
    // iOS: defer preview work until the gallery confirmation sheet has closed.
    window.setTimeout(() => setPreviewUrl(URL.createObjectURL(picked)), 0)
  }

  const analyze = async () => {
    const desc = description.trim()
    if (!desc && !file) return toast('📝 Add a photo or description first')
    setAnalyzing(true)
    try {
      if (file && !jpeg.current) {
        try {
          jpeg.current = await normalizeImageToJpeg(file)
        } catch {
          return toast('❌ Could not process that photo')
        }
      }
      const res = await api.analyze({
        description: desc || null,
        photo_hint: hint.trim() || null,
        image_base64: jpeg.current?.base64 ?? null,
        media_type: jpeg.current ? jpeg.current.mediaType : null,
      })
      setResult(res)
    } catch (e) {
      const tooBig = e instanceof ApiError && e.status === 413
      toast(tooBig ? '❌ Photo is too large' : '❌ Analysis failed. Try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const add = () => {
    if (!result) return
    const { tip: _tip, ...meal } = result
    addMeal.mutate(meal, {
      onSuccess: () => {
        toast(`✅ ${result.name} added!`)
        window.setTimeout(() => navigate('/'), 800)
      },
      onError: (e) => toast(`❌ ${e.message}`),
    })
  }

  return (
    <Screen id="screen-scan">
      <div className="scan-header" style={{ padding: '54px 24px 16px' }}>
        <button className="back-btn" onClick={() => navigate('/')} style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>←</button>
        <h2>Log a Meal</h2>
      </div>
      <div className="scan-body">
        <div className="camera-zone-wrapper">
          {/* A <label> for the hidden input is the reliable way to open the picker on iOS. */}
          <label htmlFor="fileInput" className={`camera-zone${previewUrl ? ' has-image' : ''}`}>
            {!previewUrl && (
              <div className="camera-placeholder">
                <div className="camera-icon">📷</div>
                <div className="camera-text">Tap to upload a photo</div>
                <div className="camera-sub">or describe your meal below</div>
              </div>
            )}
            {previewUrl && <img src={previewUrl} alt="Selected meal" style={{ display: 'block' }} />}
            {previewUrl && (
              <div className="camera-overlay" style={{ display: 'flex' }}>
                <div style={{ fontSize: 24 }}>🔄</div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: 14, marginTop: 8 }}>Change Photo</div>
              </div>
            )}
          </label>
          <input type="file" id="fileInput" accept="image/*" onChange={onFile} />
        </div>

        {previewUrl && (
          <div className="photo-hint-wrap" style={{ display: 'block' }}>
            <div className="photo-hint-label">Help the AI (optional)</div>
            <input className="photo-hint-input" type="text" placeholder="e.g. dal makhani, home-cooked biryani, about 1 cup..."
              maxLength={200} value={hint} onChange={(e) => setHint(e.target.value)} />
          </div>
        )}

        <div className="or-divider">
          <div className="or-line" />
          <span>or describe it</span>
          <div className="or-line" />
        </div>

        <textarea className="food-text-input" maxLength={1000}
          placeholder="e.g. Grilled chicken breast with rice and broccoli, about 200g of chicken..."
          value={description} onChange={(e) => setDescription(e.target.value)} />

        <button className="analyze-btn" onClick={analyze} disabled={analyzing}>
          <span>✨</span> Analyze with AI
        </button>

        <div>{result && <AnalysisCard result={result} adding={addMeal.isPending} onAdd={add} />}</div>
      </div>

      {createPortal(
        <div className={`loading-overlay${analyzing ? ' active' : ''}`}>
          <div className="loader-ring" />
          <div className="loading-text">Analyzing your meal...</div>
          <div className="loading-sub">AI is calculating nutrition</div>
        </div>,
        document.body,
      )}
    </Screen>
  )
}
