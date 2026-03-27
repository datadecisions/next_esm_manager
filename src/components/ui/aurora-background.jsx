"use client";

import { cn } from "@/lib/utils";
import React from "react";

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}) => {
  return (
    <main>
      <div
        className={cn(
          "relative isolate flex min-h-screen flex-col items-center justify-center bg-background text-foreground transition-colors dark:bg-background",
          className,
        )}
        {...props}>
        <div
          className="absolute inset-0 -z-10 overflow-hidden"
          style={{
            "--blue-300": "color-mix(in oklch, var(--accent) 55%, var(--card))",
            "--blue-400": "color-mix(in oklch, var(--accent) 75%, var(--card))",
            "--blue-500": "var(--accent)",
            "--indigo-300": "color-mix(in oklch, var(--accent) 35%, var(--primary))",
            "--violet-200": "color-mix(in oklch, var(--accent) 25%, var(--primary))",
            "--black": "#000",
            "--white": "#fff",
            "--transparent": "transparent",
          }}>
          <div
            style={{ animation: "aurora 60s linear infinite" }}
            className={cn(
              `animate-aurora pointer-events-none absolute -inset-[10px] [background-image:var(--white-gradient),var(--aurora)] bg-size-[300%,200%] bg-position-[50%_50%,50%_50%] opacity-50 blur-[10px] invert filter will-change-transform [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)] [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)] [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)] after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)] after:bg-size-[200%,100%] after:bg-fixed after:mix-blend-difference after:content-[""] dark:[background-image:var(--dark-gradient),var(--aurora)] dark:invert-0 after:dark:[background-image:var(--dark-gradient),var(--aurora)]`,
              showRadialGradient &&
                `mask-[radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`,
            )}></div>
        </div>
        <div className="relative z-10 flex w-full flex-col items-center justify-center">
          {children}
        </div>
      </div>
    </main>
  );
};
