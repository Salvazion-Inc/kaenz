"use client";

import { useEffect, useRef, useState } from "react";
import { useTrip } from "@/lib/trip-store";

const MIN_MS = 4200;
const FADE_MS = 450;

export function AppSplash({ children }: { children: React.ReactNode }) {
  const { ready } = useTrip();
  const mountedAt = useRef(0);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  useEffect(() => {
    if (!ready || !visible) return;
    const wait = Math.max(0, MIN_MS - (performance.now() - mountedAt.current));
    const show = window.setTimeout(() => setFading(true), wait);
    return () => window.clearTimeout(show);
  }, [ready, visible]);

  useEffect(() => {
    if (!fading) return;
    const fade = window.setTimeout(() => setVisible(false), FADE_MS);
    return () => window.clearTimeout(fade);
  }, [fading]);

  return (
    <>
      {children}
      {visible ? (
        <div
          className={`fixed inset-0 z-[100] isolate flex items-center justify-center bg-navy transition-opacity duration-500 ${
            fading ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          role="status"
          aria-live="polite"
          aria-label="Kaenz"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-splash.png"
            alt=""
            className="h-[min(88vw,24rem)] w-[min(88vw,24rem)] object-contain mix-blend-lighten"
          />
          <video
            className="app-splash-video absolute h-[min(88vw,24rem)] w-[min(88vw,24rem)] object-contain mix-blend-lighten"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/brand/logo-splash.png"
          >
            <source src="/brand/logo-loading.mp4" type="video/mp4" />
          </video>
        </div>
      ) : null}
    </>
  );
}
