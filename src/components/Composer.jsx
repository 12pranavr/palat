import { useRef, useState } from 'react'
import { prepareImage } from '../lib/image.js'
import { avatarFor } from '../store/store.jsx'
import { summarise } from '../data/profiles.js'
import { describeUpdate } from '../lib/memory.js'
import Avatar from './Avatar.jsx'

const EXAMPLES = [
  'Dadaji, 72, diabetes and BP, takes metformin. Mummy, BP. Chotu, six.',
  'my brother wants to lose weight, he is around 89 kg',
  'nani ko sugar aur BP dono hai, insulin leti hain',
]

/**
 * One box that takes whatever you say, plus a prescription if you have one.
 * It only asks a question back when the answer would genuinely change how food
 * is judged — most of the time it just shows you the cards.
 */
export default function Composer({
  onRead, draft, onKeep, onDiscard, startIndex,
  applied = [], onConfirmUpdate, onRejectUpdate,
}) {
  const [text, setText] = useState('')
  const [image, setImage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [replies, setReplies] = useState({})
  const fileInput = useRef(null)

  const canSend = (text.trim() || image) && !busy

  async function send(answers) {
    setError('')
    setBusy(true)
    try {
      await onRead({ text: text.trim(), image, answers })
      // The prescription has been read. It is not kept anywhere.
      setImage(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function attach(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    try {
      const prepared = await prepareImage(file)
      setImage(prepared)
    } catch (err) {
      setError(err.message)
    }
  }

  function answerAll() {
    const answers = draft.clarify
      .map((q) => ({ ...q, answer: (replies[q.question] || '').trim() }))
      .filter((q) => q.answer)
    if (!answers.length) return
    setReplies({})
    send(answers)
  }

  function startOver() {
    setText('')
    setImage(null)
    setReplies({})
    onDiscard()
  }

  return (
    <section className="block">
      <div className="block-head">
        <h2>Who should Palat know about?</h2>
      </div>
      <p className="block-sub">
        No form. Say it the way you would tell a neighbour — a name, roughly how
        old, what they have or what they are trying to do. Hindi, English, or both
        in one sentence.
      </p>

      {!draft ? (
        <>
          <div className="composer">
            <textarea
              className="composer-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder={EXAMPLES[0]}
              disabled={busy}
            />

            {image ? (
              <div className="attached">
                <img src={image.dataUrl} alt="The prescription you attached" />
                <div className="attached-text">
                  <strong>Prescription attached</strong>
                  <span>Read once, then discarded. Only what you confirm is saved.</span>
                </div>
                <button
                  type="button"
                  className="cart-remove"
                  onClick={() => setImage(null)}
                  aria-label="Remove the prescription"
                >
                  ✕
                </button>
              </div>
            ) : null}

            <div className="composer-row">
              <button
                type="button"
                className="primary"
                disabled={!canSend}
                onClick={() => send()}
              >
                {busy ? 'Reading…' : 'Read this'}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                {image ? 'Replace prescription' : 'Add a prescription'}
              </button>
            </div>
          </div>

          <div className="examples">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                type="button"
                className="example"
                disabled={busy}
                onClick={() => setText(e)}
              >
                “{e}”
              </button>
            ))}
          </div>
        </>
      ) : null}

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {draft ? (
        <div className="draft">
          {draft.note ? <p className="draft-note">{draft.note}</p> : null}

          {draft.readPrescription ? (
            <p className="draft-note draft-note--ok">
              Read from the prescription. Check every line below — handwriting gets
              misread, and a wrong drug name is worse than none.
            </p>
          ) : null}

          {applied.length ? (
            <div className="memo">
              <p className="memo-head">Updated</p>
              {applied.map((a, i) => (
                <p key={i} className="memo-line">
                  <strong>{a.name}</strong> — {a.lines.join(', ')}
                </p>
              ))}
            </div>
          ) : null}

          {draft.updates?.length ? (
            <div className="gate">
              <p className="gate-head">Check this before Palat changes it</p>
              {draft.updates.map((u, i) => (
                <div key={i} className="gate-card">
                  <p className="gate-what">
                    <strong>{u.personName}</strong> — {describeUpdate(u).join(', ')}
                  </p>
                  <div className="composer-row">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => onConfirmUpdate(u)}
                    >
                      Yes, change it
                    </button>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => onRejectUpdate(u)}
                    >
                      leave it as it is
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {draft.people.length ? (
            <>
              <p className="parsed-head">
                Heard {draft.people.length === 1 ? 'one person' : draft.people.length + ' people'}
              </p>
              {draft.people.map((p, i) => (
                <div key={i} className="parsed-card">
                  <Avatar person={{ ...p, avatar: avatarFor(startIndex + i) }} size={38} />
                  <div>
                    <strong>{p.name}</strong>
                    <span>{summarise(p)}</span>
                    {p.conditions?.length && p.goals?.length ? (
                      <span>Trying to {p.goals.join(', ')}</span>
                    ) : null}
                    {p.medications?.length ? <span>Takes {p.medications.join(', ')}</span> : null}
                    {p.notes ? <span>{p.notes}</span> : null}
                  </div>
                </div>
              ))}
            </>
          ) : (
            applied.length || draft.updates?.length ? null : (
              <p className="parsed-head">No names in that.</p>
            )
          )}

          {draft.clarify?.length ? (
            <div className="clarify">
              {draft.clarify.map((q) => (
                <label key={q.question} className="clarify-q">
                  <span>{q.question}</span>
                  <input
                    value={replies[q.question] || ''}
                    onChange={(e) =>
                      setReplies((r) => ({ ...r, [q.question]: e.target.value }))
                    }
                    placeholder="a few words is enough"
                    disabled={busy}
                  />
                </label>
              ))}
              <div className="composer-row">
                <button
                  type="button"
                  className="primary"
                  disabled={busy || !draft.clarify.some((q) => (replies[q.question] || '').trim())}
                  onClick={answerAll}
                >
                  {busy ? 'Reading…' : 'Answer'}
                </button>
                <span className="clarify-skip">or add them as they are below</span>
              </div>
            </div>
          ) : null}

          <div className="composer-row">
            {draft.people.length ? (
              <button type="button" className="primary" disabled={busy} onClick={onKeep}>
                Add {draft.people.length === 1 ? 'this person' : 'these ' + draft.people.length}
              </button>
            ) : (
              <button type="button" className="primary" disabled={busy} onClick={startOver}>
                Done
              </button>
            )}
            {draft.people.length ? (
              <button type="button" className="linkish" onClick={startOver} disabled={busy}>
                start over
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <input ref={fileInput} type="file" accept="image/*" onChange={attach} hidden />
    </section>
  )
}
