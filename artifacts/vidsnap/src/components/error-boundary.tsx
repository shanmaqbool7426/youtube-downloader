import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Fallback UI for render crashes so a blank white page never ships to users. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface in the console / error reporting while keeping the UI friendly.
    console.error('UI crashed:', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <AlertTriangle size={32} />
          <h2>Something went wrong</h2>
          <p>
            The page hit an unexpected error while rendering. Reloading usually fixes it — your
            input was not lost.
          </p>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <button type="button" className="btn-ghost" onClick={this.handleReset}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
