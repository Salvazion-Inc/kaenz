"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/locale";

const WorldMap = dynamic(() => import("./WorldMap").then((mod) => mod.WorldMap), {
  ssr: false,
  loading: () => <div className="h-[420px] bg-navy-2 md:h-[520px]" aria-hidden />,
});

export function LazyWorldMap({ locale }: { locale: Locale }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShow(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="min-h-[420px] md:min-h-[520px]">
      {show ? <WorldMap locale={locale} variant="site" /> : null}
    </div>
  );
}
