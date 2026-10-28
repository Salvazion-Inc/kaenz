"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/locale";

const WorldMap = dynamic(() => import("./WorldMap").then((mod) => mod.WorldMap), {
  ssr: false,
});

const AppPhonePreview = dynamic(
  () => import("./AppPhonePreview").then((mod) => mod.AppPhonePreview),
  { ssr: false },
);

/** Map and phone preview stay out of the initial JS until the section is near the viewport and the browser is idle. */
export function BelowFoldMedia({ locale }: { locale: Locale }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let cancelled = false;
    let idleId = 0;
    let timer = 0;

    const load = () => {
      if (!cancelled) setShow(true);
    };

    const whenIdle = () => {
      const idle = window.requestIdleCallback;
      if (typeof idle === "function") idleId = idle(load, { timeout: 4000 });
      else timer = window.setTimeout(load, 2000);
    };

    const onVisible = () => {
      if (document.readyState === "complete") whenIdle();
      else window.addEventListener("load", whenIdle, { once: true });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        onVisible();
      },
      { rootMargin: "160px" },
    );
    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("load", whenIdle);
      if (idleId) window.cancelIdleCallback(idleId);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={ref} className="mt-8 grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
      <div className="kaenz-card min-h-[420px] overflow-hidden p-2 md:min-h-[520px]">
        {show ? <WorldMap locale={locale} variant="site" /> : null}
      </div>
      <div className="min-h-[36rem]">{show ? <AppPhonePreview locale={locale} /> : null}</div>
    </div>
  );
}
