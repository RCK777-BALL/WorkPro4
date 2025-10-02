import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  componentDidUpdate(prevProps, prevState) {
    if (!this.state.hasError) {
      return;
    }

    const { resetKeys } = this.props;
    const prevResetKeys = prevProps.resetKeys;

    if (!resetKeys && !prevResetKeys) {
      return;
    }

    if (
      resetKeys &&
      prevResetKeys &&
      resetKeys.length === prevResetKeys.length &&
      resetKeys.every((key, index) => Object.is(key, prevResetKeys[index]))
    ) {
      return;
    }

    this.resetErrorBoundary();
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });

    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  handleRetry = () => {
    if (typeof this.props.onRetry === 'function') {
      this.props.onRetry(this.state.error);
    }

    this.resetErrorBoundary();
  };

  render() {
    const { hasError } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback({
          resetErrorBoundary: this.resetErrorBoundary,
          retry: this.handleRetry,
        });
      }

      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <div>
            <h2 className="text-xl font-semibold">Something went wrong.</h2>
            <p className="mt-2 text-sm text-gray-500">
              An unexpected error occurred. Please try again.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Retry
          </button>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
