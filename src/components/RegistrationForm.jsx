import React, { useState } from 'react';
import {
  User,
  Mail,
  Building2,
  Tag,
  FileVideo,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export default function RegistrationForm({ recordedVideo, onRegistrationSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    enrollmentNo: '',
    gender: 'Male',
    department: 'CSE',
    year: '1st Year',
    role: 'Student',
    email: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!formData.name.trim()) {
      setErrorMessage('Please enter the full name.');
      return;
    }

    const enrollmentSuffix = formData.enrollmentNo.trim().replace(/^CSJMA/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (!enrollmentSuffix) {
      setErrorMessage('Please enter your enrollment number.');
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage('Please enter an email address.');
      return;
    }

    if (!recordedVideo || !recordedVideo.blob) {
      setErrorMessage('Face scan video is required! Please complete the 3D Face Scan before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Construct multipart/form-data payload
      const payload = new FormData();
      payload.append('name', formData.name);
      const enrollmentId = `CSJMA${enrollmentSuffix}`;
      payload.append('userId', enrollmentId);
      payload.append('gender', formData.gender);
      payload.append('department', formData.department);
      payload.append('year', formData.year);
      payload.append('role', formData.role);
      payload.append('email', formData.email);
      payload.append('notes', formData.notes);
      payload.append('duration', recordedVideo.duration || 8);

      // Determine extension based on mimeType
      const ext = recordedVideo.mimeType.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `${enrollmentId}_scan.${ext}`;
      payload.append('video', recordedVideo.blob, fileName);

      // Use relative URL — works both in dev (Vite proxy) and prod (same origin on Render)
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/register`, {
        method: 'POST',
        body: payload,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit registration');
      }

      // Success
      if (onRegistrationSuccess) {
        onRegistrationSuccess(result.data);
      }
    } catch (err) {
      console.error('Registration upload error:', err);
      setErrorMessage(
        err.message.includes('Failed to fetch')
          ? 'Cannot connect to backend server on port 5000. Please ensure the server is running.'
          : err.message
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel registration-card">
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} color="#38bdf8" />
          <span>Biometric Profile Registration</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          Fill in your details to associate your face scan with your attendance identity
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px'
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Video Attachment Status Box */}
      <div style={{
        padding: '14px 16px',
        borderRadius: '12px',
        border: `1px solid ${recordedVideo ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
        background: recordedVideo ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: recordedVideo ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: recordedVideo ? '#34d399' : '#fbbf24'
          }}>
            <FileVideo size={20} />
          </div>
          <div>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: recordedVideo ? '#34d399' : '#fbbf24'
            }}>
              {recordedVideo ? 'Training Video Ready' : 'Video Not Recorded Yet'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {recordedVideo
                ? `${recordedVideo.duration}s recording (${recordedVideo.sizeMB} MB) attached`
                : 'Complete the oval face scan sequence on the left'}
            </div>
          </div>
        </div>

        {recordedVideo && (
          <CheckCircle2 size={22} color="#34d399" style={{ flexShrink: 0 }} />
        )}
      </div>

      <form onSubmit={handleSubmit} className="registration-form">
        {/* Full Name */}
        <div>
          <label className="form-label" htmlFor="name">
            Full Name <span style={{ color: '#f87171' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Alex Morgan"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
            />
          </div>
        </div>

        {/* Enrollment No. */}
        <div>
          <label className="form-label" htmlFor="enrollmentNo">
            Enrollment No. <span style={{ color: '#f87171' }}>*</span>
          </label>
          <div className="enrollment-input">
            <span className="enrollment-prefix">CSJMA</span>
            <input
              id="enrollmentNo"
              name="enrollmentNo"
              type="text"
              required
              placeholder="2024A001"
              value={formData.enrollmentNo.replace(/^CSJMA/i, '')}
              onChange={(e) => handleChange({ target: { name: 'enrollmentNo', value: e.target.value.replace(/^CSJMA/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() } })}
              className="form-input"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
          </div>
        </div>

        {/* Department & Year */}
        <div className="form-two-col">
          <div>
            <label className="form-label" htmlFor="department">
              Department <span style={{ color: '#f87171' }}>*</span>
            </label>
            <select
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="form-input"
            >
              <option value="CSE">CSE</option>
              <option value="AI">AI</option>
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="year">
              Year <span style={{ color: '#f87171' }}>*</span>
            </label>
            <select
              id="year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              className="form-input"
            >
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
          </div>
        </div>

        {/* Gender & Role */}
        <div className="form-two-col">
          <div>
            <label className="form-label" htmlFor="gender">
              Gender <span style={{ color: '#f87171' }}>*</span>
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="form-input"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="form-input"
            >
              <option value="Student">Student</option>
              <option value="Faculty">Faculty</option>
              <option value="Staff">Staff</option>
            </select>
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label className="form-label" htmlFor="email">
            Email Address <span style={{ color: '#f87171' }}>*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="e.g. alex.morgan@college.edu"
            value={formData.email}
            onChange={handleChange}
            className="form-input"
          />
        </div>

        {/* Optional Notes */}
        <div>
          <label className="form-label" htmlFor="notes">
            Facial Features / Model Tags (Optional)
          </label>
          <input
            id="notes"
            name="notes"
            type="text"
            placeholder="e.g. Glasses, light beard, natural lighting"
            value={formData.notes}
            onChange={handleChange}
            className="form-input"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !recordedVideo}
          className="btn btn-primary"
          style={{
            marginTop: '8px',
            padding: '14px',
            fontSize: '1rem',
            width: '100%',
            cursor: isSubmitting ? 'wait' : 'pointer'
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Please wait for a while... Uploading data</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Complete Registration</span>
            </>
          )}
        </button>
      </form>

      {/* Full-Screen Loading Overlay: Continuous spinning circle with "Please wait for a while" */}
      {isSubmitting && (
        <div className="upload-modal-backdrop">
          <div className="upload-modal-card">
            {/* Spinning Circle */}
            <div className="custom-spinner-ring" />

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
                Please wait for a while...
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                Saving your face scan and registration details securely.
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.775rem',
              color: '#38bdf8',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <Loader2 size={14} className="animate-spin" />
              <span>Preparing your attendance profile...</span>
            </div>

            <div style={{ fontSize: '0.725rem', color: 'var(--text-sub)' }}>
              Please do not close or refresh this page.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
