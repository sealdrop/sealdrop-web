import { Component, type ReactNode } from "react";
import i18n from "i18next";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      const t = i18n.t.bind(i18n);
      return (
        <div className="page">
          <div className="card stack">
            <h1 className="title">{t("common.errorTitle", "Something went wrong")}</h1>
            <p className="subtitle">{t("common.errorMessage", "The page failed to load. Please try again.")}</p>
            <a href="/" className="btn">{t("common.goToSealDrop")}</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
