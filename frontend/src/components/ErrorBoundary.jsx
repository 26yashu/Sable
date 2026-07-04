import { Component } from "react";

/**
 * ErrorBoundary — catches unexpected render errors anywhere in the tree.
 *
 * Shows a calm, on-brand fallback rather than a blank screen. The user
 * can reload the page or navigate to a different section.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeScreen />
 *   </ErrorBoundary>
 *
 * Or wrap individual sections for granular recovery:
 *   <ErrorBoundary fallback={<p>This section couldn't load.</p>}>
 *     <HeavyChart />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log for debugging without exposing to the user
    console.error("[Sable] Render error caught by ErrorBoundary:", error, info.componentStack);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    // Allow a custom fallback prop for lightweight inline boundaries
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="error-boundary" role="alert" aria-live="assertive">
        <div className="error-boundary__inner">
          <div className="error-boundary__icon" aria-hidden="true">🌿</div>
          <h2 className="error-boundary__title">Something went quietly wrong.</h2>
          <p className="error-boundary__body">
            This part of Sable couldn't load. Your data is safe — it's stored
            locally on your device and hasn't been affected.
          </p>
          <div className="error-boundary__actions">
            <button
              className="error-boundary__btn error-boundary__btn--primary"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
            <button
              className="error-boundary__btn error-boundary__btn--ghost"
              onClick={() => this.handleReset()}
            >
              Try again
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="error-boundary__detail">
              <summary>Error detail (dev only)</summary>
              <pre>{this.state.error.toString()}</pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
