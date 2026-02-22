"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2, Monitor, Users, Pause, Play } from "lucide-react";

type RecordingMode = "room" | "virtual";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  disabled?: boolean;
}

export default function AudioRecorder({
  onRecordingComplete,
  disabled = false,
}: AudioRecorderProps) {
  const [mode, setMode] = useState<RecordingMode>("room");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [screenShareError, setScreenShareError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const stopVisualization = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopVisualization();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, [stopVisualization]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startVisualization = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average =
        dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(average / 255);
      animationRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }, []);

  const startRoomRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      },
    });
    return stream;
  };

  const startVirtualRecording = async () => {
    setScreenShareError("");

    // Capture system/tab audio via screen share
    let displayStream: MediaStream;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required by API, we'll discard video track
        audio: true, // This captures system/tab audio (Zoom, Meet, Teams)
      });
    } catch (err) {
      throw new Error("screen_share_cancelled");
    }

    // Check if audio track was captured
    const systemAudioTracks = displayStream.getAudioTracks();
    if (systemAudioTracks.length === 0) {
      displayStream.getTracks().forEach((t) => t.stop());
      throw new Error("no_system_audio");
    }

    // Also capture microphone for the user's voice
    let micStream: MediaStream | null = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
    } catch {
      // Mic not available, continue with system audio only
    }

    // Remove video tracks (we only need audio)
    displayStream.getVideoTracks().forEach((track) => {
      // Listen for track end (user stops sharing)
      track.onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          stopRecording();
        }
      };
      // Keep the track alive but we won't use the video
    });

    // Combine system audio + microphone audio
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const destination = audioContext.createMediaStreamDestination();

    // Add system/tab audio
    const systemSource = audioContext.createMediaStreamSource(
      new MediaStream(systemAudioTracks)
    );
    systemSource.connect(destination);

    // Add mic audio if available
    if (micStream) {
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);
    }

    // Store mic stream for cleanup
    const combinedStream = destination.stream;

    // Store all tracks for cleanup
    const allTracks = [
      ...displayStream.getTracks(),
      ...(micStream?.getTracks() || []),
      ...combinedStream.getTracks(),
    ];

    // Create a stream that has all tracks for proper cleanup
    const cleanupStream = new MediaStream(allTracks);
    streamRef.current = cleanupStream;

    return combinedStream;
  };

  const startRecording = async () => {
    try {
      setPermissionDenied(false);
      setScreenShareError("");

      let audioStream: MediaStream;

      if (mode === "room") {
        audioStream = await startRoomRecording();
        streamRef.current = audioStream;
      } else {
        audioStream = await startVirtualRecording();
      }

      // Setup audio analyser for visualization
      const audioContext = audioContextRef.current || new AudioContext();
      if (!audioContextRef.current) audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(audioStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(blob, duration);
        cleanup();
        setIsPaused(false);
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      startVisualization();
    } catch (error: any) {
      if (error?.message === "screen_share_cancelled") {
        setScreenShareError("Screen sharing was cancelled. Please try again and share a tab with audio.");
        return;
      }
      if (error?.message === "no_system_audio") {
        setScreenShareError(
          "No audio detected. Make sure to check \"Share tab audio\" or \"Share system audio\" when sharing your screen."
        );
        return;
      }
      console.error("Error starting recording:", error);
      setPermissionDenied(true);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopVisualization();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
      startVisualization();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Recording Mode Selector */}
      {!isRecording && (
        <div className="w-full max-w-md">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 text-center">
            Recording Mode
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode("room")}
              disabled={disabled}
              className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200 ${
                mode === "room"
                  ? "border-indigo-500 bg-indigo-50 shadow-sm shadow-indigo-100"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                mode === "room" ? "bg-indigo-100" : "bg-gray-100"
              }`}>
                <Users className={`w-5 h-5 ${mode === "room" ? "text-indigo-600" : "text-gray-500"}`} />
              </div>
              <div className="text-center">
                <p className={`text-sm font-semibold ${mode === "room" ? "text-indigo-700" : "text-gray-700"}`}>
                  Room Meeting
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Record via microphone
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("virtual")}
              disabled={disabled}
              className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200 ${
                mode === "virtual"
                  ? "border-indigo-500 bg-indigo-50 shadow-sm shadow-indigo-100"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                mode === "virtual" ? "bg-indigo-100" : "bg-gray-100"
              }`}>
                <Monitor className={`w-5 h-5 ${mode === "virtual" ? "text-indigo-600" : "text-gray-500"}`} />
              </div>
              <div className="text-center">
                <p className={`text-sm font-semibold ${mode === "virtual" ? "text-indigo-700" : "text-gray-700"}`}>
                  Virtual Meeting
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Zoom, Meet, Teams
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Mode Info Banner */}
      {!isRecording && mode === "virtual" && (
        <div className="w-full max-w-md bg-blue-50 border border-blue-100 rounded-xl p-3.5">
          <p className="text-xs font-medium text-blue-800 mb-1">How Virtual Meeting Recording works:</p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Open your Zoom / Google Meet / Teams call in a browser tab</li>
            <li>Click record below — a screen share dialog will appear</li>
            <li>Select the tab with your meeting & check <strong>&quot;Share tab audio&quot;</strong></li>
            <li>Both meeting audio + your mic will be captured</li>
          </ol>
        </div>
      )}

      {/* Recording indicator when in virtual mode */}
      {isRecording && mode === "virtual" && (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-green-700">Capturing virtual meeting audio + microphone</span>
        </div>
      )}

      {/* Audio Level Visualization */}
      <div className="relative flex items-center justify-center w-40 h-40">
        {isRecording && !isPaused && (
          <>
            <div
              className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"
              style={{ animationDuration: "1.5s" }}
            />
            <div
              className="absolute rounded-full bg-red-500/10 transition-all duration-150"
              style={{
                width: `${100 + audioLevel * 60}%`,
                height: `${100 + audioLevel * 60}%`,
              }}
            />
          </>
        )}
        {isRecording && isPaused && (
          <div className="absolute inset-0 rounded-full bg-amber-500/10" />
        )}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
          className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
            disabled
              ? "bg-gray-300 cursor-not-allowed"
              : isRecording
                ? "bg-red-500 hover:bg-red-600 text-white scale-110"
                : mode === "virtual"
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white hover:scale-105"
                  : "bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white hover:scale-105"
          }`}
        >
          {disabled ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : isRecording ? (
            <Square className="w-8 h-8 fill-current" />
          ) : mode === "virtual" ? (
            <Monitor className="w-10 h-10" />
          ) : (
            <Mic className="w-10 h-10" />
          )}
        </button>
      </div>

      {/* Timer & Controls */}
      {isRecording && (
        <div className="flex flex-col items-center gap-4">
          <div className={`text-3xl font-mono font-bold tabular-nums ${isPaused ? "text-amber-500" : "text-red-500"}`}>
            {formatTime(duration)}
            {isPaused && <span className="text-sm font-sans ml-2">PAUSED</span>}
          </div>

          {/* Pause/Resume Button */}
          <button
            onClick={isPaused ? resumeRecording : pauseRecording}
            className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full transition-all ${
              isPaused
                ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4" />
                Resume
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                Pause
              </>
            )}
          </button>
        </div>
      )}

      {/* Status Text */}
      <p className="text-sm text-gray-500">
        {disabled
          ? "Processing..."
          : isRecording
            ? isPaused
              ? "Recording paused. Resume or click the red button to stop."
              : "Recording in progress... Click stop when done"
            : mode === "virtual"
              ? "Click to start capturing your virtual meeting"
              : "Click the microphone to start recording"}
      </p>

      {/* Permission Error */}
      {permissionDenied && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 max-w-sm text-center">
          Microphone access denied. Please allow microphone access in your
          browser settings and try again.
        </div>
      )}

      {/* Screen Share Error */}
      {screenShareError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 max-w-sm text-center">
          {screenShareError}
        </div>
      )}
    </div>
  );
}
