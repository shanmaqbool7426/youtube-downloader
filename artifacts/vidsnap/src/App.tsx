import { useState } from 'react';
import { useGetVideoInfo } from '@workspace/api-client-react';
import type { VideoInfo, VideoFormat } from '@workspace/api-client-react';

import { Header } from './components/header';
import { UrlStep } from './components/url-step';
import { ResultsStep } from './components/results-step';
import { InfoSections } from './components/info-sections';
import { Faq } from './components/faq';
import { Footer } from './components/footer';

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
    <>
      <Header />
      <main>
        <section className="hero container" id="downloader">
          <span className="eyebrow">HD Grab · HD-focused YouTube downloader</span>
          <h1 className="hero-title">
            YouTube Video Downloader 1080p <span>| True HD + Audio</span>
          </h1>
          <p className="hero-subtitle">
            A focused Full HD downloader for users who value clarity and sharper playback. Paste
            your YouTube video URL, process, and access available 1080p quality options instantly.
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
        </section>

        <InfoSections />
        <Faq />
      </main>
      <Footer />
    </>
  );
}