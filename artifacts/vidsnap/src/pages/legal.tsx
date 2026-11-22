import type { ReactNode } from 'react';

const UPDATED = 'November 22, 2026';

function LegalLayout({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main id="main" className="legal container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{title}</span>
      </nav>
      <h1>{title}</h1>
      <p className="legal-updated">Last updated: {UPDATED}</p>
      <p className="legal-intro">{intro}</p>
      <div className="legal-body">{children}</div>
    </main>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro="HD Grab is built to collect as little as possible. There are no accounts, no advertising trackers and no analytics cookies. This page explains exactly what happens to the data involved when you use the downloader."
    >
      <h2>What we process</h2>
      <ul>
        <li>
          <strong>The video link you paste.</strong> It is sent to our server only so we can look
          up the available formats and prepare your download. We do not keep a history of the
          links you submit.
        </li>
        <li>
          <strong>Your IP address.</strong> It is held briefly in memory to enforce fair-use rate
          limits, so one visitor cannot overload the service. It is not written to a database or
          linked to any profile.
        </li>
        <li>
          <strong>Basic server logs.</strong> Like most websites, our server records technical
          request details (the page or endpoint requested, the response status and the time) to
          keep the service running and to diagnose errors. Video links and query strings are not
          included in these logs.
        </li>
      </ul>

      <h2>Video files</h2>
      <p>
        Downloads are streamed directly to your browser. When a format needs the video and audio
        tracks merged, the merge happens in a temporary folder on our server that is deleted as
        soon as the file has been sent. We never build a library of downloaded videos.
      </p>

      <h2>Cookies and tracking</h2>
      <p>
        HD Grab does not set advertising or analytics cookies and does not use cross-site
        tracking. Fonts are loaded from Google Fonts, which means your browser connects to Google
        to fetch them; Google's own privacy policy applies to that request.
      </p>

      <h2>Hosting and security</h2>
      <p>
        The site is hosted by a third-party cloud provider and served over an encrypted HTTPS
        connection. Our hosting providers process traffic only to deliver the service.
      </p>

      <h2>Children</h2>
      <p>
        HD Grab is a general-audience tool and does not knowingly collect personal information
        from children.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If the way we handle data changes, we will update this page and the date at the top.
      </p>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Use"
      intro="By using HD Grab you agree to these terms. They are short because the service is simple: a free tool for saving videos you are allowed to save, for personal use."
    >
      <h2>Using the service</h2>
      <p>
        HD Grab lets you save publicly available videos for personal, offline viewing. You are
        responsible for how you use the tool and for the files you download with it.
      </p>

      <h2>Respect copyright</h2>
      <p>
        Only download content that you own, that is in the public domain, that is shared under a
        licence permitting downloads (such as Creative Commons), or that you have the creator's
        permission to save. Do not re-upload, sell or redistribute other people's work. Please
        also follow the terms of the platform where the video is hosted.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>No automated or bulk scraping, and no attempts to bypass rate limits.</li>
        <li>No use of the service to infringe intellectual property or privacy rights.</li>
        <li>No attempts to disrupt, overload or gain unauthorised access to the service.</li>
      </ul>

      <h2>No affiliation</h2>
      <p>
        HD Grab is an independent tool and is not affiliated with, endorsed by or sponsored by
        YouTube or Google LLC. YouTube is a trademark of Google LLC.
      </p>

      <h2>Availability and warranty</h2>
      <p>
        The service is provided free of charge, "as is" and without warranties of any kind. Some
        videos or formats may be unavailable, and we may change, limit or discontinue the service
        at any time.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, HD Grab is not liable for any damages arising
        from your use of the service or of content you download.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms from time to time. Continuing to use HD Grab after a change
        means you accept the updated terms.
      </p>
    </LegalLayout>
  );
}
