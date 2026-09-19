import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { PROFILES } from '../data/profiles.js'

// Everything that has to survive a page change lives here. Family and cart also
// survive a reload — losing the family you just entered because you tapped Scan
// would make the app feel broken.

const KEYS = {
  family: 'palat.family.v1',
  cart: 'palat.cart.v1',
  active: 'palat.active.v1',
  history: 'palat.history.v1',
}

// Enough for months of shopping, small enough that localStorage never complains.
// Photos are deliberately not kept — a few hundred scans of base64 would blow the
// quota, and the verdict is the part worth remembering.
const HISTORY_CAP = 300

const AVATARS = ['#8ab4f8', '#c58af9', '#81c995', '#fdd663', '#f28b82']

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private window, blocked storage — the app still works for this session */
  }
}

export const newId = () =>
  'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

export function avatarFor(index) {
  return AVATARS[index % AVATARS.length]
}

/** First Devanagari letter if the name has one, else the first English letter. */
export function initialFor(person) {
  if (person.initial) return person.initial
  const dev = String(person.name || '').match(/[ऀ-ॿ]/)
  if (dev) return dev[0]
  return String(person.name || '?').trim().charAt(0).toUpperCase()
}

const PalatContext = createContext(null)

export function PalatProvider({ children }) {
  const [family, setFamily] = useState(() => load(KEYS.family, PROFILES))
  const [cart, setCart] = useState(() => load(KEYS.cart, []))
  const [activeId, setActiveId] = useState(() => load(KEYS.active, PROFILES[0].id))
  const [history, setHistory] = useState(() => load(KEYS.history, []))

  // Held in memory only: the full reading belongs to the trip, not the device.
  const [lastScan, setLastScan] = useState(null)

  useEffect(() => save(KEYS.family, family), [family])
  useEffect(() => save(KEYS.cart, cart), [cart])
  useEffect(() => save(KEYS.active, activeId), [activeId])
  useEffect(() => save(KEYS.history, history), [history])

  // If the active person is deleted, fall back rather than render an empty tab.
  useEffect(() => {
    if (family.length && !family.some((p) => p.id === activeId)) {
      setActiveId(family[0].id)
    }
  }, [family, activeId])

  const value = useMemo(() => {
    const addPerson = (person) =>
      setFamily((f) => [...f, { ...person, id: person.id || newId() }])

    const updatePerson = (id, patch) =>
      setFamily((f) => f.map((p) => (p.id === id ? { ...p, ...patch } : p)))

    const removePerson = (id) => setFamily((f) => f.filter((p) => p.id !== id))

    const replaceFamily = (people) =>
      setFamily(people.map((p) => ({ ...p, id: p.id || newId() })))

    const addToCart = (item) => {
      const entry = {
        id: newId(),
        addedAt: Date.now(),
        kind: 'swap',
        verdicts: {},
        ...item,
      }
      setCart((c) => {
        // Same name, same kind, already in the basket — do not stack duplicates.
        const clash = c.find(
          (i) => i.name.toLowerCase() === entry.name.toLowerCase() && i.kind === entry.kind
        )
        return clash ? c : [entry, ...c]
      })
      return entry
    }

    const removeFromCart = (id) => setCart((c) => c.filter((i) => i.id !== id))
    const clearCart = () => setCart([])

    const inCart = (name, kind) =>
      cart.some(
        (i) => i.name.toLowerCase() === String(name).toLowerCase() && (!kind || i.kind === kind)
      )

    /**
     * A scan boils down to one small record: what it was, what each person was
     * told, and which flagged ingredients drove it. That is everything the weekly
     * report needs and nothing it does not.
     */
    const recordScan = (scan) => {
      const entry = {
        id: newId(),
        at: Date.now(),
        productName: scan.label?.productName || 'A packet',
        brand: scan.label?.brand || '',
        mode: scan.mode || 'label',
        isEstimate: !!scan.label?.isEstimate,
        verdicts: Object.fromEntries(scan.verdicts.map((v) => [v.personId, v.verdict])),
        // Only the person-relevant flags, deduped, for "what you kept out".
        flags: [...new Set((scan.findings || []).map((f) => f.term))].slice(0, 6),
        better: Object.fromEntries(
          scan.verdicts
            .filter((v) => v.better && v.better !== '—')
            .map((v) => [v.personId, v.better])
        ),
      }
      setHistory((h) => [entry, ...h].slice(0, HISTORY_CAP))
      return entry
    }

    const clearHistory = () => setHistory([])

    return {
      family,
      cart,
      activeId,
      lastScan,
      history,
      setActiveId,
      setLastScan,
      recordScan,
      clearHistory,
      addPerson,
      updatePerson,
      removePerson,
      replaceFamily,
      addToCart,
      removeFromCart,
      clearCart,
      inCart,
      activePerson: family.find((p) => p.id === activeId) || family[0] || null,
    }
  }, [family, cart, activeId, lastScan, history])

  return <PalatContext.Provider value={value}>{children}</PalatContext.Provider>
}

export function usePalat() {
  const ctx = useContext(PalatContext)
  if (!ctx) throw new Error('usePalat must be used inside PalatProvider')
  return ctx
}
