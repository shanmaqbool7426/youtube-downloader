import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FAQ_ITEMS = [
  {
    q: 'Is this YouTube Video Downloader 1080p free?',
    a: 'Yes. Standard access is free and requires no paid subscription. You can process HD video links whenever you need.',
  },
  {
    q: 'Can I download just the audio as MP3?',
    a: 'Yes. After you paste a link, choose one of the MP3 options. HD Grab extracts the audio track at 320 kbps or 128 kbps, so you can save music, podcasts and lectures as audio only.',
  },
  {
    q: 'Why does the 1080p option sometimes not appear?',
    a: 'If the original video was uploaded to YouTube in 720p or lower, there is no 1080p version to download. We can only extract resolutions that actually exist on YouTube’s servers. In that case, 720p will be the best available option.',
  },
  {
    q: 'Why is the 1080p file missing audio?',
    a: 'YouTube uses a technique called DASH, where it stores high-resolution video streams and the audio track as two separate files. Formats marked "Video Only" do not contain audio. Use the "Video + Audio" option from the list — HD Grab automatically combines the best video stream with the audio track into a single MP4 with sound.',
  },
  {
    q: 'Is 1080p 60fps supported?',
    a: 'Yes. If the creator uploaded the video at 60 frames per second, the 1080p file will retain that smooth 60fps playback, making motion and fast content appear noticeably smoother.',
  },
  {
    q: 'Does HD increase file size significantly?',
    a: 'Generally yes. A 10-minute 1080p video is typically around 300MB, compared to roughly 150MB for 720p. We recommend connecting to Wi-Fi before downloading Full HD videos on mobile.',
  },
  {
    q: 'Does 1080p always mean better quality?',
    a: 'In most situations, Full HD provides noticeably clearer visuals compared to 720p and lower. However, if the source content was originally recorded or uploaded in lower quality, the improvement may be limited.',
  },
  {
    q: 'Why choose 1080p instead of lower resolution?',
    a: 'Because 1080p balances quality and storage effectively. It delivers excellent visual clarity without the massive file sizes of 4K, making it practical for everyday use on all modern devices.',
  },
  {
    q: 'Can I watch saved videos offline later?',
    a: 'Yes. Once processed and saved to your device, the video can be watched offline at any time without requiring an internet connection.',
  },
  {
    q: 'Is account creation required?',
    a: 'No account is required for standard usage. Simply paste your YouTube URL and process it without signing up or logging in.',
  },
  {
    q: 'Why is my video not processing?',
    a: 'Possible reasons include an invalid URL, a temporary processing issue, an unsupported video source, or network interruptions. Try copying the URL again and ensure it points directly to a playable YouTube video.',
  },
  {
    q: 'Does this work on Windows and Mac?',
    a: 'Yes. Because the tool is entirely browser-based, it works on all operating systems including Windows, macOS, Linux, Android, and iOS without any software installation.',
  },
  {
    q: 'Is 1080p enough for large displays?',
    a: 'For most users, Full HD remains an excellent everyday resolution. On very large 4K displays some upscaling may occur, but 1080p still looks sharp and clear on the vast majority of screens.',
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="section section-alt" id="faq">
      <div className="container section-inner">
        <p className="eyebrow-section">Questions &amp; answers</p>
        <h2 className="section-title">Frequently Asked Questions (FAQ)</h2>
        <p className="section-lead">
          Common questions about our YouTube Video Downloader 1080p tool.
        </p>
        <div className="faq-list">
          {FAQ_ITEMS.map((item, index) => {
            const open = openIndex === index;
            return (
              <div className={`faq-item${open ? ' open' : ''}`} key={item.q}>
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => setOpenIndex(open ? null : index)}
                  aria-expanded={open}
                >
                  {item.q}
                  <span className="faq-chevron">
                    <ChevronDown size={18} />
                  </span>
                </button>
                <div className="faq-answer">
                  <p>{item.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}