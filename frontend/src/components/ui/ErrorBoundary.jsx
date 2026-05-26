import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-state" style={{ minHeight: '200px' }}>
          <div className="error-state-icon">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              {this.props.title || 'Something went wrong'}
            </h4>
            <p style={{ color: 'var(--color-text-2)', fontSize: '0.875rem', maxWidth: 400 }}>
              {this.props.message ||
                'This component encountered an unexpected error. You can try refreshing it.'}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <code style={{
                display: 'block',
                marginTop: '1rem',
                fontSize: '0.75rem',
                color: 'var(--color-error)',
                maxWidth: 500,
                wordBreak: 'break-all',
              }}>
                {this.state.error.message}
              </code>
            )}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={this.handleReset}>
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
