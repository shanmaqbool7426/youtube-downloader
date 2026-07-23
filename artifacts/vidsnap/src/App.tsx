import React, { useState, useEffect, FormEvent } from 'react';
import { 
  useGetVideoInfo, 
  useGetDownloadLink 
} from '@workspace/api-client-react';
import { 
  Zap, 
  Link as LinkIcon, 
  Settings2, 
  Download, 
  AlertCircle,
  Github
} from 'lucide-react';
import { 
  SiYoutube, 
  SiInstagram, 
  SiFacebook, 
  SiTiktok, 
  SiX 
} from 'react-icons/si';

import type { VideoInfo } from '@workspace/api-client-react';

const detectPlatform = (url: string) => {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'YouTube';
  if (lowerUrl.includes('instagram.com')) return 'Instagram';
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) return 'Facebook';
  if (lowerUrl.includes('tiktok.com')) return 'TikTok';
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'X';
  return null;
};

const getPlatformIcon = (platform: string | null) => {
  switch (platform) {
    case 'YouTube': return <SiYoutube />;
    case 'Instagram': return <SiInstagram />;
    case 'Facebook': return <SiFacebook />;
    case 'TikTok': return <SiTiktok />;
    case 'X': return <SiX />;
    default: return <LinkIcon />;
  }
};

export default function App() {
  const [url, setUrl] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoInfoMutation = useGetVideoInfo();
  const downloadMutation = useGetDownloadLink();

  useEffect(() => {
    setDetectedPlatform(detectPlatform(url));
  }, [url]);

  const handleGetInfo = (e: FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setErrorMsg(null);
    setVideoInfo(null);
    setSelectedFormat('');

    videoInfoMutation.mutate({ data: { url } }, {
      onSuccess: (data) => {
        setVideoInfo(data);
        if (data.formats && data.formats.length > 0) {
          // Schema formats array items have { quality, format, label }
          // DownloadInput expects `format` field to be one of the keys like '360p', which corresponds to `quality` in VideoFormat.
          setSelectedFormat(data.formats[0].quality);
        }
      },
      onError: (err: any) => {
        setErrorMsg(err?.response?.data?.error || 'Failed to fetch video information.');
      }
    });
  };

  const handleDownload = () => {
    if (!url || !selectedFormat) return;

    downloadMutation.mutate({ data: { url, format: selectedFormat } }, {
      onSuccess: (data) => {
        window.open(data.downloadUrl, '_blank');
      },
      onError: (err: any) => {
        setErrorMsg(err?.response?.data?.error || 'Failed to generate download link.');
      }
    });
  };

  return (
    <div className="container">
      {/* NAVBAR */}
      <header className="header">
        <a href="/" className="logo">
          <Zap className="logo-icon" size={28} />
          <span className="logo-text-accent">VidSnap</span>
        </a>
        <a href="#" className="nav-link" data-testid="link-github">
          <Github size={20} />
          <span>GitHub</span>
        </a>
      </header>

      {/* HERO */}
      <section className="hero">
        <h1 className="hero-title">Download Any Video Instantly</h1>
        <p className="hero-subtitle">
          YouTube, Instagram, Facebook, TikTok &amp; more — fast, free, no limits.
        </p>
        <div className="platforms">
          <a href="#" className="platform-icon yt" title="YouTube" data-testid="icon-youtube"><SiYoutube /></a>
          <a href="#" className="platform-icon ig" title="Instagram" data-testid="icon-instagram"><SiInstagram /></a>
          <a href="#" className="platform-icon fb" title="Facebook" data-testid="icon-facebook"><SiFacebook /></a>
          <a href="#" className="platform-icon tt" title="TikTok" data-testid="icon-tiktok"><SiTiktok /></a>
          <a href="#" className="platform-icon x" title="X (Twitter)" data-testid="icon-x"><SiX /></a>
        </div>
      </section>

      {/* INPUT SECTION */}
      <section className="input-section">
        <form className="input-form" onSubmit={handleGetInfo}>
          <div className="input-wrapper">
            <div className="input-detected-icon">
              {getPlatformIcon(detectedPlatform)}
            </div>
            <input
              type="url"
              className="url-input"
              placeholder="Paste video URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={videoInfoMutation.isPending}
              data-testid="input-url"
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={!url || videoInfoMutation.isPending}
            data-testid="button-get-info"
          >
            {videoInfoMutation.isPending ? (
              <>
                <span className="spinner" /> Fetching...
              </>
            ) : (
              'Get Video Info'
            )}
          </button>
        </form>
        {errorMsg && (
          <div className="error-message" data-testid="error-message">
            <AlertCircle size={18} />
            {errorMsg}
          </div>
        )}
      </section>

      {/* VIDEO INFO CARD */}
      {videoInfo && (
        <section className="video-card" data-testid="card-video-info">
          <div className="video-thumbnail">
            <img src={videoInfo.thumbnail} alt={videoInfo.title} data-testid="img-thumbnail" />
            <div className="video-duration" data-testid="text-duration">{videoInfo.duration}</div>
          </div>
          <div className="video-details">
            <h2 className="video-title" data-testid="text-title">{videoInfo.title}</h2>
            <div className="video-meta">
              <div className="platform-badge" data-testid="badge-platform">
                {getPlatformIcon(videoInfo.platform)}
                {videoInfo.platform}
              </div>
            </div>
            
            <div className="format-selector">
              <label htmlFor="format-select">Choose Format</label>
              <select 
                id="format-select"
                className="format-select"
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                data-testid="select-format"
              >
                {videoInfo.formats.map((fmt, idx) => (
                  <option key={idx} value={fmt.quality}>
                    {fmt.label}
                  </option>
                ))}
              </select>
            </div>

            <button 
              className="btn-primary btn-download"
              onClick={handleDownload}
              disabled={downloadMutation.isPending}
              data-testid="button-download"
            >
              {downloadMutation.isPending ? (
                <>
                  <span className="spinner" /> Preparing...
                </>
              ) : (
                <>
                  <Download size={20} /> Download Now
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <h3 className="how-it-works-title">How It Works</h3>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-icon-wrap">
              <LinkIcon size={28} />
            </div>
            <h4 className="step-title">1. Paste URL</h4>
            <p className="step-desc">Copy the link of the video you want to download and paste it into the search box above.</p>
          </div>
          <div className="step-card">
            <div className="step-icon-wrap">
              <Settings2 size={28} />
            </div>
            <h4 className="step-title">2. Choose Format</h4>
            <p className="step-desc">Select your preferred video quality or choose to download as an audio MP3 file.</p>
          </div>
          <div className="step-card">
            <div className="step-icon-wrap">
              <Download size={28} />
            </div>
            <h4 className="step-title">3. Download</h4>
            <p className="step-desc">Click download to save the file instantly to your device. No waiting around.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p>VidSnap &copy; 2025 | For personal use only</p>
      </footer>
    </div>
  );
}
