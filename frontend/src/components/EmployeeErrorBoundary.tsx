import React, { Component, ReactNode } from "react";

const DYNAMIC_IMPORT_ERROR_MESSAGES = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "error loading dynamically imported module"
];

const DYNAMIC_IMPORT_RELOAD_STORAGE_KEY = "dynamic_import_reload_timestamp";

const DYNAMIC_IMPORT_RELOAD_COOLDOWN_MS = 10000;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  isDynamicImportError?: boolean;
}

class EmployeeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error("EmployeeErrorBoundary caught an error:", error);
    const isDynamicImportError = DYNAMIC_IMPORT_ERROR_MESSAGES.some((msg) =>
      error.message.includes(msg)
    );
    return { hasError: true, error, isDynamicImportError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (
      DYNAMIC_IMPORT_ERROR_MESSAGES.some((msg) => error.message.includes(msg))
    ) {
      const now = Date.now();
      const storedValue = sessionStorage.getItem(
        DYNAMIC_IMPORT_RELOAD_STORAGE_KEY
      );

      const lastReloadTime = storedValue ? parseInt(storedValue, 10) : NaN;

      if (
        Number.isNaN(lastReloadTime) ||
        now - lastReloadTime > DYNAMIC_IMPORT_RELOAD_COOLDOWN_MS
      ) {
        console.warn("Dynamic import error detected. Reloading page...");
        sessionStorage.setItem(
          DYNAMIC_IMPORT_RELOAD_STORAGE_KEY,
          now.toString()
        );

        // Clear caches before reloading to ensure we get the latest index.html
        if (typeof caches !== 'undefined') {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          }).finally(() => {
            window.location.reload();
          });
        } else {
          window.location.reload();
        }
        return;
      }

      console.error(
        "Dynamic import error persisted after reload. Showing error boundary."
      );
    }

    console.error("Employee Error Boundary Details:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    if (
      error.message.includes("employee") ||
      error.message.includes("Invalid")
    ) {
      console.error("🚨 Employee-related error detected:", {
        message: error.message,
        type: error.name,
        stack: error.stack,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isDynamicImportError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full mx-auto p-6">
              <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <div className="flex justify-center mb-4">
                  <svg
                    className="h-12 w-12 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Update Available
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  A new version of the application is available. Please refresh to continue.
                </p>
                <button
                  onClick={() => {
                    if (typeof caches !== 'undefined') {
                      caches.keys().then((names) => {
                        names.forEach((name) => caches.delete(name));
                      }).finally(() => {
                        window.location.reload();
                      });
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Refresh Application
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full mx-auto p-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <svg
                    className="h-8 w-8 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 8.5c-.77.833-.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <h3 className="ml-3 text-lg font-medium text-gray-900">
                    Employee Data Error
                  </h3>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  There was an issue loading employee data. This could be due
                  to:
                </p>

                <ul className="list-disc list-inside text-sm text-gray-600 mb-4 space-y-1">
                  <li>Missing employee record for the current user</li>
                  <li>Invalid data structure from the server</li>
                  <li>Network connectivity issues</li>
                  <li>Permission restrictions</li>
                </ul>

                <details className="mb-4">
                  <summary className="text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                    Technical Details (Click to expand)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono">
                    <strong>Error:</strong> {this.state.error?.message}
                    <br />
                    <strong>Type:</strong> {this.state.error?.name}
                    <br />
                    <strong>Stack Trace:</strong>
                    <pre className="whitespace-pre-wrap mt-1">
                      {this.state.error?.stack}
                    </pre>
                  </div>
                </details>

                <div className="flex gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Reload Page
                  </button>
                  <button
                    onClick={() =>
                      this.setState({
                        hasError: false,
                        error: undefined,
                      })
                    }
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-700"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default EmployeeErrorBoundary;
