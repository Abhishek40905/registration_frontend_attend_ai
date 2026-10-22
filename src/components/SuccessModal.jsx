import React from 'react';
import {
  CheckCircle2,
  FileVideo,
  ArrowRight,
  FolderCheck,
} from 'lucide-react';

export default function SuccessModal({ data, onReset }) {
  if (!data) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(7, 10, 16, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 100,
    }}>
      <div className="glass-panel success-modal-card" style={{
        maxWidth: '560px',
        width: '100%',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '20px',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 40px rgba(16, 185, 129, 0.25)',
      }}>
        {/* Animated Success Check */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '2px solid rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)',
        }}>
          <CheckCircle2 size={40} color="#34d399" />
        </div>

        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
            Registration complete!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '6px' }}>
            Your face scan and attendance profile have been saved successfully.
          </p>
        </div>

        {/* Saved Storage Details */}
        <div style={{
          width: '100%',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontSize: '0.825rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700 }}>
              <FolderCheck size={18} />
              <span>Submission Details</span>
            </div>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}>
              Securely saved
            </span>
          </div>

          <div className="success-detail-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Registered User:</span>
            <strong style={{ color: '#fff' }}>{data.name} ({data.userId})</strong>
          </div>

          <div className="success-detail-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Academic Details:</span>
            <span style={{ color: '#fff' }}>
              {data.department || 'CSE'} • {data.year || '1st Year'} ({data.gender || 'Male'})
            </span>
          </div>

          <div className="success-detail-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Video File:</span>
            <code style={{ color: '#34d399', fontFamily: "'JetBrains Mono', monospace" }}>{data.videoFileName}</code>
          </div>

          <div className="success-detail-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Details Text File:</span>
            <code style={{ color: '#38bdf8', fontFamily: "'JetBrains Mono', monospace" }}>{data.detailsFileName || `${data.id}_details.txt`}</code>
          </div>

          <div className="success-detail-row" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Destination:</span>
            <span style={{ color: '#93c5fd', wordBreak: 'break-all' }}>
              Attendance profile record
            </span>
          </div>

          <div className="success-detail-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Size & Quality:</span>
            <span style={{ color: '#fff' }}>
              {(data.fileSize / (1024 * 1024)).toFixed(2)} MB • {data.recordingDuration || 8}s • <span style={{ color: '#34d399' }}>Verified</span>
            </span>
          </div>

        </div>

        {/* Action Button */}
        <button
          onClick={onReset}
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '4px' }}
        >
          <span>Register Another Person / Take New Scan</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
