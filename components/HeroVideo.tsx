"use client";

import { useEffect, useRef } from "react";

/** Poster stays up until idle, then a 720p source is attached. preload stays none. */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let cancelled = false;
    const attach = () => {
      if (cancelled || video.querySelector("source")) return;
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const webm = document.createElement("source");
      webm.src = mobile ? "/hero-720.webm" : "/hero.webm";
      webm.type = "video/webm";
      const mp4 = document.createElement("source");
      mp4.src = mobile ? "/hero-720.mp4" : "/hero.mp4";
      mp4.type = "video/mp4";
      video.append(webm, mp4);
      video.load();
      void video.play().catch(() => {
        /* autoplay can be blocked; the poster remains */
      });
    };
    const idle = window.requestIdleCallback;
    if (typeof idle === "function") {
      const id = idle(attach, { timeout: 2000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const id = window.setTimeout(attach, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);

  return (
    <>
      <picture>
        <source srcSet="/hero-poster.avif" type="image/avif" />
        <source srcSet="/hero-poster.webp" type="image/webp" />
        <img
          src="/hero-poster.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster="/hero-poster.webp"
      />
    </>
  );
}
