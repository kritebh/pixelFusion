import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full rounded-xl bg-white border border-slate-200 shadow-sm p-8 text-center">
            <h1 className="text-xl font-semibold text-slate-800 mb-2">
              Something went wrong
            </h1>
            <p className="text-slate-600 text-sm mb-6">
              The app hit an error. Try refreshing the page.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="text-sm text-green-600 hover:text-green-700 font-medium mr-4"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
