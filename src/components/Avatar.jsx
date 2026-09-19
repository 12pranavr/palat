import { initialFor } from '../store/store.jsx'

export default function Avatar({ person, size = 40 }) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: person.avatar || '#8ab4f8',
        fontSize: Math.round(size * 0.45),
      }}
      aria-hidden="true"
    >
      {initialFor(person)}
    </span>
  )
}
