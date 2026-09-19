import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePalat } from '../store/store.jsx'
import { askAbout } from '../lib/api.js'
import Avatar from '../components/Avatar.jsx'

/**
 * A bounded question box, not a chat thread. Suggestions rather than an empty
 * cursor: an empty box next to a medical profile invites medical questions,
 * while chips steer people to the thing Palat can actually answer.
 */
export default function Ask() {
  const { family, history, listFor, activeId, setActiveId } = usePalat()
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [reply, setReply] = useState(null)
  const [asked, setAsked] = useState('')
  const [error, setError] = useState('')

  const person = family.find((p) => p.id === activeId) || family[0]

  // Built from what this family actually has — no API call to suggest them.
  const suggestions = useMemo(() => {
    if (!person) return []
    const mine = history.filter((h) => h.verdicts?.[person.id])
    const out = [`What can ${person.name} have?`]

    if (mine.length) out.push(`What did ${person.name} avoid this week?`)

    const flag = mine
      .filter((h) => h.verdicts[person.id] === 'NO')
      .flatMap((h) => h.flags || [])[0]
    if (flag) out.push(`Why is ${flag} a problem?`)

    const listed = listFor(person.id)
    if (listed.length) out.push(`Is ${listed[0].name} okay for ${person.name}?`)
    else out.push(`Is poha okay for ${person.name}?`)

    return out.slice(0, 4)
  }, [person, history, listFor])

  async function send(text) {
    const q = (text ?? question).trim()
    if (!q || !person) return
    setError('')
    setBusy(true)
    setReply(null)
    setAsked(q)
    try {
      const answer = await askAbout({ question: q, person, history, cart: listFor(person.id) })
      setReply(answer)
      setQuestion('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!family.length) {
    return (
      <div className="page">
        <h1 className="page-title">Ask</h1>
        <Link to="/family" className="empty empty--link">
          <strong>Set up the family first.</strong>
          <span>Palat answers about a particular person, so it needs to know one.</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="page page--ask">
      <header className="page-head">
        <h1 className="page-title">Ask</h1>
      </header>
      <p className="page-sub">
        Food questions about one person, answered from their profile and the
        packets you have already scanned.
      </p>

      <div className="ptabs">
        {family.map((p) => (
          <button
            key={p.id}
            className={'ptab' + (p.id === person.id ? ' ptab--on' : '')}
            onClick={() => {
              setActiveId(p.id)
              setReply(null)
              setAsked('')
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="composer">
        <textarea
          className="composer-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          placeholder={`Ask about ${person.name}…`}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <div className="composer-row">
          <button
            type="button"
            className="primary"
            disabled={busy || !question.trim()}
            onClick={() => send()}
          >
            {busy ? 'Thinking…' : 'Ask'}
          </button>
        </div>
      </div>

      <div className="chips">
        {suggestions.map((s) => (
          <button key={s} type="button" className="chip" disabled={busy} onClick={() => send(s)}>
            {s}
          </button>
        ))}
      </div>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      {busy ? (
        <p className="asking">
          <span className="status-dot" /> Working it out for {person.name}…
        </p>
      ) : null}

      {reply && !busy ? (
        <section className={'reply' + (reply.kind === 'redirected' ? ' reply--redirect' : '')}>
          <p className="reply-q">
            <Avatar person={person} size={26} />
            {asked}
          </p>

          <p className="reply-a">{reply.answer}</p>

          {reply.hindi ? (
            <p className="reply-hindi" lang="hi">
              {reply.hindi}
            </p>
          ) : null}

          {reply.basedOn?.length ? (
            <ul className="flags">
              {reply.basedOn.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <p className="disclaimer">
        Palat answers about food, from labels it has read. It does not diagnose,
        never touches medication or doses, and cannot act on a blood sugar or BP
        reading — anything like that goes to your doctor, including at 10pm.
      </p>
    </div>
  )
}
