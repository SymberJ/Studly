import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Error boundary to klasa — nie może używać hooków, więc język czytamy z localStorage. */
const tr = (pl: string, en: string) => {
  try { return localStorage.getItem("studly-lang") === "en" ? en : pl; }
  catch { return pl; }
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__card">
            <i className="ti ti-alert-triangle error-boundary__icon" />
            <h2>{tr("Coś poszło nie tak", "Something went wrong")}</h2>
            <p>{this.state.error.message}</p>
            <button
              className="error-boundary__btn"
              onClick={() => this.setState({ error: null })}
            >
              {tr("Spróbuj ponownie", "Try again")}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
