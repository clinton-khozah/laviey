import {
  getErrorPageContent,
  resolveErrorPageCode,
  type ErrorPageCode,
} from './errorPage.config';
import './ErrorPage.css';

interface ErrorPageProps {
  code?: ErrorPageCode;
  status?: number;
  apiCode?: string;
  message?: string;
  onNavigate: (href: string) => void;
}

function handleAction(href: string, onNavigate: (href: string) => void): void {
  if (href === 'back') {
    window.history.back();
    return;
  }
  if (href === 'reload') {
    window.location.reload();
    return;
  }
  onNavigate(href);
}

export function ErrorPage({ code, status, apiCode, message, onNavigate }: ErrorPageProps) {
  const resolvedCode = code ?? resolveErrorPageCode(status, apiCode);
  const content = getErrorPageContent(resolvedCode, message);
  const displayStatus = content.status > 0 ? String(content.status) : null;

  return (
    <div className="error-page">
      <div className="error-page__backdrop" aria-hidden />

      <main className="error-page__panel">
        <header className="error-page__hero">
          {content.emoji && (
            <span className="error-page__icon" aria-hidden>
              {content.emoji}
            </span>
          )}

          {displayStatus ? (
            <p className="error-page__code" aria-label={`Error ${displayStatus}`}>
              {displayStatus}
            </p>
          ) : (
            <p className="error-page__code error-page__code--text">{content.title}</p>
          )}

          {displayStatus && <p className="error-page__label">{content.title}</p>}
        </header>

        <div className="error-page__body">
          <h1 className="error-page__headline">{content.headline}</h1>
          {content.message ? (
            <p className="error-page__message">{content.message}</p>
          ) : null}
        </div>

        <div className="error-page__actions">
          <button
            type="button"
            className="error-page__btn error-page__btn--primary"
            onClick={() => handleAction(content.primaryAction.href, onNavigate)}
          >
            {content.primaryAction.label}
          </button>

          {content.secondaryAction && (
            <button
              type="button"
              className="error-page__btn error-page__btn--secondary"
              onClick={() => handleAction(content.secondaryAction!.href, onNavigate)}
            >
              {content.secondaryAction.label}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
