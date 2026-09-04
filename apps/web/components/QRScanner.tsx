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
  const [invalidMessage, setInvalidMessage] = useState<string>("This isn't a PrintBuddy code");
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
        router.push(`/app/print?shop=${encodeURIComponent(shopId)}`);
      } else {
        showInvalidToast("This isn't a PrintBuddy code");
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
          Please allow camera access in your browser settings so PrintBuddy can scan the QR code on the printer.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ touchAction: "manipulation" }}
          className="min-h-[48px] px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 active:bg-indigo-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
        <div className="pt-8 text-center">
          <p className="text-sm font-medium text-white/90 bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm inline-block shadow-sm">
            Scan the QR code on the printer&apos;s screen
          </p>
        </div>

        {/* Viewfinder Window with 4 L-shaped corner brackets */}
        <div className="relative w-[260px] h-[260px] rounded-2xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
          {/* Top-Left Bracket */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
          {/* Top-Right Bracket */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
          {/* Bottom-Left Bracket */}
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
          {/* Bottom-Right Bracket */}
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
        </div>

        {/* Bottom spacer */}
        <div className="h-20" />
      </div>

      {/* Invalid QR Toast */}
      {invalidToast && (
        <div
          role="alert"
          className="absolute top-20 z-30 flex items-center gap-2 bg-red-600 text-white text-sm py-2.5 px-4 rounded-xl shadow-lg"
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
      <div className="absolute bottom-6 inset-x-0 z-20 flex items-center justify-center gap-4 px-6">
        {/* Upload QR image button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ touchAction: "manipulation" }}
          aria-label="Upload a saved QR code image"
          className="min-h-[48px] px-5 py-2.5 rounded-full bg-black/60 backdrop-blur-md text-white font-medium text-sm hover:bg-black/80 active:bg-black/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white flex items-center gap-2"
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
            className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
              torchOn
                ? "bg-white text-zinc-900 shadow-md"
                : "bg-black/50 text-white hover:bg-black/70 active:bg-black/80"
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
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/app/home");
            }
          }}
          style={{ touchAction: "manipulation" }}
          className="min-h-[48px] px-6 py-2.5 rounded-full bg-black/60 backdrop-blur-md text-white font-medium text-sm hover:bg-black/80 active:bg-black/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Cancel
        </button>
      </div>

      {/* Camera Permission Pop-up Modal */}
      {showPermissionPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 select-auto">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 text-center shadow-2xl border border-zinc-100 dark:border-zinc-800 space-y-5">
            {/* Camera Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
              <Camera className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                Camera Access Needed
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                PrintBuddy needs access to your camera to scan the QR code on the print kiosk.
              </p>
            </div>

            {/* Privacy note */}
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 py-2.5 px-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Only used for QR scanning. No photos or videos are stored.</span>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isRequestingPermission}
                style={{ touchAction: "manipulation" }}
                className="w-full min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
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
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push("/app/home");
                  }
                }}
                disabled={isRequestingPermission}
                style={{ touchAction: "manipulation" }}
                className="w-full min-h-[44px] rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium text-sm transition-colors"
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
