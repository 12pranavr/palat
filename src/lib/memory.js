// Which profile changes may happen quietly, and which must be shown first.
//
// The rule is not "is it important" — it is which direction it moves Palat.
// A change that makes Palat MORE careful is safe to apply silently: the worst
// case is an unnecessary warning. A change that makes Palat LESS careful, or that
// touches medication, is shown as a diff and waits for a tap — because the worst
// case there is a 72-year-old being told a packet is fine when it is not, and
// nobody ever finding out.
//
// Deliberately deterministic. The model proposes the change; this file, not the
// model, decides whether it needs a human.

const TIGHTENS = ['addConditions', 'addGoals']
const LOOSENS = ['removeConditions', 'removeGoals']
const MEDICAL = ['addMedications', 'removeMedications']

const nonEmpty = (v) => Array.isArray(v) && v.length > 0

export function needsConfirmation(update) {
  return [...LOOSENS, ...MEDICAL].some((k) => nonEmpty(update[k]))
}

/** Split one update into the part that can be applied now and the part that cannot. */
export function splitUpdate(update) {
  const silent = { personId: update.personId, personName: update.personName }
  const gated = { personId: update.personId, personName: update.personName }

  for (const key of TIGHTENS) if (nonEmpty(update[key])) silent[key] = update[key]
  if (update.setAge != null) silent.setAge = update.setAge
  if (update.setWeightKg != null) silent.setWeightKg = update.setWeightKg
  if (update.setNotes?.trim()) silent.setNotes = update.setNotes.trim()

  for (const key of [...LOOSENS, ...MEDICAL]) {
    if (nonEmpty(update[key])) gated[key] = update[key]
  }

  return {
    silent: hasChanges(silent) ? silent : null,
    gated: hasChanges(gated) ? gated : null,
  }
}

const CHANGE_KEYS = [
  ...TIGHTENS, ...LOOSENS, ...MEDICAL,
  'setAge', 'setWeightKg', 'setNotes',
]

export function hasChanges(update) {
  return CHANGE_KEYS.some((k) =>
    Array.isArray(update[k]) ? update[k].length > 0 : update[k] != null && update[k] !== ''
  )
}

/** Plain sentences a person can check at a glance. */
export function describeUpdate(update) {
  const lines = []
  const list = (a) => a.join(', ')

  if (nonEmpty(update.addConditions)) lines.push(`add ${list(update.addConditions)}`)
  if (nonEmpty(update.removeConditions))
    lines.push(`no longer has ${list(update.removeConditions)}`)
  if (nonEmpty(update.addGoals)) lines.push(`trying to ${list(update.addGoals)}`)
  if (nonEmpty(update.removeGoals)) lines.push(`no longer trying to ${list(update.removeGoals)}`)
  if (nonEmpty(update.addMedications)) lines.push(`now takes ${list(update.addMedications)}`)
  if (nonEmpty(update.removeMedications))
    lines.push(`stopped ${list(update.removeMedications)}`)
  if (update.setAge != null) lines.push(`age ${update.setAge}`)
  if (update.setWeightKg != null) lines.push(`${update.setWeightKg} kg`)
  if (update.setNotes) lines.push(`note: ${update.setNotes}`)

  return lines
}

/** Turn an update into the patch the store applies to a person. */
export function toPatch(person, update) {
  const merge = (current = [], add = [], remove = []) => {
    const lower = remove.map((r) => r.toLowerCase())
    const kept = current.filter((c) => !lower.includes(c.toLowerCase()))
    const fresh = add.filter(
      (a) => !kept.some((k) => k.toLowerCase() === a.toLowerCase())
    )
    return [...kept, ...fresh]
  }

  const patch = {}

  if (nonEmpty(update.addConditions) || nonEmpty(update.removeConditions)) {
    patch.conditions = merge(person.conditions, update.addConditions, update.removeConditions)
  }
  if (nonEmpty(update.addGoals) || nonEmpty(update.removeGoals)) {
    patch.goals = merge(person.goals, update.addGoals, update.removeGoals)
  }
  if (nonEmpty(update.addMedications) || nonEmpty(update.removeMedications)) {
    patch.medications = merge(
      person.medications,
      update.addMedications,
      update.removeMedications
    )
  }
  if (update.setAge != null) patch.age = update.setAge
  if (update.setWeightKg != null) patch.weightKg = update.setWeightKg
  if (update.setNotes) {
    // Notes accrue rather than overwrite, but never unboundedly — they are fed
    // into every later label prompt.
    const existing = person.notes ? person.notes.trim() : ''
    const addition = update.setNotes.trim()
    patch.notes =
      existing && !existing.toLowerCase().includes(addition.toLowerCase())
        ? (existing + ' ' + addition).slice(0, 240)
        : existing || addition
  }

  return patch
}
