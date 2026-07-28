import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', background: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', borderRadius: '12px', margin: '20px', fontFamily: 'monospace' }}>
          <h2 style={{ margin: '0 0 12px 0' }}>Component Render Crash Captured!</h2>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ margin: '12px 0 0 0', whiteSpace: 'pre-wrap', fontSize: '0.75rem', opacity: 0.8 }}>
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '16px', padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
