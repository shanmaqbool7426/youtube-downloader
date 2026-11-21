import { useEffect, useRef, useState, type FormEvent } from "react";
import { getDownloadLink, getVideoInfo, type DownloadResult, type VideoInfo } from "@workspace/api-client-react";
import { AlertCircle, ArrowDownToLine, ArrowRight, Check, Clipboard, Film, Github, Link2, LoaderCircle, Music2, X } from "lucide-react";
import { SiFacebook, SiInstagram, SiTiktok, SiX, SiYoutube } from "react-icons/si";

const repository = "https://github.com/shanmaqbool7426/youtube-downloader";

function requestError(error: unknown) {
  if (error && typeof error === "object" && "data" in error &&
      error.data && typeof error.data === "object" && "error" in error.data &&
      typeof error.data.error === "string") {
    return error.data.error;
  }
  return "Couldn’t reach VidSnap. Check your connection and try again.";
}

export default function App() {
  const [url, setUrl] = useState("");
  const [video, setVideo] = useState<VideoInfo>();
  const [format, setFormat] = useState("");
  const [ready, setReady] = useState<DownloadResult>();
  const [expires, setExpires] = useState(false);
  const [pending, setPending] = useState<"lookup" | "download">();
  const [error, setError] = useState("");
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const active = useRef<AbortController>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const saveLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => { if (video) resultHeading.current?.focus(); }, [video]);
  useEffect(() => {
    if (!ready) return;
    saveLink.current?.focus();
    const timer = window.setTimeout(() => setExpires(true), 9 * 60_000);
    return () => window.clearTimeout(timer);
  }, [ready]);

  function updateUrl(value: string) {
    setUrl(value);
    setError("");
    setVideo(undefined);
    setReady(undefined);
  }

  async function paste() {
    try {
      const value = (await navigator.clipboard.readText()).trim();
      if (active.current) return;
      if (value) updateUrl(value);
      else setError("Copy a video link, then try Paste again.");
    } catch {
      setError("Paste the link directly into the video link field.");
    }
    urlInput.current?.focus();
  }

  async function run<T>(phase: NonNullable<typeof pending>, action: (signal: AbortSignal) => Promise<T>, onSuccess: (result: T) => void) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setPending(phase);
    setError("");
    setReady(undefined);
    setExpires(false);
    try {
      const result = await action(controller.signal);
      if (!controller.signal.aborted) onSuccess(result);
    } catch (failure) {
      if (!controller.signal.aborted) setError(requestError(failure));
    } finally {
      if (active.current === controller) {
        active.current = null;
        setPending(undefined);
      }
    }
  }

  function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim()) return;
    setVideo(undefined);
    setThumbnailFailed(false);
    void run("lookup", (signal) => getVideoInfo({ url: url.trim() }, { signal }), (result) => {
      setFormat(result.formats.find((option) => option.quality === "720p")?.quality ?? result.formats[0]?.quality ?? "");
      setVideo(result);
    });
  }

  function download() {
    void run("download", (signal) => getDownloadLink({ url: url.trim(), format }, { signal }), setReady);
  }

  const selected = video?.formats.find((option) => option.quality === format);
  const status = pending === "lookup" ? "Checking the video link…"
    : pending === "download" ? "Preparing your file. Larger videos may take a little longer."
    : expires ? "This link may have expired. Prepare a fresh copy to download again."
    : ready ? "Your file is ready." : "";

  return (
    <div className="page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="VidSnap home">
          <span className="brand-mark"><ArrowDownToLine size={20} /></span>
          VidSnap
        </a>
        <a className="source-link" href={repository}><Github size={18} /> GitHub</a>
      </header>

      <main>
        <section className="intro">
          <h1>Download a video.<br /><span>Keep it as MP4 or MP3.</span></h1>
          <p>Paste a public video link to see which formats are available.</p>
        </section>

        <section className="workspace" aria-label="Video downloader">
          <form onSubmit={lookup}>
            <label className="field-label" htmlFor="video-link">Video link</label>
            <div className="form-row">
              <div className="input-group">
                <Link2 size={20} aria-hidden="true" />
                <input id="video-link" ref={urlInput} type="url" inputMode="url" required
                  autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={2048}
                  placeholder="https://…" value={url} disabled={!!pending}
                  onChange={(event) => updateUrl(event.target.value)}
                  aria-describedby="source-help" />
                <button type="button" className="paste" onClick={paste} disabled={!!pending}>
                  <Clipboard size={16} aria-hidden="true" /> Paste
                </button>
              </div>
              <button className="primary" type="submit" disabled={!url.trim() || !!pending}>
                {pending === "lookup" ? <LoaderCircle className="spinner" size={18} /> : <ArrowRight size={18} />}
                Find video
              </button>
            </div>
            <p className="platforms" id="source-help">
              <span><SiYoutube /> YouTube</span><span><SiInstagram /> Instagram</span>
              <span><SiTiktok /> TikTok</span><span><SiFacebook /> Facebook</span>
              <span><SiX /> X</span><span>Dailymotion</span>
            </p>
          </form>

          {video && (
            <section className="result" aria-labelledby="video-title">
              <div className="media-art">
                {video.thumbnail && !thumbnailFailed
                  ? <img src={video.thumbnail} alt="" onError={() => setThumbnailFailed(true)} referrerPolicy="no-referrer" />
                  : <Film size={32} aria-hidden="true" />}
                <span className="duration">{video.duration}</span>
              </div>
              <div className="video-details">
                <p className="platform-name">{video.platform}</p>
                <h2 id="video-title" tabIndex={-1} ref={resultHeading}>{video.title}</h2>
                <fieldset disabled={!!pending} className="formats">
                  <legend className="field-label">Choose a format</legend>
                  {video.formats.map((option) => (
                    <label className="format-option" key={option.quality}>
                      <input type="radio" name="format" value={option.quality}
                        checked={format === option.quality} onChange={() => {
                          setFormat(option.quality);
                          setReady(undefined);
                          setExpires(false);
                          setError("");
                        }} />
                      <span>
                        {option.format === "mp3" ? <Music2 size={16} /> : <Film size={16} />}
                        {option.label}
                      </span>
                    </label>
                  ))}
                </fieldset>
                <div className="download-actions">
                  {ready && !expires ? (
                    <>
                      <a className="primary" href={ready.downloadUrl} download={ready.filename} ref={saveLink}>
                        <ArrowDownToLine size={18} /> Save {selected?.format.toUpperCase()}
                      </a>
                      <button className="cancel" type="button" onClick={download}>Prepare again</button>
                    </>
                  ) : (
                    <button className="primary" type="button" onClick={download} disabled={!selected || !!pending}>
                      {pending === "download" ? <LoaderCircle className="spinner" size={18} /> : <ArrowDownToLine size={18} />}
                      {expires ? "Prepare again" : "Prepare " + (selected?.format.toUpperCase() ?? "download")}
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          <div className="feedback" aria-live="polite" role="status">
            {status && <p>{ready && !expires && <Check size={18} />}{status}</p>}
            {pending && <button type="button" className="cancel" onClick={() => {
              active.current?.abort();
              active.current = null;
              setPending(undefined);
            }}><X size={16} /> Cancel</button>}
          </div>

          {error && <p className="error" role="alert"><AlertCircle size={18} /> {error}</p>}
        </section>

        <p className="note">Public, recorded videos up to 30 minutes and 128 MB. Download only content you own or have permission to save.</p>
      </main>
    </div>
  );
}
