/* ════════════════════════════════════════
   ErrorBoundary — React Error Boundary
   Catches render errors, shows friendly message with retry
   ════════════════════════════════════════ */

import { Component, type ErrorInfo, type ReactNode } from "react";

/* ─── Types ────────────────────────────────────────────── */

interface ErrorBoundaryProps {
  /** Content to wrap with error protection */
  children: ReactNode;
  /** Optional fallback UI override */
  fallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  /** Optional error handler for reporting */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/* ─── Default Fallback UI ──────────────────────────────── */

function DefaultFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
      role="alert"
    >
      {/* Error icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
        <svg
          className="h-8 w-8 text-red-500 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      {/* Message */}
      <h2 className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">
        Something went wrong
      </h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        An unexpected error occurred while rendering this section.
        {process.env.NODE_ENV === "development" && (
          <span className="mt-1 block font-mono text-xs text-red-400">
            {error.message}
          </span>
        )}
      </p>

      {/* Retry button */}
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm
          hover:bg-blue-700 active:bg-blue-800 transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
          dark:focus-visible:ring-offset-gray-900"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
          />
        </svg>
        Try Again
      </button>
    </div>
  );
}

/* ─── Error Boundary Component ─────────────────────────── */

/**
 * React error boundary that catches JavaScript errors in its
 * child component tree, logs them, and displays a friendly
 * fallback UI with a retry button.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 * Custom fallback:
 *   <ErrorBoundary fallback={(error, retry) => <CustomUI />}>
 *     <MyComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details to console for debugging
    console.error("[ErrorBoundary] Uncaught error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Call custom handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { error } = this.state;
      const { fallback } = this.props;

      if (fallback) {
        if (typeof fallback === "function") {
          return fallback(error, this.handleRetry);
        }
        return fallback;
      }

      return <DefaultFallback error={error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
