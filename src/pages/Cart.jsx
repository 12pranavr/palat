import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePalat } from '../store/store.jsx'

const TONE = { NO: 'no', SOMETIMES: 'maybe', YES: 'yes' }

export default function Cart() {
  const { cart, family, removeFromCart, clearCart } = usePalat()
  const [copied, setCopied] = useState(false)

  const { flagged, fine } = useMemo(() => {
    const flagged = []
    const fine = []
    for (const item of cart) {
      const verdicts = Object.values(item.verdicts || {})
      if (verdicts.includes('NO')) flagged.push(item)
      else fine.push(item)
    }
    return { flagged, fine }
  }, [cart])

  async function copyList() {
    const text = cart.map((i) => '- ' + i.name).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  if (!cart.length) {
    return (
      <div className="page page--cart">
        <h1 className="page-title">Cart</h1>
        <p className="page-sub">
          The shopping list builds itself. Whatever Palat suggests instead of a
          packet lands here.
        </p>
        <Link to="/scan" className="empty empty--link">
          <strong>Nothing in the cart yet.</strong>
          <span>Scan a packet, and the better thing on the same shelf ends up here.</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="page page--cart">
      <header className="page-head">
        <h1 className="page-title">Cart</h1>
        <span className="block-count">{cart.length}</span>
      </header>
      <p className="page-sub">
        {fine.length} to pick up{flagged.length ? `, ${flagged.length} to think about` : ''}.
      </p>

      <div className="cart-tools">
        <button type="button" className="ghost" onClick={copyList}>
          {copied ? 'Copied ✓' : 'Copy list'}
        </button>
        <button
          type="button"
          className="ghost ghost--danger"
          onClick={() => {
            if (confirm('Empty the whole cart?')) clearCart()
          }}
        >
          Empty cart
        </button>
      </div>

      {fine.length ? (
        <section className="block">
          <div className="block-head">
            <h2>Pick up</h2>
          </div>
          <ul className="cart-list">
            {fine.map((item) => (
              <CartRow key={item.id} item={item} family={family} onRemove={removeFromCart} />
            ))}
          </ul>
        </section>
      ) : null}

      {flagged.length ? (
        <section className="block">
          <div className="block-head">
            <h2>Not for everyone</h2>
          </div>
          <p className="block-sub">
            These are in the cart, but somebody at home should not eat them.
          </p>
          <ul className="cart-list">
            {flagged.map((item) => (
              <CartRow key={item.id} item={item} family={family} onRemove={removeFromCart} />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="disclaimer">
        Verdicts here were worked out when each item was added. If you change the
        family, scan again — Palat does not re-judge what is already in the cart.
      </p>
    </div>
  )
}

function CartRow({ item, family, onRemove }) {
  const entries = Object.entries(item.verdicts || {})

  return (
    <li className="cart-row">
      <span className={'cart-kind cart-kind--' + item.kind} aria-hidden="true">
        {item.kind === 'swap' ? '↑' : '□'}
      </span>

      <div className="cart-text">
        <strong>{item.name}</strong>
        {item.note ? <span>{item.note}</span> : null}

        {entries.length ? (
          <span className="cart-verdicts">
            {entries.map(([personId, verdict]) => {
              const person = family.find((p) => p.id === personId)
              if (!person) return null
              return (
                <span key={personId} className={'cart-chip cart-chip--' + TONE[verdict]}>
                  {person.name}
                </span>
              )
            })}
          </span>
        ) : item.forPerson ? (
          <span className="cart-for">Suggested for {item.forPerson}</span>
        ) : null}
      </div>

      <button
        type="button"
        className="cart-remove"
        onClick={() => onRemove(item.id)}
        aria-label={'Remove ' + item.name}
      >
        ✕
      </button>
    </li>
  )
}
