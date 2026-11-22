import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FAQ_ITEMS = [
  {
    q: 'Is ClipZap free, and do I need an account?',
    a: 'It is free and needs no account. There is no sign-up, no app to install and no paid tier — you paste a link and pick a format.',
  },
  {
    q: 'Can I download just the audio as MP3?',
    a: 'Yes. The Audio only group offers MP3 at 320 kbps or 128 kbps, plus the original M4A track. Those rows download no video at all.',
  },
  {
    q: 'Why is 1080p missing for some videos?',
    a: 'ClipZap only lists what YouTube returns for that link. If the upload itself is 720p, or the video is still processing, or the Full HD rendition is restricted, no 1080p file exists to fetch. The results panel says when 1080p is unavailable and why.',
  },
  {
    q: 'Why did my downloaded video have no sound?',
    a: 'YouTube stores 1080p and above as separate video and audio streams. Rows under More formats are the video stream on its own. Choose a row from Video with audio instead — those are assembled into one MP4 that includes sound.',
  },
  {
    q: 'Is 1080p 60fps supported?',
    a: 'Yes. If the creator uploaded at 60 frames per second, the 1080p row keeps that frame rate, and the label shows it. Motion and fast action stay noticeably smoother.',
  },
  {
    q: 'Are the file sizes exact?',
    a: 'A plain number is the exact size YouTube reports. A number prefixed with “~” is an estimate: merged rows add the video and audio sizes together, and MP3 rows are calculated from the duration. The saved file is the same either way.',
  },
  {
    q: 'Why did my link fail to load?',
    a: 'The message above the field names the reason. Private, deleted, members-only and age-restricted videos cannot be read at all. If the server was busy or the request timed out, the same link usually works on a second attempt — ClipZap offers Try again when retrying can help.',
  },
  {
    q: 'Does it work on iPhone, Android, Windows and Mac?',
    a: 'Yes, because everything runs in the browser. Files land in your browser’s download folder rather than in Photos, so the help page on finding downloads shows the exact path on each platform.',
  },
  {
    q: 'Is 1080p good enough for a large screen?',
    a: 'For almost everyone, yes. Full HD looks sharp on laptops, tablets and TVs. On a very large 4K monitor some upscaling is visible, and the 4K row appears whenever YouTube offers one. Full HD also only helps if the source was recorded at that quality.',
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="section section-alt" id="faq">
      <div className="container section-inner">
        <p className="eyebrow-section">Questions &amp; answers</p>
        <h2 className="section-title">Frequently asked questions</h2>
        <p className="section-lead">
          Short answers to what people ask most. The troubleshooting section above links to the
          longer explanations.
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