import { useState } from 'react';
import { useGetVideoInfo } from '@workspace/api-client-react';
import type { VideoInfo, VideoFormat } from '@workspace/api-client-react';
import { Check } from 'lucide-react';

import { UrlStep } from './components/url-step';
import { ResultsStep } from './components/results-step';
import { InfoSections } from './components/info-sections';
import { Faq } from './components/faq';

const TRUST_POINTS = ['No sign-up', 'No app to install', 'MP4 & MP3', 'Up to 4K', 'Any device'];

function pickDefaultFormat(formats: VideoFormat[]): string {
  if (formats.length === 0) return '';
  const merged = formats.find((fmt) => fmt.formatId.startsWith('video+audio:'));
  if (merged) return merged.formatId;
  const progressive = formats.find((fmt) => fmt.type === 'progressive');
  if (progressive) return progressive.formatId;
  const hd = formats.find((fmt) => fmt.type === 'video' && /^1080p/.test(fmt.quality));
  if (hd) return hd.formatId;
  return formats[0].formatId;
}

function errorMessage(
  err: { data?: { error?: string } | null; message?: string },
  fallback: string,
): string {
  return err?.data?.error ?? err?.message ?? fallback;
}

/** Homepage: the downloader plus the long-form guide content. */
export default function App() {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState('');
  const [infoError, setInfoError] = useState<string | null>(null);

  const infoMutation = useGetVideoInfo();

  const handleProcess = () => {
    const target = url.trim();
    if (!target) return;

    setInfoError(null);
    setVideoInfo(null);
    setSelectedFormatId('');

    infoMutation.mutate(
      { data: { url: target } },
      {
        onSuccess: (data) => {
          setVideoInfo(data);
          setSelectedFormatId(pickDefaultFormat(data.formats ?? []));
        },
        onError: (err) => {
          setInfoError(
            errorMessage(
              err,
              'Failed to fetch video information. Make sure the URL is valid and the platform is supported.',
            ),
          );
        },
      },
    );
  };

  return (
    <main id="main">
      <section className="hero container" id="downloader">
        <span className="eyebrow">Free online YouTube downloader</span>
        <h1 className="hero-title">
          YouTube Video Downloader 1080p{' '}
          <span className="hero-title-accent">Full HD video with audio, free</span>
        </h1>
        <p className="hero-subtitle">
          Paste a YouTube link to see every available quality, from 1080p Full HD and 4K to MP3
          audio, with real file sizes. Then save it straight to your device.
        </p>

        <div className="steps-panel">
          <UrlStep
            url={url}
            onUrlChange={setUrl}
            onProcess={handleProcess}
            isProcessing={infoMutation.isPending}
            errorMsg={infoError}
          />
          {videoInfo && (
            <ResultsStep
              videoInfo={videoInfo}
              selectedFormatId={selectedFormatId}
              onSelect={setSelectedFormatId}
              videoUrl={url.trim()}
            />
          )}
        </div>

        <ul className="trust-row" aria-label="Why HD Grab">
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
