// The family Palat starts with. Editable on the Family page, and whatever you
// change is what every later scan is judged against.

export const PROFILES = [
  {
    id: 'dadaji',
    name: 'Dadaji',
    initial: 'द',
    avatar: '#8ab4f8',
    age: 72,
    conditions: ['type 2 diabetes', 'high blood pressure'],
    goals: [],
    medications: ['metformin'],
    notes: 'Sweet tooth. Will eat it if nobody says anything.',
  },
  {
    id: 'mummy',
    name: 'Mummy',
    initial: 'म',
    avatar: '#c58af9',
    age: 48,
    conditions: ['high blood pressure'],
    goals: ['lose weight'],
    medications: [],
    notes: 'Watching weight.',
  },
  {
    id: 'chotu',
    name: 'Chotu',
    initial: 'छ',
    avatar: '#81c995',
    age: 6,
    conditions: [],
    goals: [],
    medications: [],
    notes: 'Growing child, no restrictions.',
  },
]

const short = (c) =>
  /blood pressure|hypertens/i.test(c) ? 'BP' : c.charAt(0).toUpperCase() + c.slice(1)

/** One short line under a name: "72 · Diabetes, BP" or "31 · 89 kg · Losing weight" */
export function summarise(person) {
  const bits = []
  if (person.age) bits.push(String(person.age))
  if (person.weightKg) bits.push(person.weightKg + ' kg')

  if (person.conditions?.length) {
    bits.push(person.conditions.map(short).join(', '))
  } else if (person.goals?.length) {
    bits.push(person.goals.map(short).join(', '))
  } else {
    bits.push('No condition')
  }
  return bits.join(' · ')
}
