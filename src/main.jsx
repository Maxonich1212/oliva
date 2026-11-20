import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initAuth } from './lib/store'

initAuth()
// Android/Chrome: запоминаем предложение установки, чтобы показать свою кнопку в настройках
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__installPrompt = e
})
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.register('./sw.js').catch(() => {})
  // вышла новая версия — тихо перезагружаемся, но только если приложение было уже открыто старой версией
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) {
      reloaded = true
      location.reload()
    }
  })
}
