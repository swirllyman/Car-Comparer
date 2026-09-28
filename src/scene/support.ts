/** True when the browser can give us a WebGL canvas for the 3D view. */
export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const RELOAD_KEY = 'car-comparer.reloaded-for-update'

/**
 * Lazy-load a chunk, and if it has gone missing because the site was updated
 * since this page loaded, reload once to pick up the new files.
 */
export function importWithReload<T>(load: () => Promise<T>): () => Promise<T> {
  return () =>
    load().then(
      (mod) => {
        try {
          sessionStorage.removeItem(RELOAD_KEY)
        } catch {
          // Storage unavailable; nothing to clear.
        }
        return mod
      },
      (err) => {
        let reloaded = true
        try {
          reloaded = sessionStorage.getItem(RELOAD_KEY) === '1'
          if (!reloaded) sessionStorage.setItem(RELOAD_KEY, '1')
        } catch {
          // Without storage we can't guard against a reload loop, so don't reload.
        }
        if (reloaded) throw err
        location.reload()
        // Never settles; the page is going away.
        return new Promise<T>(() => {})
      },
    )
}
