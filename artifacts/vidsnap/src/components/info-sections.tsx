import {
  MonitorPlay,
  Sparkles,
  Globe,
  Smartphone,
  Gauge,
  FileDown,
  GraduationCap,
  Briefcase,
  FolderPlus,
  Eye,
  Timer,
  TrendingUp,
  Check,
  Layers,
  ShieldCheck,
  FastForward,
} from 'lucide-react';

const STATS = [
  { value: '1920×1080', label: 'Full HD Resolution' },
  { value: '2.07M', label: 'Pixels' },
  { value: '16:9', label: 'Aspect Ratio' },
  { value: 'MP4', label: 'Format' },
];

const RESOLUTIONS = [
  { res: '360p', quality: 'Basic', size: '~60 MB', use: 'Slow connections, minimal storage.' },
  { res: '480p', quality: 'Standard', size: '~100 MB', use: 'General viewing, smaller screens.' },
  { res: '720p (HD)', quality: 'Good', size: '~150 MB', use: 'Mobile viewing, fast downloads over data.' },
  { res: '1080p (FHD)', quality: 'Excellent', size: '~300 MB', use: 'Laptops, TVs, editing, preserving details.', best: true },
  { res: '4K (UHD)', quality: 'Maximum', size: '~1.2 GB', use: 'Large 4K monitors, professional editing.' },
];

const WHY_HD = [
  {
    icon: GraduationCap,
    title: 'Better Learning Experience',
    text: 'Educational videos become easier to follow in Full HD. Tutorials, courses, and technical demos show text and details much more clearly.',
  },
  {
    icon: MonitorPlay,
    title: 'More Enjoyable Entertainment',
    text: 'Movies, interviews, and content feel more immersive in Full HD. Higher resolution enhances storytelling and overall viewing quality.',
  },
  {
    icon: Briefcase,
    title: 'Professional Reference',
    text: 'Business users revisit presentations and training materials. Higher quality improves readability of charts, slides, and on-screen text.',
  },
  {
    icon: Gauge,
    title: 'Offline Convenience',
    text: 'Buffering interruptions disappear when videos are prepared ahead of time. Offline Full HD playback stays smooth and consistent.',
  },
];

const STEPS = [
  { title: 'Open YouTube', text: 'Find the video you want to save in Full HD.' },
  { title: 'Copy the Video URL', text: 'Copy the full video link from the address bar or Share option.' },
  { title: 'Paste Into the Tool', text: 'Insert the copied URL into the downloader input above.' },
  { title: 'Process the Video', text: 'Click the button and allow the tool to prepare quality options.' },
  { title: 'Choose Quality', text: 'Select the 1080p or best available output option.' },
  { title: 'Save for Offline', text: 'Complete the process and save to your device.' },
];

const FEATURES = [
  { icon: FastForward, title: 'Fast Video Processing', text: 'Reduce waiting and prepare Full HD access quickly. Links are resolved in seconds.' },
  { icon: Layers, title: 'Full HD Support', text: 'Process available 1080p high-definition outputs with excellent visual clarity.' },
  { icon: Globe, title: 'Browser-Based Workflow', text: 'No installation needed. Everything runs directly in your browser on any platform.' },
  { icon: Smartphone, title: 'Device Compatibility', text: 'Works across desktop, laptop, tablet, and mobile devices seamlessly.' },
  { icon: Sparkles, title: 'Simple Interface', text: 'Designed for everyone. No technical knowledge required to use the tool.' },
  { icon: FileDown, title: 'Easy Access', text: 'Minimal steps, maximum convenience. Paste and process instantly.' },
];

const BENEFITS = [
  'Sharper details appear clearer and more defined at Full HD resolution.',
  'Better text visibility for tutorials, presentations, and online courses.',
  'Improved playback that feels smoother without compression artifacts.',
  'Large-screen ready on monitors, TVs, and tablets without visible pixelation.',
  'A premium, professional feel for everyday viewing content.',
];

const USE_CASES = [
  'Education — save course materials and learning videos with full clarity.',
  'Professional training — keep references and training videos accessible in high quality.',
  'Creative inspiration — organize visual content for design and creative projects.',
  'Travel preparation — access HD videos offline during flights and commutes.',
  'Personal collections — build organized libraries of preferred high-quality content.',
];

const BROWSER_BENEFITS = [
  'No installation — instant access with no setup required.',
  'Faster start — open and use immediately, no waiting.',
  'Less maintenance — no updates or version management needed.',
  'Device flexible — access from any device, anywhere.',
  'Better convenience — reduced complexity, simpler workflow.',
];

const STORAGE_TIPS = [
  'Delete duplicate files regularly',
  'Archive important files separately',
  'Categorize content by topic or type',
  'Monitor free storage before downloading',
];

const HD_TIPS = [
  'Use stable internet — connection affects processing',
  'Prepare storage space — HD files are larger',
  'Use updated browsers for best compatibility',
  'Organize saved videos in structured folders',
  'Avoid interruptions — wait for processing to complete',
];

const QUALITY_MATTERS = [
  'Higher screen resolution on modern devices',
  'Better visual clarity for content details',
  'Faster loading expectations from users',
  'Cross-device access from multiple screens',
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
      {/* What is 1080p */}
      <section className="section" id="what-is-1080p">
        <div className="container section-inner">
          <SectionHeading
            eyebrow="Understanding the tool"
            title="What Is a 1080p YouTube Video Downloader?"
            lead="A 1080p YouTube Video Downloader is an online utility that processes YouTube video links and prepares available high-definition output options for offline access. The “1080p” label refers to Full HD resolution — 1920 × 1080 pixels — which delivers clearer visuals compared to lower resolutions while maintaining broad compatibility across all modern devices."
          />
          <p>
            High-definition content has become the standard for modern video consumption. As screens
            become sharper and users expect better visual quality, Full HD remains one of the most
            preferred formats for everyday viewing.
          </p>
          <div className="stats-grid">
            {STATS.map((stat) => (
              <div className="stat-card" key={stat.label}>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resolution comparison */}
      <section className="section section-alt" id="resolution">
        <div className="container section-inner">
          <SectionHeading
            eyebrow="Resolution explained"
            title="Understanding 1080p Resolution"
            lead="1080p became popular because it balances image quality and performance. For many users, it remains the sweet spot between clarity and file size."
          />
          <div className="table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Resolution</th>
                  <th>Quality</th>
                  <th>File Size (10 min)</th>
                  <th>Best Used For</th>
                </tr>
              </thead>
              <tbody>
                {RESOLUTIONS.map((row) => (
                  <tr key={row.res} className={row.best ? 'best-choice' : ''}>
                    <td>
                      {row.res}
                      {row.best && <span className="best-badge">Best Choice</span>}
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
            File sizes vary depending on framerate (30fps vs 60fps) and video content complexity.
          </p>
        </div>
      </section>

      {/* Why prefer HD */}
      <section className="section" id="why-hd">
        <div className="container section-inner">
          <SectionHeading
            eyebrow="Why quality matters"
            title="Why People Prefer HD Video Downloads"
            lead="Different users prioritize video quality for different practical reasons. Higher resolution directly affects the overall viewing experience."
          />
          <div className="cards-grid two">
            {WHY_HD.map((card) => (
              <div className="info-card" key={card.title}>
                <div className="info-card-icon">
                  <card.icon size={22} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to use */}
      <section className="section section-alt" id="how-to-use">
        <div className="container section-inner">
          <SectionHeading
            eyebrow="Quick start"
            title="How to Use This 1080p Downloader"
            lead="Getting started is straightforward. The entire process is designed to be completed in under a minute."
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

      {/* Features */}
      <section className="section" id="features">
        <div className="container section-inner">
          <SectionHeading
            eyebrow="Built for speed"
            title="Features of Our YouTube Video Downloader 1080p"
            lead="Our tool is designed for usability and speed. Every feature is built to simplify the HD download experience."
          />
          <div className="cards-grid">
            {FEATURES.map((feature) => (
              <div className="info-card" key={feature.title}>
                <div className="info-card-icon">
                  <feature.icon size={22} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section section-alt" id="benefits">
        <div className="container section-inner">
          <SectionHeading
            eyebrow="See the difference"
            title="Benefits of Watching Videos in Full HD"
            lead="Higher resolution affects the overall experience in meaningful ways. Here is what 1080p brings to your viewing."
          />
          <ul className="check-list">
            {BENEFITS.map((benefit) => (
              <li key={benefit}>
                <span className="check-icon">
                  <Check size={18} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Use cases */}
      <section className="section" id="use-cases">
        <div className="container section-inner">
          <SectionHeading
            eyebrow="Everyday scenarios"
            title="Common Use Cases for HD Video Access"
            lead="People often prefer HD video across many different everyday scenarios."
          />
          <ul className="check-list">
            {USE_CASES.map((useCase) => (
              <li key={useCase}>
                <span className="check-icon">
                  <Check size={18} />
                </span>
                {useCase}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Browser vs software */}
      <section className="section section-alt" id="browser-vs">
        <div className="container section-inner">
          <SectionHeading
            eyebrow="No install needed"
            title="Browser-Based vs Traditional Software"
            lead="Modern users increasingly prefer browser workflows for downloading content."
          />
          <div className="two-col">
            <div>
              <ul className="check-list">
                {BROWSER_BENEFITS.map((benefit) => (
                  <li key={benefit}>
                    <span className="check-icon">
                      <Check size={18} />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="section-title" style={{ fontSize: '1.125rem' }}>
                Storage Considerations for HD Content
              </h3>
              <p>Higher quality often increases file size. Helpful organization practices:</p>
              <ul className="check-list">
                {STORAGE_TIPS.map((tip) => (
                  <li key={tip}>
                    <span className="check-icon">
                      <FolderPlus size={18} />
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
              <h3 className="section-title" style={{ fontSize: '1.125rem', marginTop: '1.5rem' }}>
                Tips for Better 1080p Experience
              </h3>
              <ul className="check-list">
                {HD_TIPS.map((tip) => (
                  <li key={tip}>
                    <span className="check-icon">
                      <ShieldCheck size={18} />
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why quality matters */}
      <section className="section" id="quality-matters">
        <div className="container section-inner">
          <SectionHeading
            eyebrow="The bigger picture"
            title="Why Video Quality Matters More Today"
            lead="Users consume content differently than before. Today’s expectations have fundamentally changed, and Full HD remains one of the most practical standards for everyday use."
          />
          <div className="two-col">
            <ul className="check-list">
              {QUALITY_MATTERS.map((reason) => (
                <li key={reason}>
                  <span className="check-icon">
                    <TrendingUp size={18} />
                  </span>
                  {reason}
                </li>
              ))}
            </ul>
            <div
              className="info-card"
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}
            >
              <span className="info-card-icon" style={{ marginBottom: 0 }}>
                <Eye size={22} />
              </span>
              <p style={{ margin: 0 }}>
                Higher screen resolutions and better visual clarity mean users notice the difference
                between standard and Full HD playback more than ever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Responsible usage */}
      <section className="section section-alt" id="responsible">
        <div className="container section-inner">
          <SectionHeading
            eyebrow="Use it wisely"
            title="Responsible Content Usage"
          />
          <p>
            Video platforms support creators through engagement and official viewing experiences.
            Creators depend on views, subscriptions, and community interaction for their work, and
            some services provide official offline access depending on availability and region.
          </p>
          <p>
            Whenever working with saved content, make sure usage aligns with permissions, rights, and
            applicable platform expectations. Supporting creators helps maintain healthy content
            ecosystems — always respect creator rights and platform guidelines.
          </p>
        </div>
      </section>

      {/* Disclaimer footnote */}
      <section className="section" id="misc">
        <div className="container section-inner">
          <SectionHeading eyebrow="Note" title="1080p availability" />
          <p>
            If the original video was uploaded to YouTube in 720p or lower, there is no 1080p version
            to download — we can only extract resolutions that actually exist on YouTube’s servers.
            In that case, 720p will be the best available option.
          </p>
          <p className="table-note" style={{ marginTop: '0.5rem' }}>
            <Timer size={14} style={{ verticalAlign: '-2px', marginRight: '0.25rem' }} />
            Video + Audio entries include sound. Entries marked “Video Only” are DASH streams and may
            not contain audio.
          </p>
        </div>
      </section>
    </>
  );
}