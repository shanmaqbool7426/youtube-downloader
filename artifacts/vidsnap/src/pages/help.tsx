import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Standalone answers for the three questions the downloader raises most.
 *
 * Each page is written to be useful on its own — someone can land here from a
 * search result, read the cause, act on it, and only then be pointed back at
 * the tool. They are not thin doorway pages: every step matches behaviour the
 * downloader actually has.
 */
function HelpLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main id="main" className="doc container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span aria-hidden="true">/</span>
        <a href="/#troubleshooting">Help</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{title}</span>
      </nav>
      <h1>{title}</h1>
      <p className="doc-intro">{intro}</p>
      <div className="doc-body">{children}</div>
      <a className="doc-cta" href="/#downloader">
        Open the downloader
        <ArrowRight size={16} aria-hidden="true" />
      </a>
    </main>
  );
}

export function MissingAudioPage() {
  return (
    <HelpLayout
      title="Why a downloaded video has no sound"
      intro="Almost always this is a format choice, not a bug. YouTube keeps high-resolution video and audio in separate files, and a row in More formats is picture only."
    >
      <h2>The short answer</h2>
      <p>
        Pick a row from <strong>Video with audio</strong> instead of <strong>More formats</strong>.
        Rows in the first group are assembled into a single MP4 that contains both a video and an
        audio track. Rows in <strong>More formats</strong> are the raw high-bitrate video stream on
        its own — they play perfectly but silently, because that is how YouTube serves them.
      </p>

      <h2>How to tell the rows apart</h2>
      <p>Every row states its contents before you download anything:</p>
      <ul>
        <li>
          <strong>With audio</strong> — one finished file. This is what you want for watching or
          sharing.
        </li>
        <li>
          <strong>No audio</strong> — video only. Useful if you plan to add your own music or
          voice-over.
        </li>
        <li>
          <strong>Audio only</strong> — MP3 or M4A. No picture at all.
        </li>
      </ul>
      <p>
        A label like <strong>MP4 · 1080p · With audio · 190.6 MB</strong> is the complete
        description: container, resolution, whether sound is included, and the size.
      </p>

      <h2>Why YouTube does it this way</h2>
      <p>
        YouTube stores 1080p and above as separate video and audio streams (the DASH format) so it
        can switch quality without re-sending audio. Only lower resolutions like 360p are offered as
        a single pre-mixed file. Any downloader that offers a 1080p file with sound has to fetch both
        streams and join them — which is exactly what ClipZap does for every Video with audio row.
      </p>

      <h2>If a With audio row fails</h2>
      <p>
        Joining two streams takes longer than a plain download, so a very long video can time out or
        lose its connection. The row tells you what happened:
      </p>
      <ol>
        <li>
          <strong>Preparing…</strong> — both streams are being fetched and joined. Ten minutes of
          1080p usually takes 20–60 seconds.
        </li>
        <li>
          <strong>Ready</strong> — the finished file has been handed to your browser.
        </li>
        <li>
          <strong>Try again</strong> with a message — nothing was saved. Copy the link again, or pick
          the next resolution down.
        </li>
      </ol>

      <h2>Still no sound after saving?</h2>
      <p>
        Check the file with another player. Some lightweight mobile players ignore the audio track in
        an MP4 they do not fully support; VLC or your phone&apos;s built-in player will play it. If
        the same file is silent everywhere and the row said With audio, save it again — a partial
        transfer is the usual cause.
      </p>

      <p className="doc-related">
        Related: <a href="/help/missing-1080p">why 1080p is sometimes missing</a> ·{' '}
        <a href="/help/find-downloads">where the file lands on your phone</a>
      </p>
    </HelpLayout>
  );
}

export function Missing1080pPage() {
  return (
    <HelpLayout
      title="Why 1080p is not always available"
      intro="ClipZap lists the formats YouTube actually returns for the link you paste. When 1080p is absent, it is absent at the source — no downloader can produce a resolution that was never uploaded."
    >
      <h2>The short answer</h2>
      <p>
        Check the video on YouTube itself: open the player, tap the gear or the quality label and read
        the highest option. If YouTube&apos;s own menu stops at 720p, there is no 1080p file to
        download. ClipZap will show 720p as the highest Video with audio row, and the results panel
        says so explicitly.
      </p>

      <h2>The four usual causes</h2>
      <ol>
        <li>
          <strong>The upload is not Full HD.</strong> Plenty of videos were recorded or exported at
          720p and never re-uploaded. This is by far the most common reason.
        </li>
        <li>
          <strong>The video is still being processed.</strong> A freshly published upload can serve
          low resolutions for a while before the higher ones appear. Try again in an hour.
        </li>
        <li>
          <strong>It is a live stream or premiere.</strong> Live content has no fixed set of
          downloadable renditions until the stream ends and YouTube finishes processing it.
        </li>
        <li>
          <strong>The 1080p rendition is region- or account-restricted.</strong> Some videos expose
          different renditions to different countries, and age-restricted or members-only videos are
          not readable at all. ClipZap tells you when a link falls into this group rather than
          pretending the video does not exist.
        </li>
      </ol>

      <h2>What to do instead</h2>
      <ul>
        <li>
          Take the highest <strong>Video with audio</strong> row that is listed. It is the best
          complete file available for that link.
        </li>
        <li>
          If a higher resolution appears in <strong>More formats</strong> but not in Video with audio,
          that is a video-only stream — see{' '}
          <a href="/help/missing-audio">why a download has no sound</a> before choosing it.
        </li>
        <li>
          For audio alone, the <strong>Audio only</strong> group gives MP3 at 320 kbps or 128 kbps
          regardless of the video resolution.
        </li>
      </ul>

      <h2>Why clipzap does not just upscale</h2>
      <p>
        Re-encoding a 720p file into a 1080p container would make the size label bigger and the
        picture no better. The results list therefore only ever contains formats the provider
        returned for that specific video, with the size YouTube reports for each one.
      </p>

      <p className="doc-related">
        Related: <a href="/help/missing-audio">fixing a silent download</a> ·{' '}
        <a href="/help/find-downloads">finding the saved file</a>
      </p>
    </HelpLayout>
  );
}

export function FindDownloadsPage() {
  return (
    <HelpLayout
      title="Where downloads go on iPhone and Android"
      intro="ClipZap hands the finished file to your browser, so your browser decides where it lands. Here is the exact path on each platform."
    >
      <h2>iPhone and iPad</h2>
      <p>
        Safari saves to the Downloads folder inside the Files app, not to Photos. The file will not
        appear in your camera roll.
      </p>
      <ol>
        <li>Open the <strong>Files</strong> app.</li>
        <li>
          Tap <strong>Browse</strong>, then <strong>On My iPhone</strong> (or On My iPad), then{' '}
          <strong>Downloads</strong>.
        </li>
        <li>
          If you just downloaded it, the <strong>Recents</strong> tab at the bottom is faster — the
          file sorts to the top.
        </li>
      </ol>
      <p>
        While a download is running, the Safari address bar shows a small progress circle. Tapping it
        opens the downloads list directly. To move a video into Photos, open it from Files and use
        Share → Save Video.
      </p>
      <p>
        If you use Chrome on iOS instead of Safari, look in Chrome&apos;s own Downloads screen (three
        dots → Downloads) — those files live inside Chrome&apos;s storage, not the Files app.
      </p>

      <h2>Android</h2>
      <ol>
        <li>Open your file manager — <strong>Files by Google</strong>, My Files, or your device&apos;s equivalent.</li>
        <li>
          Go to <strong>Downloads</strong>. Chrome, Firefox and Samsung Internet all write here by
          default.
        </li>
        <li>
          In Chrome you can also open the three-dot menu → <strong>Downloads</strong> to see the list
          and open the file straight away.
        </li>
      </ol>
      <p>
        Videos land in the shared Downloads folder, so any gallery app that indexes that folder will
        show them too — usually within a minute of the download finishing.
      </p>

      <h2>Desktop</h2>
      <p>
        Files go to your browser&apos;s default download location, typically <code>Downloads</code> in
        your home folder. Press <kbd>Ctrl</kbd>+<kbd>J</kbd> (Windows/Linux) or{' '}
        <kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>Y</kbd> (Chrome on macOS) to open the browser&apos;s
        download list and locate the most recent file.
      </p>

      <h2>If nothing was saved</h2>
      <ul>
        <li>
          A row that ends in <strong>Try again</strong> did not save a file — the download failed
          before your browser received anything. Run it once more.
        </li>
        <li>
          Check free space. An hour of 1080p can run past 1 GB, and a full disk usually fails
          silently at the end of the transfer.
        </li>
        <li>
          Private/incognito windows discard downloads when the window closes. Download in a normal
          window if you want to keep the file.
        </li>
      </ul>

      <p className="doc-related">
        Related: <a href="/help/missing-audio">a saved video with no sound</a> ·{' '}
        <a href="/help/missing-1080p">missing 1080p formats</a>
      </p>
    </HelpLayout>
  );
}
