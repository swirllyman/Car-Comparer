import { Component, type ReactNode } from 'react'

interface Props {
  /** Shown instead of the children once they've thrown; gets the error and a way to try again. */
  fallback: (error: Error, retry: () => void) => ReactNode
  children: ReactNode
}

/**
 * Keeps one failing part of the app (the 3D view on a phone without WebGL,
 * say) from blanking the whole page.
 */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) return this.props.fallback(this.state.error, () => this.setState({ error: null }))
    return this.props.children
  }
}
