import { useState } from 'react'

// Only reached from "Edit" on someone who already exists. Adding a person goes
// through the composer — nobody should have to fill a form to get started.

const listToText = (list) => (list || []).join(', ')
const textToList = (text) =>
  String(text || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

export default function PersonForm({ person, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: person?.name || '',
    age: person?.age ?? '',
    weightKg: person?.weightKg ?? '',
    conditions: listToText(person?.conditions),
    goals: listToText(person?.goals),
    medications: listToText(person?.medications),
    notes: person?.notes || '',
  })

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave({
      name: form.name.trim(),
      age: form.age === '' ? null : Number(form.age),
      weightKg: form.weightKg === '' ? null : Number(form.weightKg),
      conditions: textToList(form.conditions),
      goals: textToList(form.goals),
      medications: textToList(form.medications),
      notes: form.notes.trim(),
    })
  }

  return (
    <form className="pform" onSubmit={submit}>
      <div className="pform-grid">
        <label>
          <span>Name</span>
          <input value={form.name} onChange={set('name')} placeholder="Dadaji" autoFocus />
        </label>
        <label>
          <span>Age</span>
          <input value={form.age} onChange={set('age')} inputMode="numeric" placeholder="72" />
        </label>
        <label>
          <span>Weight</span>
          <input
            value={form.weightKg}
            onChange={set('weightKg')}
            inputMode="decimal"
            placeholder="kg"
          />
        </label>
      </div>
      <label>
        <span>Conditions</span>
        <input
          value={form.conditions}
          onChange={set('conditions')}
          placeholder="type 2 diabetes, high blood pressure"
        />
      </label>
      <label>
        <span>Trying to</span>
        <input value={form.goals} onChange={set('goals')} placeholder="lose weight" />
      </label>
      <label>
        <span>Medication</span>
        <input value={form.medications} onChange={set('medications')} placeholder="metformin" />
      </label>
      <label>
        <span>Anything else</span>
        <input value={form.notes} onChange={set('notes')} placeholder="Sweet tooth." />
      </label>
      <div className="composer-row">
        <button type="submit" className="primary" disabled={!form.name.trim()}>
          Save
        </button>
        <button type="button" className="linkish" onClick={onCancel}>
          cancel
        </button>
      </div>
    </form>
  )
}
