import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { UpdateBanner } from './components/UpdateBanner'
import { initAuth } from './lib/store'
import { startUpdateChecks } from './lib/update'

initAuth()
// Android/Chrome: запоминаем предложение установки, чтобы показать свою кнопку в настройках
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__installPrompt = e
})
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <UpdateBanner />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {})
}
startUpdateChecks()
// Android (приложение с экрана «Домой») умеет фиксировать вертикальную ориентацию
try {
  screen.orientation?.lock?.('portrait').catch(() => {})
} catch {
  /* iPhone не поддерживает — там заставка из index.html */
}
