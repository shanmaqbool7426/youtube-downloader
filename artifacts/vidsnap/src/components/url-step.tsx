import { type FormEvent } from 'react';
import { SiYoutube } from 'react-icons/si';
import { Download, AlertCircle } from 'lucide-react';

interface UrlStepProps {
  url: string;
  onUrlChange: (url: string) => void;
  onProcess: () => void;
  isProcessing: boolean;
  errorMsg: string | null;
}

export function UrlStep({
  url,
  onUrlChange,
  onProcess,
  isProcessing,
  errorMsg,
}: UrlStepProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onProcess();
  };

  return (
    <div className="step-block">
      <div className="step-heading">
        <span className="step-badge">1</span>
        <h2>Enter YouTube Video URL</h2>
      </div>
      <form className="input-form" onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <span className="input-icon">
            <SiYoutube size={20} />
          </span>
          <input
            type="url"
            className="url-input"
            placeholder="Paste YouTube link, e.g. https://youtu.be/…"
            aria-label="YouTube video URL"
            inputMode="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            required
            disabled={isProcessing}
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="btn-primary"
          disabled={!url.trim() || isProcessing}
        >
          {isProcessing ? (
            <>
              <span className="spinner" /> Processing...
            </>
          ) : (
            <>
              <Download size={18} /> Download 1080p
            </>
          )}
        </button>
      </form>
      <p className="form-note">
        Works with youtube.com, youtu.be and Shorts links. You'll pick the exact quality on the
        next step.
      </p>
      {errorMsg && (
        <div className="error-message" role="alert">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}