import React, { useState } from 'react';
import Header from './components/Header';
import LenskartFaceScanner from './components/LenskartFaceScanner';
import RegistrationForm from './components/RegistrationForm';
import SuccessModal from './components/SuccessModal';
import DatasetViewer from './components/DatasetViewer';
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 50px' }}>
      {/* Top Navigation & Status */}
      <Header refreshTrigger={refreshTrigger} />

      {/* Hero Overview Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
        border: '1px solid var(--border-highlight)',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa'
          }}>
            <Eye size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
              Lenskart-Style 3D Biometric Dataset Collection
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              Align your face inside the oval guide. The system records an 8-second multi-angle video and stores it in the designated training directory.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={15} color="#38bdf8" />
            <span>AI Preprocessing Ready</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={15} color="#34d399" />
            <span>Dedicated Video Storage</span>
          </div>
        </div>
      </div>

      {/* Main Registration Workspace Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '28px',
        alignItems: 'start'
      }}>
        {/* Left Column: Lenskart Face Scanner */}
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

      {/* Dataset Storage View of Previously Saved Videos */}
      <DatasetViewer refreshTrigger={refreshTrigger} />

      {/* Success Modal */}
      <SuccessModal data={successData} onReset={handleReset} />
    </div>
  );
}
