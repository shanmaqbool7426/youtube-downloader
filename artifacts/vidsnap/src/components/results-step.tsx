import { SiYoutube } from 'react-icons/si';
import { Download, Music, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { VideoInfo, VideoFormat } from '@workspace/api-client-react';

interface ResultsStepProps {
  videoInfo: VideoInfo;
  selectedFormatId: string;
  onSelect: (formatId: string) => void;
  videoUrl: string;
}

const TYPE_LABELS: Record<string, string> = {
  progressive: 'Video + Audio',
  video: 'Video Only',
  audio: 'Audio',
};

const TYPE_CLASS: Record<string, string> = {
  progressive: 'type-progressive',
  video: 'type-video',
  audio: 'type-audio',
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function isAudioFormat(fmt: VideoFormat): boolean {
  return fmt.type === 'audio';
}

export function ResultsStep({
  videoInfo,
  selectedFormatId,
  onSelect,
  videoUrl,
}: ResultsStepProps) {
  const [activeTab, setActiveTab] = useState<'video' | 'audio'>(
    videoInfo.formats.some((fmt) => !isAudioFormat(fmt)) ? 'video' : 'audio',
  );
  /** formatIds whose download button was clicked — shows a preparing spinner. */
  const [pending, setPending] = useState<Set<string>>(new Set());

  const isSelected = (fmt: VideoFormat) => fmt.formatId === selectedFormatId;
  const downloadHref = (formatId: string) =>
    `/api/download?url=${encodeURIComponent(videoUrl)}&formatId=${encodeURIComponent(formatId)}`;

  const videoRows = videoInfo.formats.filter((fmt) => !isAudioFormat(fmt));
  const audioRows = videoInfo.formats.filter(isAudioFormat);
  const rows = activeTab === 'video' ? videoRows : audioRows;

  const handleDownloadClick = (formatId: string) => {
    if (pending.has(formatId)) return;
    // Every row streams now, so the browser's download starts within seconds;
    // show brief "Starting…" feedback until it appears, then restore the button.
    setPending((prev) => new Set(prev).add(formatId));
    window.setTimeout(() => {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(formatId);
        return next;
      });
    }, 6000);
  };

  return (
    <div className="step-block">
      <div className="step-heading">
        <span className="step-badge">2</span>
        <h2>Select Quality &amp; Download</h2>
      </div>

      <div className="results-grid">
        <div>
          <div className="thumb-wrap">
            <img
              src={videoInfo.thumbnail}
              alt={videoInfo.title}
              loading="lazy"
              width={640}
              height={360}
            />
            <span className="duration-badge">{videoInfo.duration}</span>
          </div>
          <h3 className="results-title">{videoInfo.title}</h3>
          <p className="results-meta">
            <SiYoutube size={14} />
            {videoInfo.platform}
          </p>
        </div>

        <div>
          {(videoRows.length > 0 && audioRows.length > 0) && (
            <div className="format-tabs" role="tablist" aria-label="Format type">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'video'}
                className={`format-tab ${activeTab === 'video' ? 'active' : ''}`}
                onClick={() => setActiveTab('video')}
              >
                <Download size={15} /> Video ({videoRows.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'audio'}
                className={`format-tab ${activeTab === 'audio' ? 'active' : ''}`}
                onClick={() => setActiveTab('audio')}
              >
                <Music size={15} /> Audio ({audioRows.length})
              </button>
            </div>
          )}

          <div className="table-scroll">
            <table className="formats-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Quality</th>
                  <th>File name</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((fmt) => {
                  const isPending = pending.has(fmt.formatId);
                  return (
                    <tr
                      key={fmt.formatId}
                      className={isSelected(fmt) ? 'selected' : ''}
                      onClick={() => onSelect(fmt.formatId)}
                    >
                      <td>
                        <span className={`type-badge ${TYPE_CLASS[fmt.type] ?? 'type-video'}`}>
                          {TYPE_LABELS[fmt.type] ?? fmt.type}
                        </span>
                      </td>
                      <td>
                        <span className="format-quality">{fmt.quality}</span>
                      </td>
                      <td className="filename-cell">
                        <div className="format-filename" title={fmt.filename}>
                          {fmt.filename ?? fmt.formatId}
                        </div>
                        <div className="format-size">
                          {fmt.filesize ? formatBytes(fmt.filesize) : 'Size unknown'}
                        </div>
                      </td>
                      <td className="action-cell">
                        <a
                          className={`download-btn ${isSelected(fmt) ? 'selected' : ''}`}
                          href={downloadHref(fmt.formatId)}
                          // No `download` attribute: successful responses are
                          // attachments anyway, and on failure the browser should
                          // show the server's error page, not save it as a .txt.
                          onClick={(e) => {
                            // Don't let the row's select handler swallow the click.
                            e.stopPropagation();
                            onSelect(fmt.formatId);
                            handleDownloadClick(fmt.formatId);
                          }}
                        >
                          {isPending ? (
                            <>
                              <Loader2 size={14} className="spin-icon" /> Starting…
                            </>
                          ) : (
                            <>
                              <Download size={14} /> Download Now
                            </>
                          )}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="results-copy">
            Tip: <strong>Video + Audio</strong> rows save a single file with sound — ClipZap fetches
            the video and audio streams in parallel and merges them, which is the fastest way to get
            1080p. <strong>Audio</strong> rows include MP3 at 320/128 kbps. If a download fails,
            click generate again to get a fresh link.
          </p>
        </div>
      </div>
    </div>
  );
}
