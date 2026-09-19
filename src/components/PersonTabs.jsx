const DOT = { NO: 'no', SOMETIMES: 'maybe', YES: 'yes' }

export default function PersonTabs({ people, verdicts = [], activeId, onSelect }) {
  return (
    <div className="ptabs" role="tablist" aria-label="Who is eating">
      {people.map((person) => {
        const verdict = verdicts.find((v) => v.personId === person.id)
        const active = person.id === activeId
        return (
          <button
            key={person.id}
            role="tab"
            aria-selected={active}
            className={'ptab' + (active ? ' ptab--on' : '')}
            onClick={() => onSelect(person.id)}
          >
            {verdict ? <span className={'vdot vdot--' + DOT[verdict.verdict]} /> : null}
            {person.name}
          </button>
        )
      })}
    </div>
  )
}
