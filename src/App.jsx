import React, { useState } from 'react';
import Header from './components/Header';
import LenskartFaceScanner from './components/LenskartFaceScanner';
import RegistrationForm from './components/RegistrationForm';
import SuccessModal from './components/SuccessModal';
import { Eye, Cpu, Database } from 'lucide-react';

export default function App() {
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleVideoReady = (videoData) => {
    setRecordedVideo(videoData);
  };

  const handleRegistrationSuccess = (data) => {
    setSuccessData(data);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleReset = () => {
    setRecordedVideo(null);
    setSuccessData(null);
  };

  return (
    <div className="app-shell">
      {/* Top Navigation & Status */}
      <Header refreshTrigger={refreshTrigger} />

      {/* Hero Overview Banner */}
      <div className="hero-banner">
        <div className="hero-copy">
          <div className="hero-icon">
            <Eye size={22} />
          </div>
          <div>
            <div className="eyebrow">Quick registration · 01</div>
            <h2>Build your attendance profile</h2>
            <p>Complete the short face scan, then add your college details. Your profile will be ready for AttendAI attendance.</p>
          </div>
        </div>

        <div className="hero-points">
          <div className="hero-point">
            <Cpu size={15} color="#38bdf8" />
            <span>AI-assisted capture</span>
          </div>
          <div className="hero-point">
            <Database size={15} color="#34d399" />
            <span>Secure profile handling</span>
          </div>
        </div>
      </div>

      {/* Main Registration Workspace Grid */}
      <div className="workspace-grid">
        {/* Left Column: Face Scanner */}
        <div>
          <LenskartFaceScanner
            onVideoReady={handleVideoReady}
            currentVideo={recordedVideo}
          />
        </div>

        {/* Right Column: Registration Form */}
        <div>
          <RegistrationForm
            recordedVideo={recordedVideo}
            onRegistrationSuccess={handleRegistrationSuccess}
          />
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal data={successData} onReset={handleReset} />
    </div>
  );
}
