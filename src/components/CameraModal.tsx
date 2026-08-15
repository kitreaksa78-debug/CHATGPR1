import React, { useRef, useState, useEffect } from "react";
import { Camera, X, RefreshCw, Check, AlertCircle } from "lucide-react";
import { Attachment } from "../types.js";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (attachment: Attachment) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedUrl(null);
      setError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError(
        "មិនអាចបើកកាមេរ៉ាបានទេ។ សូមពិនិត្យមើលសិទ្ធិ Camera permission។"
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedUrl(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedUrl(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (!capturedUrl) return;
    const base64Data = capturedUrl.replace(/^data:image\/[a-z]+;base64,/, "");

    const attachment: Attachment = {
      id: "cam_" + Date.now(),
      name: `Photo_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.jpg`,
      type: "image/jpeg",
      size: Math.round((base64Data.length * 3) / 4),
      dataUrl: capturedUrl,
      base64Data,
      previewUrl: capturedUrl,
      category: "image",
    };

    onCapture(attachment);
    onClose();
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#111318] border border-[#242933] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E232E] bg-[#171A21]">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-[#818CF8]" />
            <h3 className="font-semibold text-white font-khmer text-sm">
              ថតរូបភាព / Capture Photo
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#242933] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative w-full aspect-video sm:aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center text-[#EF4444]">
              <AlertCircle className="w-10 h-10" />
              <p className="text-sm font-khmer max-w-xs">{error}</p>
              <button
                onClick={startCamera}
                className="mt-2 px-4 py-2 bg-[#242933] text-white rounded-xl text-xs font-khmer hover:bg-[#323946] transition-colors"
              >
                ព្យាយាមម្តងទៀត / Retry
              </button>
            </div>
          ) : capturedUrl ? (
            <img
              src={capturedUrl}
              alt="Snapshot"
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="p-4 border-t border-[#1E232E] bg-[#171A21] flex items-center justify-between">
          {capturedUrl ? (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={retakePhoto}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#242933] text-[#CBD5E1] hover:text-white hover:bg-[#323946] text-xs font-semibold font-khmer transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                ថតម្តងទៀត / Retake
              </button>

              <button
                onClick={confirmPhoto}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-xs font-semibold font-khmer shadow-lg shadow-[#6366F1]/30 hover:opacity-95 transition-all"
              >
                <Check className="w-4 h-4" />
                ប្រើប្រាស់រូបនេះ / Use Photo
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={toggleFacingMode}
                disabled={Boolean(error)}
                className="p-2.5 rounded-xl bg-[#242933] text-[#94A3B8] hover:text-white hover:bg-[#323946] transition-all disabled:opacity-40"
                title="Switch Camera"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button
                onClick={takeSnapshot}
                disabled={Boolean(error)}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] p-1 shadow-lg shadow-[#6366F1]/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
              >
                <div className="w-full h-full rounded-full border-2 border-white/80 flex items-center justify-center bg-white/20">
                  <div className="w-8 h-8 rounded-full bg-white" />
                </div>
              </button>

              <div className="w-10" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
