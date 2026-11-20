// Иконка приложения (та же, что на экране «Домой»)
export function Logo({ size = 64 }) {
  return <img src="./icon-512.png" alt="" width={size} height={size} style={{ borderRadius: size * 0.225, display: 'inline-block', boxShadow: '0 6px 20px rgba(60,45,20,.12)' }} />
}
