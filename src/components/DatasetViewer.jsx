import React, { useEffect, useState } from 'react';
import { Database, Film, User, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

export default function DatasetViewer({ refreshTrigger }) {
  const [dataset, setDataset] = useState([]);
  const [total, setTotal] = useState(0);
  const [storagePath, setStoragePath] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchDataset = async () => {
    try {
      setIsLoading(true);
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/api/videos`);
      if (res.ok) {
        const data = await res.json();
        setDataset(data.records || []);
        setTotal(data.totalSamples || 0);
        setStoragePath(data.storageDirectory || '');
      }
    } catch (err) {
      console.error('Failed to load dataset:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDataset();
  }, [refreshTrigger]);

  return (
    <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database size={20} color="#10b981" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
            Stored Video Training Dataset ({total} Samples)
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Folder: <code style={{ color: '#38bdf8', fontFamily: "'JetBrains Mono', monospace" }}>storage/videos/</code>
          </span>
          <button
            onClick={fetchDataset}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {dataset.length === 0 ? (
        <div style={{
          padding: '36px',
          textAlign: 'center',
          color: 'var(--text-sub)',
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: '12px',
          border: '1px dashed var(--border-color)',
        }}>
          <Film size={36} color="var(--text-sub)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>No training videos recorded yet</div>
          <div style={{ fontSize: '0.825rem', marginTop: '4px' }}>
            Complete the face scan sequence and submit the registration form above to store your first video sample.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {dataset.map(item => (
            <div
              key={item.id}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {item.userId}
                </span>
                <span style={{
                  fontSize: '0.725rem',
                  color: '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <CheckCircle2 size={13} /> Saved
                </span>
              </div>

              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                {item.name}
              </div>

              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                {item.department} • {item.role}
              </div>

              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-sub)',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                paddingTop: '8px',
                marginTop: '4px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>{(item.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                <span>{item.recordingDuration ? `${item.recordingDuration}s` : 'Video'}</span>
                <span>{new Date(item.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
