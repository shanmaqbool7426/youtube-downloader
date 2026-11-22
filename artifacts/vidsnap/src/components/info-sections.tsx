import { FileQuestion, FolderOpen, Headphones, HelpCircle, ShieldCheck } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

const STEPS = [
  {
    title: 'Copy the video link',
    text: 'Open the video on YouTube and copy the address. The Share button gives you a youtu.be link, which works too.',
  },
  {
    title: 'Paste it above',
    text: 'Paste into the field and choose Show download options. ClipZap reads the formats YouTube actually offers for that video.',
  },
  {
    title: 'Download your file',
    text: 'Pick a row and the file saves to your device. MP4 rows keep the sound; MP3 rows are audio only.',
  },
];

const RESOLUTIONS = [
  { res: '360p', quality: 'Basic', size: '~60 MB', use: 'Slow connections, minimal storage.' },
  { res: '480p', quality: 'Standard', size: '~100 MB', use: 'General viewing, smaller screens.' },
  { res: '720p (HD)', quality: 'Good', size: '~150 MB', use: 'Mobile viewing, fast downloads over data.' },
  { res: '1080p (FHD)', quality: 'Excellent', size: '~300 MB', use: 'Laptops, TVs, editing, preserving detail.', best: true },
  { res: '4K (UHD)', quality: 'Maximum', size: '~1.2 GB', use: 'Large 4K monitors, professional editing.' },
];

const PROBLEMS = [
  {
    icon: Headphones,
    title: 'The file has no sound',
    text: 'YouTube stores high-resolution video and audio separately. Rows in More formats are picture only by design.',
    href: '/help/missing-audio',
    linkLabel: 'Fix missing audio',
  },
  {
    icon: FileQuestion,
    title: '1080p is not listed',
    text: 'ClipZap can only offer what YouTube serves for that link. If the upload is 720p, no 1080p file exists to fetch.',
    href: '/help/missing-1080p',
    linkLabel: 'Why 1080p goes missing',
  },
  {
    icon: FolderOpen,
    title: 'I cannot find the saved file',
    text: 'Phones hide downloads in different places than desktops. Both take two taps once you know where to look.',
    href: '/help/find-downloads',
    linkLabel: 'Find the file on iPhone or Android',
  },
  {
    icon: HelpCircle,
    title: 'The link will not load',
    text: 'Private, deleted, members-only and age-restricted videos cannot be read. A busy server or a timeout also needs a short retry.',
    href: '#faq',
    linkLabel: 'Read the FAQ',
  },
];

function SectionHeading({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <>
      <p className="eyebrow-section">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      {lead && <p className="section-lead">{lead}</p>}
    </>
  );
}

export function InfoSections() {
  return (
    <>
      {/* 1. Three-step guide */}
      <section className="section" id="how-to-use">
        <div className="container section-inner">
          <SectionHeading
            eyebrow="Three steps"
            title="How to download a YouTube video in 1080p"
            lead="No account, no extension, no install. The whole flow runs in the browser."
          />
          <div className="numbered-steps">
            {STEPS.map((step, index) => (
              <div className="numbered-step" key={step.title}>
                <div className="numbered-step-num">{index + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Compact quality comparison */}
      <section className="section section-alt" id="resolution">
        <div className="container section-inner">
          <SectionHeading
            eyebrow="Pick the right size"
            title="What each quality actually gives you"
            lead="1080p is 1920 × 1080 pixels — Full HD, and the usual sweet spot between clarity and file size."
          />
          <div className="table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Resolution</th>
                  <th>Quality</th>
                  <th>File size (10 min)</th>
                  <th>Best for</th>
                </tr>
              </thead>
              <tbody>
                {RESOLUTIONS.map((row) => (
                  <tr key={row.res} className={row.best ? 'best-choice' : ''}>
                    <td>
                      {row.res}
                      {row.best && <span className="best-badge">Best choice</span>}
                    </td>
                    <td>{row.quality}</td>
                    <td>{row.size}</td>
                    <td>{row.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-note">
            Sizes are typical for a 10-minute clip and vary with frame rate and scene complexity. The
            downloader always shows the size YouTube reports for the specific video you paste.
          </p>
          <p className="table-note">
            If the upload itself is 720p or lower, no 1080p version exists to fetch — the highest
            available row is the best you can get. Live streams and premieres may also return fewer
            formats.
          </p>
        </div>
      </section>

      {/* 3. Troubleshooting */}
      <section className="section" id="troubleshooting">
        <div className="container section-inner">
          <SectionHeading
            eyebrow="When something looks off"
            title="Troubleshooting the four common cases"
            lead="Each one has a short cause and a short fix. None of them require installing anything."
          />
          <div className="cards-grid two">
            {PROBLEMS.map((problem) => (
              <div className="info-card" key={problem.title}>
                <div className="info-card-icon">
                  <problem.icon size={22} aria-hidden="true" />
                </div>
                <h3>{problem.title}</h3>
                <p>{problem.text}</p>
                <a className="card-link" href={problem.href}>
                  {problem.linkLabel}
                  <ArrowRight size={15} aria-hidden="true" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Responsible use — kept out of the way of the downloader */}
      <section className="section section-alt" id="responsible">
        <div className="container section-inner">
          <SectionHeading eyebrow="Use it wisely" title="Responsible content usage" />
          <p>
            Creators are paid through views, subscriptions and official downloads. Saving a copy is
            reasonable for content you own, content published under a permissive licence, or content
            you have permission to keep — and for anything your local law allows.
          </p>
          <p>
            ClipZap does not host videos. Files are assembled and streamed to you directly, and the
            privacy policy explains exactly what is and is not logged. Read the{' '}
            <a href="/terms">terms of use</a> and the <a href="/privacy">privacy policy</a> for the
            details.
          </p>
          <p className="table-note">
            <ShieldCheck size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '0.25rem' }} />
            ClipZap is not affiliated with YouTube or Google LLC.
          </p>
        </div>
      </section>
    </>
  );
}
