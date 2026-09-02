import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-900 text-white p-6 overflow-auto">
          <div className="max-w-xl w-full bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700 space-y-4">
            <h2 className="text-xl font-bold text-rose-400">Application Error</h2>
            <p className="text-sm text-slate-300">
              {this.state.error?.toString()}
            </p>
            {this.state.errorInfo && (
              <pre className="text-xs bg-slate-950 p-3 rounded-xl overflow-x-auto text-slate-400 font-mono">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 rounded-xl font-bold text-sm text-white transition"
            >
              Reset App Data & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
