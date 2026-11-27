"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  AlertCircle,
  ShieldCheck,
  Loader2,
  ImageUp,
} from "lucide-react";

const CAMERA_PERMISSION_KEY = "printbuddy_camera_permission_granted";

export function QRScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const scanFrameRef = useRef<(() => void) | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [invalidToast, setInvalidToast] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState<string>("This isn't a HIMMER code");
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showInvalidToast = useCallback((message: string) => {
    setInvalidMessage(message);
    setInvalidToast(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setInvalidToast(false), 3000);
  }, []);

  // Parse QR text for valid shopId: e.g., https://.../s/<shopId> or /s/<shopId>
  const handleQrDetected = useCallback(
    (codeText: string) => {
      let shopId: string | null = null;

      try {
        if (codeText.startsWith("http://") || codeText.startsWith("https://")) {
          const url = new URL(codeText);
          const match = url.pathname.match(/\/s\/([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            shopId = match[1];
          }
        } else {
          const match = codeText.match(/(?:^|\/)s\/([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            shopId = match[1];
          }
        }
      } catch {
        shopId = null;
      }

      if (shopId) {
        // Stop camera stream immediately
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        const shared =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("shared") === "1";
        router.push(
          `/app/print?shop=${encodeURIComponent(shopId)}${shared ? "&shared=1" : ""}`
        );
      } else {
        showInvalidToast("This isn't a HIMMER code");
      }
    },
    [router]
  );

  // Scan loop
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(() => {
        scanFrameRef.current?.();
      });
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(() => {
        scanFrameRef.current?.();
      });
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      handleQrDetected(code.data);
    }

    animFrameRef.current = requestAnimationFrame(() => {
      scanFrameRef.current?.();
    });
  }, [handleQrDetected]);

  useEffect(() => {
    scanFrameRef.current = scanFrame;
  }, [scanFrame]);

  const attachStream = useCallback((stream: MediaStream) => {
    streamRef.current = stream;
    const track = stream.getVideoTracks()[0];
    trackRef.current = track;

    // Check torch capability
    const capabilities = track.getCapabilities?.() as
      | { torch?: boolean }
      | undefined;
    if (capabilities && capabilities.torch) {
      setTorchAvailable(true);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute("playsinline", "true");
      videoRef.current.play().catch(() => {});
      setHasPermission(true);
      animFrameRef.current = requestAnimationFrame(() => {
        scanFrameRef.current?.();
      });
    }
  }, []);

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });

      // User allowed camera! Save to localStorage so it never asks again
      try {
        localStorage.setItem(CAMERA_PERMISSION_KEY, "true");
      } catch {}

      setShowPermissionPrompt(false);
      setIsRequestingPermission(false);
      attachStream(stream);
    } catch (err: unknown) {
      setIsRequestingPermission(false);
      setShowPermissionPrompt(false);
      setHasPermission(false);
      setErrorMessage(
        err instanceof Error ? err.message : "Camera access was denied"
      );
    }
  };

  // Start camera if already allowed, or show permission pop-up
  useEffect(() => {
    let active = true;

    async function checkPermissionAndStart() {
      // 1. Check if user already allowed camera access previously
      const stored =
        typeof window !== "undefined"
          ? localStorage.getItem(CAMERA_PERMISSION_KEY)
          : null;

      if (stored === "true") {
        // Access was previously allowed! Start camera directly without asking again
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
          });
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          attachStream(stream);
          return;
        } catch {
          // If revoked, fallback to prompt
        }
      }

      // 2. Query browser Permissions API if supported
      if (typeof navigator !== "undefined" && navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({
            name: "camera" as PermissionName,
          });
          if (!active) return;
          if (status.state === "granted") {
            try {
              localStorage.setItem(CAMERA_PERMISSION_KEY, "true");
            } catch {}
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: "environment" } },
            });
            if (!active) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            attachStream(stream);
            return;
          }
        } catch {}
      }

      // 3. Not yet granted: prompt the user with our pop-up modal
      if (active) {
        setShowPermissionPrompt(true);
      }
    }

    checkPermissionAndStart();

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [attachStream]);

  // Decode a QR from an uploaded image file. Draws the image to an offscreen
  // canvas, runs jsQR on the pixels, then routes through handleQrDetected
  // (same URL parsing + invalid-toast fallback as the camera scan).
  const handleImageFile = useCallback(
    async (file: File) => {
      try {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        try {
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Could not read image"));
            img.src = objectUrl;
          });

          const MAX_DIM = 1600; // downscale huge photos so decoding is fast
          const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            showInvalidToast("Couldn't read that image");
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });
          if (code?.data) {
            handleQrDetected(code.data);
          } else {
            showInvalidToast("No QR code found in that image");
          }
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      } catch {
        showInvalidToast("Couldn't read that image");
      }
    },
    [handleQrDetected, showInvalidToast]
  );

  const onImageInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // allow selecting the same file again
      if (file) void handleImageFile(file);
    },
    [handleImageFile]
  );

  // Toggle Torch
  const toggleTorch = async () => {
    if (!trackRef.current || !torchAvailable) return;
    try {
      const nextState = !torchOn;
      // torch is a non-standard MediaTrackConstraint supported by many mobile
      // browsers but not present in the DOM lib types.
      await trackRef.current.applyConstraints({
        advanced: [{ torch: nextState } as MediaTrackConstraintSet],
      });
      setTorchOn(nextState);
    } catch {
      // ignore
    }
  };

  // Permission denied state
  if (hasPermission === false) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-zinc-900 text-white min-h-dvh h-dvh w-full">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 text-zinc-400">
          <CameraOff className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Camera access needed to scan</h2>
        <p className="text-sm text-zinc-400 mb-6 max-w-xs leading-relaxed">
          Please allow camera access in your browser settings so HIMMER can scan the QR code on the printer.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ touchAction: "manipulation" }}
          className="min-h-12 px-7 rounded-full bg-tint text-white font-semibold text-[15px] transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Try Again
        </button>
        {errorMessage && (
          <p className="text-xs text-zinc-500 mt-4">{errorMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex-1 w-full h-dvh min-h-dvh bg-black overflow-hidden flex flex-col items-center justify-center select-none">
      {/* Hidden canvas for decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video Feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* Scrim Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6 z-10">
        {/* Top instructions */}
        <div className="pt-[max(2rem,env(safe-area-inset-top))] text-center">
          <p className="inline-block rounded-full border border-white/15 bg-black/40 px-4 py-2 text-[14px] font-medium text-white backdrop-blur-xl">
            Scan the QR code on the printer&apos;s screen
          </p>
        </div>

        {/* Viewfinder Window with 4 L-shaped corner brackets */}
        <div className="relative w-[260px] h-[260px] rounded-[32px] flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
          {/* Top-Left Bracket */}
          <div className="absolute top-0 left-0 w-10 h-10 border-t-[5px] border-l-[5px] border-white rounded-tl-[32px]" />
          {/* Top-Right Bracket */}
          <div className="absolute top-0 right-0 w-10 h-10 border-t-[5px] border-r-[5px] border-white rounded-tr-[32px]" />
          {/* Bottom-Left Bracket */}
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[5px] border-l-[5px] border-white rounded-bl-[32px]" />
          {/* Bottom-Right Bracket */}
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[5px] border-r-[5px] border-white rounded-br-[32px]" />
        </div>

        {/* Bottom spacer */}
        <div className="h-20" />
      </div>

      {/* Invalid QR Toast */}
      {invalidToast && (
        <div
          role="alert"
          className="absolute top-[max(5.5rem,calc(env(safe-area-inset-top)+4rem))] z-30 flex items-center gap-2 rounded-full border border-white/20 bg-red-600/85 px-4 py-2.5 text-[14px] font-medium text-white shadow-lg backdrop-blur-xl"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{invalidMessage}</span>
        </div>
      )}

      {/* Hidden file input — triggered by the Upload QR button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onImageInputChange}
        aria-hidden
      />

      {/* Bottom Controls */}
      <div className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-center gap-3 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Upload QR image button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ touchAction: "manipulation" }}
          aria-label="Upload a saved QR code image"
          className="min-h-12 px-5 rounded-full border border-white/15 bg-black/40 backdrop-blur-xl text-white font-semibold text-[15px] transition-transform active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white flex items-center gap-2"
        >
          <ImageUp className="w-4 h-4" aria-hidden />
          Upload QR
        </button>

        {/* Torch toggle button (if available) */}
        {torchAvailable && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-label={torchOn ? "Turn flashlight off" : "Turn flashlight on"}
            style={{ touchAction: "manipulation" }}
            className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-xl transition-all active:scale-[0.94] ${
              torchOn
                ? "bg-white text-zinc-900 shadow-md"
                : "border border-white/15 bg-black/40 text-white"
            }`}
          >
            {torchOn ? (
              <Flashlight className="w-5 h-5 text-amber-500 fill-amber-500" />
            ) : (
              <FlashlightOff className="w-5 h-5 text-white" />
            )}
          </button>
        )}

        {/* Cancel Button */}
        <button
          type="button"
          onClick={() => {
            const shared =
              typeof window !== "undefined" &&
              new URLSearchParams(window.location.search).get("shared") === "1";
            if (shared) {
              router.push("/app/print?shared=1");
              return;
            }
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/app/home");
            }
          }}
          style={{ touchAction: "manipulation" }}
          className="min-h-12 px-6 rounded-full border border-white/15 bg-black/40 backdrop-blur-xl text-white font-semibold text-[15px] transition-transform active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Cancel
        </button>
      </div>

      {/* Camera Permission Pop-up Modal */}
      {showPermissionPrompt && (
        <div className="hm-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/60 select-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="camera-permission-title"
            className="glass-sheet hm-sheet-in w-full max-w-md rounded-t-[28px] border-b-0 px-6 pt-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center space-y-5"
          >
            <span className="mx-auto block h-[5px] w-9 rounded-full bg-black/15" aria-hidden />
            {/* Camera Icon Badge */}
            <div className="w-16 h-16 rounded-[20px] bg-tint/10 text-tint flex items-center justify-center mx-auto">
              <Camera className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 id="camera-permission-title" className="text-[22px] font-bold text-label tracking-[-0.03em]">
                Camera Access Needed
              </h2>
              <p className="text-[15px] text-secondary-label leading-relaxed">
                HIMMER needs access to your camera to scan the QR code on the print kiosk.
              </p>
            </div>

            {/* Privacy note */}
            <div className="flex items-center justify-center gap-2 text-[13px] text-secondary-label bg-tint/[0.06] py-2.5 px-3 rounded-[14px]">
              <ShieldCheck className="w-4 h-4 text-tint flex-shrink-0" />
              <span>Only used for QR scanning. No photos or videos are stored.</span>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isRequestingPermission}
                style={{ touchAction: "manipulation" }}
                className="w-full min-h-[52px] rounded-full bg-tint text-white font-semibold text-[16px] transition-transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(12,131,31,0.30)] disabled:opacity-50"
              >
                {isRequestingPermission ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Opening camera…</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Allow Camera Access</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  const shared =
                    typeof window !== "undefined" &&
                    new URLSearchParams(window.location.search).get("shared") === "1";
                  if (shared) {
                    router.push("/app/print?shared=1");
                    return;
                  }
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push("/app/home");
                  }
                }}
                disabled={isRequestingPermission}
                style={{ touchAction: "manipulation" }}
                className="w-full min-h-11 rounded-full text-tint font-semibold text-[16px] transition-colors active:bg-black/[0.04]"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
