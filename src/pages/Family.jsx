import { useState } from 'react'
import { usePalat, avatarFor, newId } from '../store/store.jsx'
import { summarise } from '../data/profiles.js'
import { parseFamily } from '../lib/api.js'
import { splitUpdate, toPatch, describeUpdate } from '../lib/memory.js'
import Avatar from '../components/Avatar.jsx'
import PersonForm from '../components/PersonForm.jsx'
import Composer from '../components/Composer.jsx'

export default function Family() {
  const { family, addPerson, updatePerson, removePerson } = usePalat()
  const [editing, setEditing] = useState(null)

  // Everything about adding someone lives in the composer below.
  const [draft, setDraft] = useState(null)
  const [applied, setApplied] = useState([])

  async function read({ text, image, answers }) {
    const result = await parseFamily({ text, image, answers, existing: family })

    // Changes that can only make Palat more careful go in straight away; the
    // rest wait for a tap. See lib/memory.js for where that line is drawn.
    const gatedUpdates = []
    const appliedNow = []

    for (const update of result.updates || []) {
      const person = family.find((p) => p.id === update.personId)
      if (!person) continue
      const { silent, gated } = splitUpdate(update)
      if (silent) {
        updatePerson(person.id, toPatch(person, silent))
        appliedNow.push({ name: person.name, lines: describeUpdate(silent) })
      }
      if (gated) gatedUpdates.push(gated)
    }

    setApplied(appliedNow)
    setDraft({ ...result, updates: gatedUpdates, text })
    return result
  }

  function confirmUpdate(update) {
    const person = family.find((p) => p.id === update.personId)
    if (person) updatePerson(person.id, toPatch(person, update))
    setDraft((d) => ({
      ...d,
      updates: d.updates.filter((u) => u !== update),
    }))
  }

  function rejectUpdate(update) {
    setDraft((d) => ({ ...d, updates: d.updates.filter((u) => u !== update) }))
  }

  function keep() {
    draft.people.forEach((p, i) =>
      addPerson({
        ...p,
        id: newId(),
        avatar: avatarFor(family.length + i),
      })
    )
    setDraft(null)
    setApplied([])
  }

  return (
    <div className="page page--family">
      <header className="page-head">
        <h1 className="page-title">Family</h1>
      </header>
      <p className="page-sub">
        Set up once. Every scan after this is checked against everyone here.
      </p>

      <Composer
        onRead={read}
        draft={draft}
        onKeep={keep}
        onDiscard={() => { setDraft(null); setApplied([]) }}
        applied={applied}
        onConfirmUpdate={confirmUpdate}
        onRejectUpdate={rejectUpdate}
        startIndex={family.length}
      />

      <section className="block">
        <div className="block-head">
          <h2>At home</h2>
          <span className="block-count">{family.length}</span>
        </div>

        {family.length === 0 ? (
          <p className="block-sub">Nobody here yet. Tell Palat about them above.</p>
        ) : null}

        <ul className="roster">
          {family.map((person) =>
            editing === person.id ? (
              <li key={person.id}>
                <PersonForm
                  person={person}
                  onCancel={() => setEditing(null)}
                  onSave={(patch) => {
                    updatePerson(person.id, patch)
                    setEditing(null)
                  }}
                />
              </li>
            ) : (
              <li key={person.id} className="roster-row">
                <Avatar person={person} size={44} />
                <div className="roster-text">
                  <strong>{person.name}</strong>
                  <span>{summarise(person)}</span>
                  {person.conditions?.length && person.goals?.length ? (
                    <span>Trying to {person.goals.join(', ')}</span>
                  ) : null}
                  {person.medications?.length ? (
                    <span className="roster-med">Takes {person.medications.join(', ')}</span>
                  ) : null}
                  {person.notes ? <span className="roster-note">{person.notes}</span> : null}
                </div>
                <div className="roster-actions">
                  <button type="button" className="ghost" onClick={() => setEditing(person.id)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="ghost ghost--danger"
                    onClick={() => {
                      if (confirm(`Remove ${person.name} from the family?`)) {
                        removePerson(person.id)
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      </section>

      <p className="disclaimer">
        Palat uses this only to read food labels against. It never comments on
        anyone's medication, never works out doses, and never decides how serious
        a condition is — that is your doctor's job. A prescription you add is read
        once and not kept; only the details you confirm are saved, on this device.
      </p>
    </div>
  )
}
