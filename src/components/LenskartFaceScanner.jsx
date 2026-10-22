import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import {
  Camera,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Play,
  Pause,
  SwitchCamera,
  Sparkles,
  Info,
  ArrowLeft,
  ArrowRight,
  UserX,
  UserCheck,
  Eye,
  Loader2
} from 'lucide-react';

const SCAN_DURATION_SECONDS = 8; // 8 seconds scan captures all angles for model training

// Head Pose Estimation helper based on 68 facial landmarks
function estimateHeadPose(landmarks) {
  if (!landmarks || !landmarks.positions || landmarks.positions.length < 68) {
    return null;
  }

  const p = landmarks.positions;
  const nose = p[30]; // Nose tip
  const leftEyeOuter = p[36]; // Left eye outer (subject's right in mirror)
  const rightEyeOuter = p[45]; // Right eye outer (subject's left in mirror)
  const leftJaw = p[0];
  const rightJaw = p[16];
  const chin = p[8];

  // Horizontal symmetry (Yaw)
  const dLeftEye = Math.abs(nose.x - leftEyeOuter.x);
  const dRightEye = Math.abs(rightEyeOuter.x - nose.x);
  const totalEye = dLeftEye + dRightEye;
  const eyeRatio = totalEye > 0 ? dLeftEye / totalEye : 0.5;

  const dLeftJaw = Math.abs(nose.x - leftJaw.x);
  const dRightJaw = Math.abs(rightJaw.x - nose.x);
  const totalJaw = dLeftJaw + dRightJaw;
  const jawRatio = totalJaw > 0 ? dLeftJaw / totalJaw : 0.5;

  const ratio = (eyeRatio * 0.6) + (jawRatio * 0.4);

  // In mirrored selfie mode (transform: scaleX(-1)):
  // Turning to user's LEFT shifts nose towards sensor's right (higher X) -> ratio > 0.58
  // Turning to user's RIGHT shifts nose towards sensor's left (lower X) -> ratio < 0.42
  let yaw = 'STRAIGHT';
  if (ratio >= 0.57) {
    yaw = 'LEFT';
  } else if (ratio <= 0.43) {
    yaw = 'RIGHT';
  }

  // Vertical tilt (Pitch)
  const eyeCenterY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
  const dUpper = Math.abs(nose.y - eyeCenterY);
  const dLower = Math.abs(chin.y - nose.y);
  const pitchRatio = dLower > 0 ? dUpper / dLower : 1.0;

  let pitch = 'LEVEL';
  if (pitchRatio < 0.65) {
    pitch = 'UP';
  } else if (pitchRatio > 1.35) {
    pitch = 'DOWN';
  }

  return {
    yaw, // 'STRAIGHT' | 'LEFT' | 'RIGHT'
    pitch, // 'LEVEL' | 'UP' | 'DOWN'
    ratio,
    pitchRatio,
  };
}

export default function LenskartFaceScanner({ onVideoReady, currentVideo }) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [permissionError, setPermissionError] = useState(null);

  // Real-time AI Face Detection State
  const [faceDetected, setFaceDetected] = useState(false);
  const [currentPose, setCurrentPose] = useState(null); // { yaw: 'STRAIGHT', pitch: 'LEVEL' }

  // Recording State & Pose Requirements
  const [countdown, setCountdown] = useState(null); // 3, 2, 1, or null
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPosePaused, setIsPosePaused] = useState(false);
  const [pauseReason, setPauseReason] = useState('');

  // Video Output & Review
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [videoBlobData, setVideoBlobData] = useState(null);
  const [videoFileSize, setVideoFileSize] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(true);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const videoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const detectionLoopRef = useRef(null);
  const recordIntervalRef = useRef(null);

  // Track latest detection & recording state in refs for interval loop
  const faceDetectedRef = useRef(false);
  const currentPoseRef = useRef(null);
  const isRecordingRef = useRef(false);
  const recordingSecondsRef = useRef(0);

  // 1. Load face-api AI models from /models
  useEffect(() => {
    let isMounted = true;
    async function loadModels() {
      try {
        console.log('[AttendAI] Loading Face Detection & Landmark models...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
        ]);
        if (isMounted) {
          console.log('[AttendAI] Face models loaded successfully');
          setModelsLoaded(true);
        }
      } catch (err) {
        console.error('[AttendAI] Error loading face models:', err);
        if (isMounted) {
          setModelError('Could not load face detection models. Please refresh.');
        }
      }
    }
    loadModels();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Camera setup
  const startCamera = useCallback(async (deviceId = null) => {
    try {
      setPermissionError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not available in this browser. Please open the page in a secure, camera-enabled browser.');
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: deviceId ? undefined : 'user',
          deviceId: deviceId ? { exact: deviceId } : undefined,
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => console.log('Autoplay caught:', e));
      }

      setCameraActive(true);

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);
      if (!selectedDeviceId && videoInputs.length > 0) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Camera access denied. Please allow camera permissions in your browser.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No camera found on this device. Please connect a webcam.');
      } else {
        setPermissionError(err.message || 'Unable to access the camera. Please try again.');
      }
    }
  }, [selectedDeviceId]);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (detectionLoopRef.current) clearInterval(detectionLoopRef.current);
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    };
  }, []);

  // 3. Continuous AI Face & Pose Detection Loop (runs every 90ms)
  useEffect(() => {
    if (!cameraActive || !modelsLoaded || videoPreviewUrl) return;

    const detectorOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224,
      scoreThreshold: 0.45,
    });

    const loop = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, detectorOptions)
          .withFaceLandmarks(true);

        if (detection && detection.detection.score >= 0.45) {
          const pose = estimateHeadPose(detection.landmarks);
          faceDetectedRef.current = true;
          currentPoseRef.current = pose;
          setFaceDetected(true);
          setCurrentPose(pose);
        } else {
          faceDetectedRef.current = false;
          currentPoseRef.current = null;
          setFaceDetected(false);
          setCurrentPose(null);
        }
      } catch (err) {
        // Ignored frame drop
      }
    }, 90);

    detectionLoopRef.current = loop;
    return () => clearInterval(loop);
  }, [cameraActive, modelsLoaded, videoPreviewUrl]);

  // Keep ref sync
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    recordingSecondsRef.current = recordingSeconds;
  }, [recordingSeconds]);

  // 4. Determine current expected instruction based on recording progress
  const getExpectedInstruction = (sec) => {
    if (sec < 2.0) {
      return {
        stepNumber: 1,
        title: 'Step 1 of 4',
        expectedPose: 'STRAIGHT',
        instruction: 'Look straight at the camera',
        shortAction: 'LOOK STRAIGHT',
        icon: '👀',
      };
    } else if (sec < 4.0) {
      return {
        stepNumber: 2,
        title: 'Step 2 of 4',
        expectedPose: 'LEFT',
        instruction: 'Turn your head slowly to the LEFT',
        shortAction: 'TURN LEFT ⬅️',
        icon: '⬅️',
      };
    } else if (sec < 6.0) {
      return {
        stepNumber: 3,
        title: 'Step 3 of 4',
        expectedPose: 'RIGHT',
        instruction: 'Turn your head slowly to the RIGHT',
        shortAction: 'TURN RIGHT ➡️',
        icon: '➡️',
      };
    } else {
      return {
        stepNumber: 4,
        title: 'Step 4 of 4',
        expectedPose: 'LEVEL_OR_UP',
        instruction: 'Look straight & tilt head slightly UP',
        shortAction: 'TILT UP ⬆️',
        icon: '⬆️',
      };
    }
  };

  const currentStep = getExpectedInstruction(recordingSeconds);

  // 5. Start scan sequence with 3-second countdown (blocks if no face detected!)
  const handleStartScanSequence = () => {
    if (!cameraActive || isRecording || !faceDetected) return;

    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        // Abort countdown if face leaves screen!
        if (!faceDetectedRef.current) {
          clearInterval(countdownInterval);
          alert('Face lost! Please stay centered in the oval frame.');
          return null;
        }

        if (prev <= 1) {
          clearInterval(countdownInterval);
          startActualRecording();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 6. MediaRecorder Execution with Intelligent Pose Enforcement
  const startActualRecording = () => {
    if (!mediaStreamRef.current) return;

    recordedChunksRef.current = [];

    const mimeTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];
    let selectedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

    try {
      const recorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType: selectedMime || undefined,
        videoBitsPerSecond: 2500000,
      });

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || selectedMime || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mime });

        // Stop camera stream upon completion
        stopCamera();

        const url = URL.createObjectURL(blob);
        const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);

        setVideoBlobData(blob);
        setVideoFileSize(sizeMB);
        setIsRecording(false);
        setRecordingSeconds(0);
        setIsPosePaused(false);
        setPauseReason('');

        if (recordIntervalRef.current) {
          clearInterval(recordIntervalRef.current);
          recordIntervalRef.current = null;
        }

        setVideoPreviewUrl(url);

        if (onVideoReady) {
          onVideoReady({
            blob,
            url,
            duration: SCAN_DURATION_SECONDS,
            sizeMB,
            mimeType: mime,
          });
        }
      };

      recorder.start(200); // 200ms slice
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      setIsPosePaused(false);

      // Smart Recording Progress Loop:
      // Ticks every 100ms. ONLY advances time if:
      // 1. Face is present
      // 2. Person is performing the REQUIRED head pose (Left / Right / Straight)!
      recordIntervalRef.current = setInterval(() => {
        const hasFace = faceDetectedRef.current;
        const pose = currentPoseRef.current;
        const currentSec = recordingSecondsRef.current;
        const step = getExpectedInstruction(currentSec);

        // Check 1: Is person present on screen?
        if (!hasFace) {
          setIsPosePaused(true);
          setPauseReason('No face detected! Return to oval guide.');
          if (recorder.state === 'recording') {
            recorder.pause();
          }
          return;
        }

        // Check 2: Head pose verification according to the prompt
        let poseSatisfied = false;

        if (step.expectedPose === 'STRAIGHT') {
          // In Step 1: must be looking straight
          poseSatisfied = pose && (pose.yaw === 'STRAIGHT' || pose.yaw === 'LEVEL');
          if (!poseSatisfied) {
            setIsPosePaused(true);
            setPauseReason('Please look straight into the camera to continue!');
          }
        } else if (step.expectedPose === 'LEFT') {
          // In Step 2: MUST look to the LEFT! Script will NOT continue until turned left
          poseSatisfied = pose && pose.yaw === 'LEFT';
          if (!poseSatisfied) {
            setIsPosePaused(true);
            setPauseReason('Please turn your head to the LEFT ⬅️ to continue!');
          }
        } else if (step.expectedPose === 'RIGHT') {
          // In Step 3: MUST look to the RIGHT! Script will NOT continue until turned right
          poseSatisfied = pose && pose.yaw === 'RIGHT';
          if (!poseSatisfied) {
            setIsPosePaused(true);
            setPauseReason('Please turn your head to the RIGHT ➡️ to continue!');
          }
        } else {
          // Step 4: Tilt head up / look forward to complete
          poseSatisfied = pose && (pose.pitch === 'UP' || pose.yaw === 'STRAIGHT');
          if (!poseSatisfied) {
            // Allow slight leeway on final smile/tilt
            poseSatisfied = true;
          }
        }

        // If pose requirement is NOT satisfied, freeze recording!
        if (!poseSatisfied) {
          if (recorder.state === 'recording') {
            recorder.pause();
          }
          return;
        }

        // Both face and required pose are satisfied!
        setIsPosePaused(false);
        setPauseReason('');
        if (recorder.state === 'paused') {
          recorder.resume();
        }

        // Advance recording clock by 0.1s
        const newSec = Math.min(SCAN_DURATION_SECONDS, currentSec + 0.1);
        setRecordingSeconds(newSec);

        if (newSec >= SCAN_DURATION_SECONDS) {
          if (recorder.state === 'recording' || recorder.state === 'paused') {
            recorder.requestData();
            recorder.stop();
          }
        }
      }, 100);
    } catch (err) {
      console.error('Error starting MediaRecorder:', err);
      alert('Failed to start recording: ' + err.message);
      setIsRecording(false);
    }
  };

  // Stop recording manually
  const handleStopRecordingEarly = () => {
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
    }
  };

  // Retake video
  const handleRetake = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl(null);
    setVideoBlobData(null);
    setVideoFileSize(null);
    setIsPlayingPreview(false);
    if (onVideoReady) onVideoReady(null);
    startCamera(selectedDeviceId);
  };

  // Toggle preview play/pause
  const togglePreviewPlay = () => {
    if (!previewVideoRef.current) return;
    if (previewVideoRef.current.paused) {
      previewVideoRef.current.play();
      setIsPlayingPreview(true);
    } else {
      previewVideoRef.current.pause();
      setIsPlayingPreview(false);
    }
  };

  const handleDeviceChange = (e) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    startCamera(newId);
  };

  const scanProgressPercent = Math.min(100, (recordingSeconds / SCAN_DURATION_SECONDS) * 100);

  // Dynamic oval styling
  let ovalClass = 'lenskart-oval';
  if (!faceDetected && cameraActive && !videoPreviewUrl) {
    ovalClass += ' no-face';
  } else if (isRecording) {
    if (isPosePaused) {
      ovalClass += ' paused';
    } else {
      ovalClass += ' scanning';
    }
  } else if (faceDetected) {
    ovalClass += ' face-detected';
  }

  return (
    <div className="glass-panel scanner-card">
      {/* Scanner Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} color="#06b6d4" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
            3D Face Scan Portal
          </h2>
        </div>

        {/* AI & Camera Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* AI Face Tracker Status Pill */}
          {!videoPreviewUrl && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: faceDetected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${faceDetected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              color: faceDetected ? '#34d399' : '#f87171'
            }}>
              {modelsLoaded ? (
                faceDetected ? (
                  <>
                    <UserCheck size={14} />
                    <span>Face Verified {currentPose ? `[${currentPose.yaw}]` : ''}</span>
                  </>
                ) : (
                  <>
                    <UserX size={14} />
                    <span>No Face Detected</span>
                  </>
                )
              ) : (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Loading AI...</span>
                </>
              )}
            </div>
          )}

          {/* Camera Selector */}
          {availableDevices.length > 1 && !videoPreviewUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SwitchCamera size={15} color="var(--text-muted)" />
              <select
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  outline: 'none',
                }}
              >
                {availableDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="face-scanner-viewport">
        {/* State 1: Video Preview (Recorded Mode) */}
        {videoPreviewUrl ? (
          <div style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <video
              ref={previewVideoRef}
              key={videoPreviewUrl}
              autoPlay
              muted
              loop
              playsInline
              controls
              onPlay={() => setIsPlayingPreview(true)}
              onPause={() => setIsPlayingPreview(false)}
              onLoadedData={() => {
                if (previewVideoRef.current) {
                  previewVideoRef.current.play().catch(() => {});
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                backgroundColor: '#000',
              }}
            >
              <source src={videoPreviewUrl} type={videoBlobData ? videoBlobData.type : 'video/webm'} />
            </video>

            {/* Completion Tag Badge */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: 'rgba(16, 185, 129, 0.92)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.45)',
              zIndex: 10,
              pointerEvents: 'none'
            }}>
              <CheckCircle2 size={16} />
              <span>Face Scan Verified ({videoFileSize} MB)</span>
            </div>
          </div>
        ) : (
          /* State 2: Live Camera with Intelligent Guidance & Pose Enforcement */
          <>
            <video
              ref={videoRef}
              className="video-element"
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transform: 'scaleX(-1)' // Mirror for natural selfie experience
              }}
            />

            {/* Error message if camera fails */}
            {permissionError && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(11, 15, 25, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                textAlign: 'center',
                gap: '14px',
                zIndex: 30
              }}>
                <AlertCircle size={44} color="#f87171" />
                <h3 style={{ color: '#fff', fontSize: '1.1rem' }}>Camera Access Required</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '360px' }}>
                  {permissionError}
                </p>
                <button
                  type="button"
                  onClick={() => startCamera(selectedDeviceId)}
                  className="btn btn-primary"
                  style={{ marginTop: '8px' }}
                >
                  <RotateCcw size={16} /> Retry Camera
                </button>
              </div>
            )}

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="countdown-overlay">
                <div style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Get Ready
                </div>
                <div className="countdown-number">{countdown}</div>
                <div style={{ fontSize: '0.9rem', color: '#38bdf8', marginTop: '12px', fontWeight: 600 }}>
                  Center your face in the oval guide
                </div>
              </div>
            )}

            {/* Recording Indicator */}
            {isRecording && (
              <div className="rec-badge" style={{
                background: isPosePaused ? 'rgba(245, 158, 11, 0.95)' : 'rgba(239, 68, 68, 0.9)'
              }}>
                <div className="rec-dot" style={{
                  backgroundColor: isPosePaused ? '#fbbf24' : '#fff'
                }} />
                <span>
                  {isPosePaused
                    ? 'WAITING FOR POSE (PAUSED)'
                    : `REC ${recordingSeconds.toFixed(1)}s / ${SCAN_DURATION_SECONDS}s`}
                </span>
              </div>
            )}

            {/* Intelligent Top Instruction / Alert Pill */}
            <div
              className="step-instruction-pill"
              style={{
                background: !faceDetected
                  ? 'rgba(239, 68, 68, 0.92)'
                  : isPosePaused
                  ? 'rgba(217, 119, 6, 0.94)'
                  : isRecording
                  ? 'rgba(15, 23, 42, 0.9)'
                  : 'rgba(15, 23, 42, 0.85)',
                border: !faceDetected
                  ? '1px solid rgba(239, 68, 68, 0.5)'
                  : isPosePaused
                  ? '1px solid rgba(245, 158, 11, 0.6)'
                  : '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: (isPosePaused || !faceDetected) ? '0 0 20px rgba(0, 0, 0, 0.8)' : undefined
              }}
            >
              {!faceDetected ? (
                <>
                  <UserX size={16} color="#fff" />
                  <span>No face detected! Please align inside oval</span>
                </>
              ) : isRecording ? (
                isPosePaused ? (
                  <>
                    <AlertTriangle size={16} color="#fff" />
                    <span>{pauseReason}</span>
                  </>
                ) : (
                  <>
                    <span>{currentStep.icon}</span>
                    <span>{currentStep.title}: {currentStep.instruction}</span>
                  </>
                )
              ) : (
                <>
                  <UserCheck size={16} color="#34d399" />
                  <span>Face Aligned ✅ Click Start below to begin 3D scan</span>
                </>
              )}
            </div>

            {/* Direction Arrows on Viewport during Left/Right Steps */}
            {isRecording && isPosePaused && currentStep.expectedPose === 'LEFT' && (
              <div className="direction-guide-arrow left">
                <ArrowLeft size={28} />
                <span>TURN LEFT</span>
              </div>
            )}

            {isRecording && isPosePaused && currentStep.expectedPose === 'RIGHT' && (
              <div className="direction-guide-arrow right">
                <ArrowRight size={28} />
                <span>TURN RIGHT</span>
              </div>
            )}

            {/* Lenskart Oval Overlay */}
            <div className={ovalClass}>
              <div className="oval-marker top" />
              <div className="oval-marker bottom" />
              <div className="oval-marker left" />
              <div className="oval-marker right" />

              {/* Animated laser scan beam during active (non-paused) recording */}
              {isRecording && !isPosePaused && <div className="laser-beam" />}
            </div>

            {/* Linear Progress Bar */}
            {isRecording && (
              <div className="scan-progress-bar">
                <div
                  className="scan-progress-fill"
                  style={{
                    width: `${scanProgressPercent}%`,
                    background: isPosePaused
                      ? '#f59e0b'
                      : 'linear-gradient(90deg, #3b82f6, #06b6d4, #10b981)'
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Control Actions */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {videoPreviewUrl ? (
          /* Preview State Controls */
          <>
            <button
              type="button"
              onClick={handleRetake}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              <RotateCcw size={18} /> Retake Face Scan
            </button>
            <button
              type="button"
              onClick={togglePreviewPlay}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              {isPlayingPreview ? <Pause size={18} /> : <Play size={18} />}
              {isPlayingPreview ? 'Pause Preview' : 'Play Preview'}
            </button>
          </>
        ) : (
          /* Live Scanner State Controls */
          <>
            {isRecording ? (
              <button
                type="button"
                onClick={handleStopRecordingEarly}
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171'
                }}
              >
                Finish Scan Early ({recordingSeconds.toFixed(1)}s)
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartScanSequence}
                disabled={!cameraActive || countdown !== null || !faceDetected || !modelsLoaded}
                className="btn btn-scan"
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  fontSize: '1rem',
                  opacity: (!faceDetected || !modelsLoaded) ? 0.55 : 1,
                  cursor: (!faceDetected || !modelsLoaded) ? 'not-allowed' : 'pointer'
                }}
              >
                {!modelsLoaded ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading AI Face Detector...</span>
                  </>
                ) : !faceDetected ? (
                  <>
                    <UserX size={18} />
                    <span>Position Face in Oval to Start</span>
                  </>
                ) : (
                  <>
                    <Camera size={20} />
                    <span>Start 3D Face Scan (8s)</span>
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* AI Verification Guidelines */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '12px 14px',
        fontSize: '0.813rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px'
      }}>
        <Info size={18} color="#06b6d4" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: '#fff' }}>AI Head-Pose Verification Active:</strong>
          <span style={{ display: 'block', marginTop: '2px' }}>
            The scanner will not start unless a person is centered in frame. During recording, the script monitors your head yaw and <strong>will pause the recording</strong> if you do not turn left or right when prompted.
          </span>
        </div>
      </div>
    </div>
  );
}
