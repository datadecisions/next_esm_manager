import React from "react";

export default function DataDecisionsLogo({ className = "size-6", ...props }) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      {/* Background Squares (Filled) */}
      <rect x="75" y="10" width="50" height="50" rx="12" fill="currentColor" />
      <rect x="140" y="10" width="50" height="50" rx="12" fill="currentColor" />
      <rect x="75" y="75" width="50" height="50" rx="12" fill="currentColor" />
      <rect x="140" y="75" width="50" height="50" rx="12" fill="currentColor" />
      <rect x="10" y="140" width="50" height="50" rx="12" fill="currentColor" />
      <rect x="75" y="140" width="50" height="50" rx="12" fill="currentColor" />
      <rect x="140" y="140" width="50" height="50" rx="12" fill="currentColor" />

      {/* Outlined Squares (Empty) */}
      <rect
        x="12"
        y="12"
        width="46"
        height="46"
        rx="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
      <rect
        x="12"
        y="77"
        width="46"
        height="46"
        rx="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
    </svg>
  );
}
