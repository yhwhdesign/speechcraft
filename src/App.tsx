/**
 * SpeechCraft UI.
 *
 * Three steps, one direction: start → details → draft. The free tier shows
 * three opening lines; the paid tier unlocks the body, the close, cue cards and
 * the read-aloud timer. Nothing is stored anywhere except localStorage, so the
 * demo works with no account and no backend.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  OCCASIONS,
  buildDraft,
  draftToText,
  formatDuration,
  type Draft,
  type SpeechInput,
  type Tone,
} from './engine'

type Step = 'start' | 'details' | 'draft'

const EMPTY: SpeechInput = {
  occasion: 'best-man',
  speaker: '',
  honoree: '',
  partner: '',
  relationship: '',
  trait: '',
  memories: ['', '', ''],
  tone: 'balanced',
  minutes: 2,
}

const TONES: { id: Tone; label: string; blurb: string }[] = [
  { id: 'funny', label: 'Funny', blurb: 'Laughs, then a turn' },
  { id: 'balanced', label: 'Balanced', blurb: 'Warm with a joke' },
  { id: 'heartfelt', label: 'Heartfelt', blurb: 'No jokes, all feeling' },
]

// v2: bumped when this became a standalone app, so a leftover draft from the
// earlier multi-product build at the same localhost origin is not restored.
const STORAGE = 'speechcraft.v2'

interface Saved {
  input: SpeechInput
  draft: Draft | null
  unlocked: boolean
}

/**
 * Read once at module load and hydrate with lazy initialisers. Restoring in an
 * effect races with the save effect on first mount, which would wipe the saved
 * speech before it is read back.
 */
function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE)
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
}

const SAVED = readSaved()

export default function App() {
  const [step, setStep] = useState<Step>(() => (SAVED?.draft ? 'draft' : 'start'))
  const [input, setInput] = useState<SpeechInput>(() => ({ ...EMPTY, ...SAVED?.input }))
  const [draft, setDraft] = useState<Draft | null>(() => SAVED?.draft ?? null)
  const [unlocked, setUnlocked] = useState(() => SAVED?.unlocked ?? false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ input, draft, unlocked }))
    } catch {
      /* private mode / quota — the app still works without persistence */
    }
  }, [input, draft, unlocked])

  const set = <K extends keyof SpeechInput>(key: K, value: SpeechInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }))

  const setMemory = (index: number, value: string) =>
    setInput((prev) => {
      const memories = [...prev.memories]
      memories[index] = value
      return { ...prev, memories }
    })

  function generate() {
    if (!input.honoree.trim() || !input.speaker.trim()) {
      setError('We need your name and the name of the person you are speaking about.')
      return
    }
    if (input.memories.filter((m) => m.trim()).length === 0) {
      setError('Add at least one memory — that is what makes the speech yours.')
      return
    }
    setError(null)
    setDraft(buildDraft(input))
    setStep('draft')
  }

  function reset() {
    setDraft(null)
    setStep('start')
    setError(null)
  }

  return (
    <div className="shell">
      <header className="topbar">
        <button className="brand" onClick={reset} type="button">
          <span className="mark" aria-hidden="true" />
          SpeechCraft
        </button>
        {step === 'draft' && (
          <button className="link" onClick={() => setStep('details')} type="button">
            Edit answers
          </button>
        )}
      </header>

      {step === 'start' && (
        <main className="page">
          <p className="eyebrow">Four minutes, not four hundred dollars</p>
          <h1>
            The speech is due.
            <br />
            You haven’t written it.
          </h1>
          <p className="lede">
            Answer a handful of questions and get a speech that sounds like you — not like a
            greeting card. Three openings are free.
          </p>

          <div className="tiles">
            {OCCASIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`tile ${input.occasion === o.id ? 'is-active' : ''}`}
                onClick={() => {
                  set('occasion', o.id)
                  setStep('details')
                }}
              >
                <strong>{o.label}</strong>
                <small>{o.blurb}</small>
              </button>
            ))}
          </div>

          <ul className="points">
            <li>Built from your memories, not generic filler.</li>
            <li>Read-aloud timer and printable cue cards.</li>
            <li>Nothing posted, nothing published, no account.</li>
          </ul>

          <p className="fineprint">
            SpeechCraft helps you write. You decide what you say, and you should always read it
            out loud before the day.
          </p>
        </main>
      )}

      {step === 'details' && (
        <main className="page">
          <button className="link back" onClick={() => setStep('start')} type="button">
            ← Change occasion
          </button>
          <h2>{OCCASIONS.find((o) => o.id === input.occasion)?.label} speech</h2>
          <p className="muted">
            The more specific you are, the less it sounds like a template. Names and small
            details do the work.
          </p>

          <div className="card">
            <label className="field">
              <span>Their name</span>
              <input
                type="text"
                value={input.honoree}
                onChange={(e) => set('honoree', e.target.value)}
                placeholder="Dan"
                autoComplete="off"
              />
            </label>

            <label className="field">
              <span>
                Your name <span className="hint">— used in the opening</span>
              </span>
              <input
                type="text"
                value={input.speaker}
                onChange={(e) => set('speaker', e.target.value)}
                placeholder="Mike"
                autoComplete="off"
              />
            </label>

            <label className="field">
              <span>
                Your relationship <span className="hint">— “younger brother”, “best friend”</span>
              </span>
              <input
                type="text"
                value={input.relationship}
                onChange={(e) => set('relationship', e.target.value)}
                placeholder="younger brother"
                autoComplete="off"
              />
            </label>

            {input.occasion !== 'eulogy' && input.occasion !== 'toast' && (
              <label className="field">
                <span>
                  Their partner’s name <span className="hint">— optional</span>
                </span>
                <input
                  type="text"
                  value={input.partner}
                  onChange={(e) => set('partner', e.target.value)}
                  placeholder="Sarah"
                  autoComplete="off"
                />
              </label>
            )}

            <label className="field">
              <span>
                One thing everyone knows about them{' '}
                <span className="hint">— a trait you can tease or praise</span>
              </span>
              <input
                type="text"
                value={input.trait}
                onChange={(e) => set('trait', e.target.value)}
                placeholder="he has never once been on time for anything"
                autoComplete="off"
              />
            </label>
          </div>

          <h3 className="section-title">Three memories</h3>
          <div className="card">
            {[0, 1, 2].map((i) => (
              <label className="field" key={i}>
                <span>
                  Memory {i + 1}{' '}
                  <span className="hint">{i === 0 ? '— how you met or grew up' : i === 1 ? '— something only you know' : '— an ordinary day'}</span>
                </span>
                <textarea
                  value={input.memories[i]}
                  onChange={(e) => setMemory(i, e.target.value)}
                  rows={2}
                  placeholder={
                    i === 0
                      ? 'We shared a bunk bed until I was fourteen and he never once let me have the top.'
                      : i === 1
                        ? 'He drove four hours to help me move and then pretended it was on the way.'
                        : 'The night before my exam he made me watch a terrible film until I stopped panicking.'
                  }
                />
              </label>
            ))}
          </div>

          <h3 className="section-title">Tone</h3>
          <div className="tiles three">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tile ${input.tone === t.id ? 'is-active' : ''}`}
                onClick={() => set('tone', t.id)}
              >
                <strong>{t.label}</strong>
                <small>{t.blurb}</small>
              </button>
            ))}
          </div>

          <h3 className="section-title">Length</h3>
          <div className="tiles three">
            {[1, 2, 3].map((m) => (
              <button
                key={m}
                type="button"
                className={`tile ${input.minutes === m ? 'is-active' : ''}`}
                onClick={() => set('minutes', m)}
              >
                <strong>{m} min</strong>
                <small>{m === 1 ? 'Short and safe' : m === 2 ? 'The sweet spot' : 'Story time'}</small>
              </button>
            ))}
          </div>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button className="btn btn-block" type="button" onClick={generate}>
            Write my openings — free
          </button>
        </main>
      )}

      {step === 'draft' && draft && (
        <DraftView
          input={input}
          draft={draft}
          unlocked={unlocked}
          onUnlock={() => setUnlocked(true)}
          onRegenerate={() => setDraft(buildDraft(input))}
          onRestart={reset}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function DraftView({
  input,
  draft,
  unlocked,
  onUnlock,
  onRegenerate,
  onRestart,
}: {
  input: SpeechInput
  draft: Draft
  unlocked: boolean
  onUnlock: () => void
  onRegenerate: () => void
  onRestart: () => void
}) {
  const [copied, setCopied] = useState<string | null>(null)
  const [remaining, setRemaining] = useState(draft.seconds)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  const fullText = useMemo(() => draftToText(draft), [draft])

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      /* clipboard blocked — the user can still select the text */
    }
  }

  return (
    <main className="page draft">
      <p className="eyebrow">
        {OCCASIONS.find((o) => o.id === input.occasion)?.label} · {formatDuration(draft.seconds)}{' '}
        spoken · {draft.words} words
      </p>

      <h2>Three ways to open</h2>
      <p className="muted">Pick the one that sounds most like you. It sets up everything after it.</p>

      <div className="stack">
        {draft.openers.map((opener, i) => (
          <div className="opener" key={i}>
            <p>{opener}</p>
            <button className="link" type="button" onClick={() => copy(`opener-${i}`, opener)}>
              {copied === `opener-${i}` ? 'Copied' : 'Copy line'}
            </button>
          </div>
        ))}
      </div>

      <h2 className="body-title">The speech</h2>

      {unlocked ? (
        <>
          <div className="speech-body">
            {draft.sections.map((section) => (
              <div key={section.label} className="speech-section">
                <p className="label">{section.label}</p>
                <p>{section.text}</p>
              </div>
            ))}
            <p className="speech-close">{draft.close}</p>
          </div>

          <div className="toolbar">
            <button className="btn btn-quiet" type="button" onClick={() => copy('all', fullText)}>
              {copied === 'all' ? 'Copied' : 'Copy full speech'}
            </button>
            <button className="btn btn-quiet" type="button" onClick={() => window.print()}>
              Print cue cards
            </button>
            <button
              className="btn btn-quiet"
              type="button"
              onClick={() => {
                setRemaining(draft.seconds)
                setRunning(true)
              }}
            >
              {running ? formatDuration(remaining) : 'Start timer'}
            </button>
            {running && (
              <button className="btn btn-quiet" type="button" onClick={() => setRunning(false)}>
                Pause
              </button>
            )}
          </div>

          {running && <p className="timer">{formatDuration(remaining)}</p>}

          <div className="cue-cards">
            {draft.sections.map((section) => (
              <div className="cue" key={section.label}>
                <p className="label">{section.label}</p>
                <p>{section.text}</p>
              </div>
            ))}
          </div>

          <div className="row end">
            <button className="link" type="button" onClick={onRegenerate}>
              Regenerate from my answers
            </button>
            <button className="link" type="button" onClick={onRestart}>
              Start a new speech
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="locked" aria-hidden="true">
            <p>
              {draft.sections[0]?.text.slice(0, 190)}… {draft.sections[1]?.text.slice(0, 120)}…
            </p>
          </div>

          <div className="paywall">
            <p className="eyebrow">Unlock the full speech</p>
            <h3>You’ve got the opening. The rest is written.</h3>
            <p className="muted">
              Full speech, three tone variations, unlimited edits, printable cue cards and the
              read-aloud timer.
            </p>

            <div className="prices">
              <button className="price-card" type="button" onClick={onUnlock}>
                <strong>$9.99</strong>
                <span>One speech, yours to keep</span>
              </button>
              <button className="price-card" type="button" onClick={onUnlock}>
                <strong>$19.99</strong>
                <span>Wedding party pack — up to 5 speakers</span>
              </button>
            </div>

            <p className="muted tiny">
              Secure checkout. No subscription, no account, no renewals.
            </p>
          </div>
        </>
      )}
    </main>
  )
}
