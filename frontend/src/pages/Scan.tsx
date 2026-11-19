import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { ArrowClockwise, Camera, Lightbulb, Plus, Sparkle, X } from '@phosphor-icons/react'
import { Screen } from '../components/Screen'
import { BackHeader } from '../components/BackHeader'
import { Field } from '../components/Field'
import { Segmented } from '../components/Segmented'
import { useToast } from '../components/Toast'
import { useAddMeal } from '../hooks/data'
import { api, ApiError, type AnalysisResult } from '../lib/api'
import { normalizeImageToJpeg } from '../lib/image'
import { haptic } from '../lib/haptics'

const STEPS = ['Looking at your meal…', 'Identifying ingredients…', 'Estimating the portion…', 'Calculating macros…']
const PORTIONS = [
  { value: '0.5', label: '½×' },
  { value: '1', label: '1×' },
  { value: '1.5', label: '1½×' },
  { value: '2', label: '2×' },
] as const
type Portion = (typeof PORTIONS)[number]['value']
const MAX_DESC = 1000

export default function Scan() {
  const navigate = useNavigate()
  const toast = useToast()
  const addMeal = useAddMeal()
  const descId = useId()

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [hint, setHint] = useState('')
  const [description, setDescription] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [portion, setPortion] = useState<Portion>('1')
  const jpeg = useRef<{ base64: string; mediaType: 'image/jpeg' } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLElement>(null)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
  useEffect(() => {
    if (!analyzing) return
    setStep(0)
    const t = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1400)
    return () => window.clearInterval(t)
  }, [analyzing])
  useEffect(() => {
    if (result) window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [result])

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    e.target.value = '' // choosing the same photo again still fires `change`
    if (!picked) return
    jpeg.current = null
    setResult(null)
    setFile(picked)
    // iOS: defer preview work until the photo picker sheet has closed.
    window.setTimeout(() => setPreviewUrl(URL.createObjectURL(picked)), 0)
  }
  const clearPhoto = () => {
    setFile(null)
    setPreviewUrl(null)
    setHint('')
    jpeg.current = null
  }

  const analyze = async () => {
    const desc = description.trim()
    if (!desc && !file) return toast('Add a photo or describe your meal first', { kind: 'info' })
    setAnalyzing(true)
    setResult(null)
    try {
      if (file && !jpeg.current) {
        try {
          jpeg.current = await normalizeImageToJpeg(file)
        } catch {
          return toast("Couldn't read that photo. Try another one.", { kind: 'error' })
        }
      }
      const res = await api.analyze({
        description: desc || null,
        photo_hint: hint.trim() || null,
        image_base64: jpeg.current?.base64 ?? null,
        media_type: jpeg.current ? jpeg.current.mediaType : null,
      })
      setPortion('1')
      setResult(res)
      haptic()
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 413 ? 'That photo is too large. Try a smaller one.'
        : e instanceof ApiError && e.status === 422 ? "Couldn't recognise a meal there. Add a short description and try again."
        : 'Analysis failed. Check your connection and try again.'
      toast(msg, { kind: 'error', action: { label: 'Retry', onClick: analyze } })
    } finally {
      setAnalyzing(false)
    }
  }

  const factor = Number(portion)
  const scaled = result && {
    name: result.name, emoji: result.emoji,
    calories: Math.round(result.calories * factor), protein: Math.round(result.protein * factor),
    carbs: Math.round(result.carbs * factor), fat: Math.round(result.fat * factor), fiber: Math.round((result.fiber || 0) * factor),
  }

  const add = () => {
    if (!scaled) return
    addMeal.mutate(scaled, {
      onSuccess: () => {
        haptic([10, 40, 10])
        toast(`${scaled.name} added to today`)
        navigate('/')
      },
      onError: (e) => toast(`Couldn't add the meal: ${e.message}`, { kind: 'error' }),
    })
  }

  return (
    <Screen id="screen-scan" label="Log a meal" nav>
      <BackHeader title="Log a meal" />

      {previewUrl ? (
        <div className="photo-preview">
          <img src={previewUrl} alt="Your meal photo" />
          <div className="photo-tools">
            <button className="icon-btn" onClick={() => fileInput.current?.click()} aria-label="Change photo"><ArrowClockwise size={20} weight="bold" aria-hidden /></button>
            <button className="icon-btn" onClick={clearPhoto} aria-label="Remove photo"><X size={20} weight="bold" aria-hidden /></button>
          </div>
        </div>
      ) : (
        // A <label> wrapping the input is the reliable way to open the picker on iOS.
        <label className="photo-drop">
          <span className="camera" aria-hidden><Camera size={32} weight="duotone" /></span>
          <strong>Take or choose a photo</strong>
          <span>Works best with the whole plate in frame</span>
          <input ref={fileInput} type="file" accept="image/*" onChange={onFile} aria-label="Take or choose a photo" />
        </label>
      )}
      {previewUrl && <input ref={fileInput} type="file" accept="image/*" onChange={onFile} hidden />}

      {previewUrl && (
        <Field label="What is it? (optional)" placeholder="e.g. dal makhani, about 1 cup" maxLength={200}
          value={hint} onChange={setHint} hint="A short hint helps the AI with home-cooked dishes." />
      )}

      <div className="divider">{previewUrl ? 'or add details' : 'or describe it'}</div>

      <div className="field">
        <label className="field-label" htmlFor={descId}>Describe your meal</label>
        <textarea id={descId} className="textarea" maxLength={MAX_DESC}
          placeholder="e.g. Grilled chicken breast with rice and broccoli, about 200 g of chicken"
          value={description} onChange={(e) => setDescription(e.target.value)} />
        {description.length > MAX_DESC * 0.8 && <span className="char-count num">{description.length}/{MAX_DESC}</span>}
      </div>

      <button className="btn btn-primary block" onClick={analyze} disabled={analyzing} aria-busy={analyzing}>
        <Sparkle size={20} weight="fill" aria-hidden /> Analyze with AI
      </button>

      {result && scaled && (
        <section ref={resultRef} className="card result" aria-label="Analysis result" tabIndex={-1}>
          <div className="result-head">
            <span className="meal-emoji" aria-hidden>{result.emoji || '🍽️'}</span>
            <h2>{result.name}</h2>
            <div className="result-kcal">
              <div className="v num">{scaled.calories}</div>
              <div className="u">KCAL</div>
            </div>
          </div>
          <div className="macro-tiles">
            {(['protein', 'carbs', 'fat', 'fiber'] as const).map((k) => (
              <div className={`macro-tile ${k}`} key={k}>
                <div className="v num">{scaled[k]}g</div>
                <div className="l">{k === 'fiber' ? 'Fibre' : k[0].toUpperCase() + k.slice(1)}</div>
              </div>
            ))}
          </div>
          <div className="portion">
            <span className="field-label">Portion</span>
            <Segmented label="Portion size" options={PORTIONS} value={portion} onChange={setPortion} />
          </div>
          {result.tip && (
            <div className="tip">
              <Lightbulb size={20} weight="fill" aria-hidden />
              <div><strong>Nutrition tip</strong>{result.tip}</div>
            </div>
          )}
          <div className="result-actions">
            <button className="btn btn-secondary" onClick={analyze} disabled={analyzing} aria-label="Analyze again"><ArrowClockwise size={20} weight="bold" aria-hidden /></button>
            <button className="btn btn-primary" onClick={add} disabled={addMeal.isPending} aria-busy={addMeal.isPending}>
              {addMeal.isPending ? <span className="spinner" aria-hidden /> : <Plus size={20} weight="bold" aria-hidden />} Add to today
            </button>
          </div>
        </section>
      )}

      {analyzing && createPortal(
        <div className="analyzing" role="alertdialog" aria-modal="true" aria-label="Analyzing your meal">
          <div className="pulse"><img src="/logo.png" alt="" width={84} height={84} /></div>
          <h2>Analyzing your meal</h2>
          <p aria-live="polite">{STEPS[step]}</p>
        </div>,
        document.body,
      )}
    </Screen>
  )
}
