import React, { useEffect, useState } from 'react';
import { ScanFace, Database, Wifi, WifiOff } from 'lucide-react';

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
    <header className="site-header">
      <div className="brand-lockup">
        <div className="brand-mark">
          <ScanFace size={28} color="#fff" />
        </div>
        <div>
          <div className="brand-title-row">
            <h1>
              Attend<span style={{ color: '#38bdf8' }}>AI</span>
            </h1>
            <span className="brand-tag">3D face capture</span>
          </div>
          <p className="brand-subtitle">Smart attendance registration for your campus</p>
        </div>
      </div>

      <div className="header-status-group">
        {/* Dataset Counter */}
        <div className="header-pill">
          <Database size={15} color="#06b6d4" />
          <span><strong>{totalSamples}</strong> registered sample{totalSamples === 1 ? '' : 's'}</span>
        </div>

        {/* Backend Connectivity Status */}
        <div className={`header-pill status-pill ${serverStatus}`}>
          {serverStatus === 'connected' ? (
            <>
              <Wifi size={14} />
              <span>System online</span>
            </>
          ) : serverStatus === 'checking' ? (
            <span>Connecting...</span>
          ) : (
            <>
              <WifiOff size={14} />
              <span>System unavailable</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
