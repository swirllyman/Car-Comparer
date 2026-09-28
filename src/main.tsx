import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles.css'

/** Last resort: never leave a blank page. Starting over keeps cars and garage, and resets only the view. */
function startOver() {
  try {
    const key = 'car-comparer.v1'
    const saved = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, unknown>
    localStorage.setItem(key, JSON.stringify({ ...saved, view: 'top' }))
  } catch {
    // Unreadable storage: a plain reload is all we can do.
  }
  location.reload()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      fallback={(error) => (
        <div className="page">
          <h2>Something went wrong</h2>
          <p className="muted">Your garage and cars are still saved. Starting over reopens the app on the Top view.</p>
          <button className="btn btn--primary" onClick={startOver}>
            Start over
          </button>
          <p className="muted small">{error.message}</p>
        </div>
      )}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
