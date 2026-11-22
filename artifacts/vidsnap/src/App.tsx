import { useState } from 'react';
import { useGetVideoInfo } from '@workspace/api-client-react';
import type { VideoInfo } from '@workspace/api-client-react';
import { Check } from 'lucide-react';

import { UrlStep } from './components/url-step';
import { ResultsStep } from './components/results-step';
import { InfoSections } from './components/info-sections';
import { Faq } from './components/faq';

const TRUST_POINTS = ['No sign-up', 'No app to install', 'MP4 & MP3', 'Up to 4K', 'Any device'];

const FALLBACK_ERROR =
  'We could not read that video. Check the link and try again in a moment.';

interface LookupErrorBody {
  error?: string;
  code?: string;
  retryable?: boolean;
}

/** Homepage: the downloader plus the long-form guide content. */
export default function App() {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);

  const infoMutation = useGetVideoInfo();

  const handleProcess = () => {
    const target = url.trim();
    // The button is disabled while pending, but Enter in the field and a
    // double tap can both land here inside the same tick.
    if (!target || infoMutation.isPending) return;

    setInfoError(null);
    setCanRetry(false);
    setVideoInfo(null);

    infoMutation.mutate(
      { data: { url: target } },
      {
        onSuccess: (data) => setVideoInfo(data),
        onError: (err) => {
          const body = (err as { data?: LookupErrorBody | null } | null)?.data ?? null;
          // The URL stays in the field, so a typo is a one-character fix
          // instead of a fresh paste.
          setInfoError(body?.error ?? FALLBACK_ERROR);
          setCanRetry(body?.retryable ?? true);
        },
      },
    );
  };

  return (
    <main id="main">
      <section className="hero container" id="downloader">
        <span className="eyebrow">Free online YouTube downloader</span>
        <h1 className="hero-title">
          YouTube video downloader
          <span className="hero-title-accent">1080p Full HD with sound</span>
        </h1>
        <p className="hero-subtitle">
          Paste a link to see every format YouTube actually returns for it — 1080p, 720p, 4K or MP3 —
          with a real file size beside each one. Then save it to your device.
        </p>

        <div className="steps-panel">
          <UrlStep
            url={url}
            onUrlChange={setUrl}
            onProcess={handleProcess}
            isProcessing={infoMutation.isPending}
            errorMsg={infoError}
            canRetry={canRetry}
          />
          {videoInfo && <ResultsStep videoInfo={videoInfo} videoUrl={url.trim()} />}
        </div>

        <ul className="trust-row" aria-label="Why ClipZap">
          {TRUST_POINTS.map((point) => (
            <li key={point}>
              <Check size={16} aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </section>

      <InfoSections />
      <Faq />
    </main>
  );
}
