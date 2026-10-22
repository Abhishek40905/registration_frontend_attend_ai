import React, { useState } from 'react';
import Header from './components/Header';
import LenskartFaceScanner from './components/LenskartFaceScanner';
import RegistrationForm from './components/RegistrationForm';
import SuccessModal from './components/SuccessModal';

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
