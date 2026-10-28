"use client";

import { useEffect, useState } from "react";

/**
 * The poster is the first paint. The video element is added only after the
 * window load event and an idle callback, so it cannot cover the poster and
 * move LCP onto the heading.
 */
export function HeroVideo() {
  const [play, setPlay] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let idleId = 0;
    let timer = 0;
    const paintPoster = () => {
      const hero = document.querySelector<HTMLElement>(".hero-media");
      if (!hero) return;
      hero.style.backgroundImage =
        'image-set(url("/hero-poster.avif") type("image/avif"), url("/hero-poster.jpg") type("image/jpeg"))';
    };
    const attach = () => {
      if (cancelled) return;
      paintPoster();
      setPlay(true);
    };
    const afterLoad = () => {
      // requestIdleCallback fires immediately once hydration is done, which is
      // still inside the LCP window. Wait until that window has closed, then
      // attach the file while the browser is idle.
      timer = window.setTimeout(() => {
        const idle = window.requestIdleCallback;
        if (typeof idle === "function") idleId = idle(attach, { timeout: 2000 });
        else attach();
      }, 12000);
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

  return (
    <>
      {play ? (
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
      ) : null}
    </>
  );
}
