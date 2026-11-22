import { type FormEvent, useRef, useState } from 'react';
import { SiYoutube } from 'react-icons/si';
import { AlertCircle, ClipboardPaste } from 'lucide-react';

interface UrlStepProps {
  url: string;
  onUrlChange: (url: string) => void;
  onProcess: () => void;
  isProcessing: boolean;
  errorMsg: string | null;
  /** Offer "Try again" only when the server said retrying could work. */
  canRetry: boolean;
}

/**
 * The single input a visitor needs: one label, one field, one button.
 *
 * Paste has a manual fallback because `navigator.clipboard.readText()` is
 * unavailable on http:// origins, in Firefox without user gesture permission,
 * and in some in-app browsers (Instagram, Facebook). Failing silently there
 * would look like a broken button, so we explain what to do instead.
 */
export function UrlStep({
  url,
  onUrlChange,
  onProcess,
  isProcessing,
  errorMsg,
  canRetry,
}: UrlStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pasteHint, setPasteHint] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isProcessing) return;
    onProcess();
  };

  const handlePaste = async () => {
    setPasteHint(null);
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        onUrlChange(text.trim());
        return;
      }
      setPasteHint('Your clipboard is empty. Copy the video link first, then press Paste again.');
    } catch {
      setPasteHint('Your browser blocks clipboard access here. Click the field and press Ctrl+V (⌘V on Mac).');
    }
    inputRef.current?.focus();
  };

  return (
    <div className="step-block">
      <form className="url-form" onSubmit={handleSubmit} noValidate>
        <label className="field-label" htmlFor="video-url">
          YouTube video link
        </label>

        <div className="url-row">
          <div className="url-field">
            <SiYoutube className="url-field-icon" size={20} aria-hidden="true" />
            <input
              ref={inputRef}
              id="video-url"
              name="url"
              type="text"
              className="url-input"
              placeholder="https://www.youtube.com/watch?v=…"
              value={url}
              onChange={(event) => onUrlChange(event.target.value)}
              readOnly={isProcessing}
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              aria-describedby="url-hint"
              aria-invalid={errorMsg ? true : undefined}
            />
            <button type="button" className="paste-btn" onClick={handlePaste} disabled={isProcessing}>
              <ClipboardPaste size={15} aria-hidden="true" />
              Paste
            </button>
          </div>

          <button type="submit" className="btn-primary" disabled={isProcessing || !url.trim()}>
            {isProcessing ? 'Checking link…' : 'Show download options'}
          </button>
        </div>

        <p className="field-hint" id="url-hint">
          Works with youtube.com, youtu.be and Shorts links. You choose quality and format next.
        </p>

        {/* Loading state is announced, not just animated. */}
        <p className="sr-only" role="status" aria-live="polite">
          {isProcessing ? 'Reading video details. This can take up to 30 seconds.' : ''}
        </p>

        {pasteHint && <p className="field-hint field-hint-warn">{pasteHint}</p>}

        {errorMsg && (
          <div className="error-message" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <div>
              <p>{errorMsg}</p>
              {canRetry && (
                <button type="button" className="inline-retry" onClick={onProcess}>
                  Try again
                </button>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
