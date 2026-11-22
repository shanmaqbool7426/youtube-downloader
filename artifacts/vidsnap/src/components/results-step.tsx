import { SiYoutube } from 'react-icons/si';
import { AlertTriangle, Check, Download, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { VideoInfo, VideoFormat } from '@workspace/api-client-react';

interface ResultsStepProps {
  videoInfo: VideoInfo;
  videoUrl: string;
}

type JobStatus = 'preparing' | 'ready' | 'failed';

interface Job {
  status: JobStatus;
  message?: string;
}

interface Group {
  key: 'with-audio' | 'audio-only' | 'more';
  title: string;
  note: string;
  rows: VideoFormat[];
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

/** Height in pixels from a quality label like "1080p" or "1080p 60fps". */
function heightOf(fmt: VideoFormat): number {
  const match = /(\d{3,4})p/.exec(fmt.quality);
  return match ? Number(match[1]) : 0;
}

function isMp4Like(fmt: VideoFormat): boolean {
  return fmt.extension === 'mp4';
}

/**
 * Quality text without the container/bitrate noise the API encodes in `quality`.
 * Audio rows read "MP3 · 320 kbps" or "Best audio (m4a)"; video rows read "1080p".
 */
function qualityLabel(fmt: VideoFormat): string {
  if (fmt.type !== 'audio') return fmt.quality;
  const kbps = /(\d+)\s*kbps/.exec(fmt.quality);
  if (kbps) return `${kbps[1]} kbps`;
  return 'Best available';
}

function audioLabel(fmt: VideoFormat): string {
  if (fmt.type === 'audio') return 'Audio only';
  if (fmt.type === 'video') return 'No audio';
  return 'With audio';
}

function actionLabel(fmt: VideoFormat): string {
  return `Download ${fmt.extension.toUpperCase()}`;
}

/**
 * Sort predictably so the same video always renders in the same order:
 * MP4 before other containers, higher resolution first, then larger file.
 */
function sortVideoWithAudio(a: VideoFormat, b: VideoFormat): number {
  if (isMp4Like(a) !== isMp4Like(b)) return isMp4Like(a) ? -1 : 1;
  if (heightOf(a) !== heightOf(b)) return heightOf(b) - heightOf(a);
  return (b.filesize ?? 0) - (a.filesize ?? 0);
}

function sortVideoOnly(a: VideoFormat, b: VideoFormat): number {
  if (heightOf(a) !== heightOf(b)) return heightOf(b) - heightOf(a);
  if (isMp4Like(a) !== isMp4Like(b)) return isMp4Like(a) ? -1 : 1;
  return 0;
}

function sortAudio(a: VideoFormat, b: VideoFormat): number {
  const aMp3 = a.extension === 'mp3';
  const bMp3 = b.extension === 'mp3';
  if (aMp3 !== bMp3) return aMp3 ? -1 : 1;
  // MP3 rows: higher bitrate (larger file at equal duration) first.
  return (b.filesize ?? 0) - (a.filesize ?? 0);
}

/** Pull the suggested name out of Content-Disposition, preferring the UTF-8 form. */
function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      /* fall through to the ascii form */
    }
  }
  const plain = /filename="([^"]+)"/i.exec(header);
  return plain ? plain[1] : null;
}

export function ResultsStep({ videoInfo, videoUrl }: ResultsStepProps) {
  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [announcement, setAnnouncement] = useState('');

  const groups = useMemo<Group[]>(() => {
    const formats = videoInfo.formats ?? [];
    const withAudio = formats.filter((f) => f.type === 'progressive').sort(sortVideoWithAudio);
    const audioOnly = formats.filter((f) => f.type === 'audio').sort(sortAudio);
    const more = formats.filter((f) => f.type === 'video').sort(sortVideoOnly);

    const result: Group[] = [];
    if (withAudio.length > 0) {
      result.push({
        key: 'with-audio',
        title: 'Video with audio',
        note: 'One finished file you can play straight away.',
        rows: withAudio,
      });
    }
    if (audioOnly.length > 0) {
      result.push({
        key: 'audio-only',
        title: 'Audio only',
        note: 'MP3 works everywhere; M4A keeps the original quality.',
        rows: audioOnly,
      });
    }
    if (more.length > 0) {
      result.push({
        key: 'more',
        title: 'More formats',
        note: 'Picture only — these files have no sound.',
        rows: more,
      });
    }
    return result;
  }, [videoInfo]);

  const best = groups.find((g) => g.key === 'with-audio')?.rows[0] ?? groups[0]?.rows[0];
  const has1080WithAudio = groups
    .find((g) => g.key === 'with-audio')
    ?.rows.some((f) => heightOf(f) >= 1080);

  const anyPreparing = Object.values(jobs).some((job) => job.status === 'preparing');

  const downloadHref = (formatId: string) =>
    `/api/download?url=${encodeURIComponent(videoUrl)}&formatId=${encodeURIComponent(formatId)}`;

  /**
   * Fetch the file instead of navigating to it.
   *
   * Navigation would be one line, but then the page cannot see whether the
   * server answered 200 or an error page, so it could not honestly show
   * Preparing / Ready / Failed. Fetching means we know when bytes start
   * (preparing done) and when the file is whole (ready to save) — and a
   * failure is explained in place instead of replacing the page.
   */
  const startDownload = async (fmt: VideoFormat) => {
    if (jobs[fmt.formatId]?.status === 'preparing') return;

    const label = `${fmt.extension.toUpperCase()} ${qualityLabel(fmt)}`;
    setJobs((prev) => ({ ...prev, [fmt.formatId]: { status: 'preparing' } }));
    setAnnouncement(`Preparing ${label}.`);

    try {
      const response = await fetch(downloadHref(fmt.formatId), { credentials: 'same-origin' });
      const contentType = response.headers.get('Content-Type') ?? '';
      const isMedia = /^(video|audio)\/|application\/octet-stream/i.test(contentType);

      if (!response.ok || !isMedia) {
        // The route answers JSON for API callers and a small HTML page for
        // browsers; accept either so the real reason surfaces here.
        const body = await response.text();
        let message = 'The server could not prepare this file.';
        try {
          const parsed = JSON.parse(body) as { error?: string };
          if (parsed.error) message = parsed.error;
        } catch {
          const html = /<p>([^<]+)<\/p>/.exec(body);
          if (html) message = html[1];
        }
        setJobs((prev) => ({ ...prev, [fmt.formatId]: { status: 'failed', message } }));
        setAnnouncement(`Download failed. ${message}`);
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download =
        filenameFromDisposition(response.headers.get('Content-Disposition')) ??
        fmt.filename ??
        `clipzap-${fmt.formatId}.${fmt.extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

      setJobs((prev) => ({ ...prev, [fmt.formatId]: { status: 'ready' } }));
      setAnnouncement(`${label} saved to your downloads.`);
      window.setTimeout(() => {
        setJobs((prev) => {
          const next = { ...prev };
          delete next[fmt.formatId];
          return next;
        });
      }, 8000);
    } catch {
      const message = 'The download did not start. Check your connection and try again.';
      setJobs((prev) => ({ ...prev, [fmt.formatId]: { status: 'failed', message } }));
      setAnnouncement(`Download failed. ${message}`);
    }
  };

  return (
    <div className="step-block results-panel">
      <div className="video-summary">
        {videoInfo.thumbnail && (
          <div className="thumb-wrap">
            <img
              src={videoInfo.thumbnail}
              alt=""
              width={640}
              height={360}
            />
            {videoInfo.duration && videoInfo.duration !== 'Unknown' && (
              <span className="duration-badge">{videoInfo.duration}</span>
            )}
          </div>
        )}
        <div className="video-summary-text">
          <h2 className="results-title">{videoInfo.title}</h2>
          <p className="results-meta">
            <SiYoutube size={14} aria-hidden="true" />
            {videoInfo.platform}
            {videoInfo.durationSeconds ? (
              <>
                <span aria-hidden="true">·</span>
                {videoInfo.duration}
              </>
            ) : null}
          </p>
        </div>
      </div>

      {!has1080WithAudio && groups.length > 0 && (
        <div className="notice notice-warn">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>
            <strong>1080p isn&apos;t available for this video.</strong>{' '}
            {groups.find((g) => g.key === 'with-audio')
              ? `The highest quality YouTube returned with sound is ${qualityLabel(
                  groups.find((g) => g.key === 'with-audio')!.rows[0],
                )}.`
              : 'YouTube did not return a single file that includes sound for this link.'}{' '}
            <a href="/help/missing-1080p">Why 1080p goes missing</a>
          </p>
        </div>
      )}

      {groups.map((group) => (
        <section className="format-group" key={group.key} aria-labelledby={`group-${group.key}`}>
          <h3 className="format-group-title" id={`group-${group.key}`}>
            {group.title}
          </h3>
          <p className="format-group-note">{group.note}</p>

          <ul className="format-list">
            {group.rows.map((fmt) => {
              const job = jobs[fmt.formatId];
              const isBest = best?.formatId === fmt.formatId;
              const busy = job?.status === 'preparing';
              // Every button is disabled while a file is being prepared, so a
              // visitor cannot queue five half-started downloads by tapping.
              const buttonDisabled = anyPreparing && !busy;

              return (
                <li key={fmt.formatId} className={`format-item${isBest ? ' is-best' : ''}`}>
                  <button
                    type="button"
                    className="format-button"
                    onClick={() => void startDownload(fmt)}
                    disabled={buttonDisabled}
                  >
                    <span className="format-spec">
                      <span className="chip chip-ext">{fmt.extension.toUpperCase()}</span>
                      <span className="format-resolution">{qualityLabel(fmt)}</span>
                      <span className="format-audio">{audioLabel(fmt)}</span>
                      <span className="format-size">
                        {fmt.filesize
                          ? `${fmt.sizeIsEstimate ? '~' : ''}${formatBytes(fmt.filesize)}`
                          : 'Size unknown'}
                      </span>
                      {isBest && <span className="chip chip-best">Recommended</span>}
                    </span>

                    <span className={`format-action${busy ? ' is-busy' : ''}`}>
                      {job?.status === 'preparing' ? (
                        <>
                          <Loader2 size={15} className="spin-icon" aria-hidden="true" />
                          Preparing…
                        </>
                      ) : job?.status === 'ready' ? (
                        <>
                          <Check size={15} aria-hidden="true" />
                          Ready
                        </>
                      ) : job?.status === 'failed' ? (
                        'Try again'
                      ) : (
                        <>
                          <Download size={15} aria-hidden="true" />
                          {actionLabel(fmt)}
                        </>
                      )}
                    </span>
                  </button>

                  {job?.status === 'failed' && (
                    <p className="format-error" role="alert">
                      {job.message}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="results-copy">
        Sizes marked with <span aria-hidden="true">~</span>
        <span className="sr-only">a tilde</span> are estimates — YouTube reports them before the file
        is assembled. Saving works the same either way.
      </p>

      {/* One polite channel for every state change, so screen readers follow along. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
