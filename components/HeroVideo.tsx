"use client";

import { useEffect, useState } from "react";

/**
 * The poster is a real image in the server HTML. This island only attaches
 * the video after load, once the browser is idle.
 */
export function HeroVideo() {
  const [play, setPlay] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let idleId = 0;
    let timer = 0;
    const attach = () => {
      if (!cancelled) setPlay(true);
    };
    const afterLoad = () => {
      const idle = window.requestIdleCallback;
      if (typeof idle === "function") idleId = idle(attach, { timeout: 2000 });
      else timer = window.setTimeout(attach, 1);
    };
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", afterLoad);
      if (idleId) window.cancelIdleCallback(idleId);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (!play) return null;

  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="none"
    >
      <source src="/hero-720.webm" type="video/webm" media="(max-width: 767px)" />
      <source src="/hero-720.mp4" type="video/mp4" media="(max-width: 767px)" />
      <source src="/hero.webm" type="video/webm" />
      <source src="/hero.mp4" type="video/mp4" />
    </video>
  );
}
