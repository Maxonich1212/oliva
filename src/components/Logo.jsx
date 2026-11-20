// Веточка оливы в скруглённом квадрате
export function Logo({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="var(--olive-soft)" />
      <path d="M18 48 C28 38, 36 28, 46 16" stroke="var(--olive)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <ellipse cx="27" cy="34" rx="7.5" ry="3.6" transform="rotate(-50 27 34)" fill="var(--sage)" />
      <ellipse cx="36" cy="30" rx="7.5" ry="3.6" transform="rotate(20 36 30)" fill="var(--olive)" />
      <ellipse cx="37" cy="20" rx="6.5" ry="3.2" transform="rotate(-60 37 20)" fill="var(--sage)" />
      <ellipse cx="22" cy="44" rx="4.6" ry="5.6" fill="var(--terra)" opacity="0.9" />
    </svg>
  )
}
