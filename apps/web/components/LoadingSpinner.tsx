import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function LoadingSpinner({
  size = "md",
  className = "",
  label = "Loading...",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div role="status" className="inline-flex items-center justify-center">
      <Loader2
        className={`animate-spin text-zinc-400 ${sizeClasses[size]} ${className}`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
