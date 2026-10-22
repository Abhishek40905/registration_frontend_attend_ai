import React, { useEffect, useState } from 'react';
import { ScanFace, HardDrive, Wifi, WifiOff } from 'lucide-react';

export default function Header({ refreshTrigger }) {
  const [serverStatus, setServerStatus] = useState('checking'); // 'connected' | 'offline' | 'checking'
  const [totalSamples, setTotalSamples] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      try {
        const apiBase = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiBase}/api/videos`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setServerStatus('connected');
            setTotalSamples(data.totalSamples || 0);
          }
        } else {
          if (isMounted) setServerStatus('offline');
        }
      } catch (err) {
        if (isMounted) setServerStatus('offline');
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [refreshTrigger]);

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 0',
      borderBottom: '1px solid var(--border-color)',
      marginBottom: '32px',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
        }}>
          <ScanFace size={28} color="#fff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
              Attend<span style={{ color: '#38bdf8' }}>AI</span>
            </h1>
            <span style={{
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontSize: '0.725rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              Lenskart 3D Face Scan
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
            Biometric video capture system for AI face recognition model training
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Dataset Counter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '999px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-color)',
          fontSize: '0.825rem',
          color: 'var(--text-muted)'
        }}>
          <HardDrive size={15} color="#06b6d4" />
          <span>Storage Dataset: <strong style={{ color: '#fff' }}>{totalSamples}</strong> video{totalSamples === 1 ? '' : 's'}</span>
        </div>

        {/* Backend Connectivity Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '999px',
          background: serverStatus === 'connected' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
          border: `1px solid ${serverStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          fontSize: '0.775rem',
          fontWeight: 600,
          color: serverStatus === 'connected' ? '#34d399' : '#f87171'
        }}>
          {serverStatus === 'connected' ? (
            <>
              <Wifi size={14} />
              <span>Storage API Active</span>
            </>
          ) : serverStatus === 'checking' ? (
            <span>Connecting...</span>
          ) : (
            <>
              <WifiOff size={14} />
              <span>API Offline (Port 5000)</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
