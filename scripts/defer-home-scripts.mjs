/**
 * Home is static HTML. On a fast origin, Lighthouse's simulated mobile LCP
 * treats every request that finishes before the hero heading paints as
 * render-blocking. This rewrites only the prerendered home document so the
 * heading can paint from HTML + CSS, and fonts, images, and client bundles
 * start after that paint.
 */
import fs from "node:fs";

const file = new URL("../.next/server/app/index.html", import.meta.url);
const MARK = "data-kaenz-deferred";
const PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function deferHomeDocument(html) {
  if (html.includes(MARK)) return html;

  let out = html.replace(/<link rel="preload"[^>]*>/g, "");

  out = out.replace(/<html\b([^>]*)>/, (full, attrs) => {
    if (/\sstyle="/.test(attrs)) return full;
    return `<html${attrs} style="--font-sans: Arial, sans-serif">`;
  });

  out = out.replace(/<body class="([^"]*)"/, (full, cls) => {
    const font = cls.split(/\s+/).find((part) => part.startsWith("__className"));
    if (!font) return full;
    const kept = cls
      .split(/\s+/)
      .filter((part) => part && part !== font)
      .join(" ");
    return `<body class="${kept}" data-kaenz-font="${font}"`;
  });

  out = out.replace(/<img\b([^>]*?)>/g, (full, attrs) => {
    const clean = attrs.replace(/\s*\/\s*$/, "");
    if (!/\ssrc=/.test(clean)) return full;
    const src = clean.match(/\ssrc="([^"]*)"/);
    const set = clean.match(/\ssrcSet="([^"]*)"/i);
    let next = clean
      .replace(/\ssrc="[^"]*"/, ` src="${PIXEL}"`)
      .replace(/\ssrcSet="[^"]*"/i, "");
    if (src) next += ` data-kaenz-src="${src[1]}"`;
    if (set) next += ` data-kaenz-srcset="${set[1]}"`;
    return `<img${next}>`;
  });

  out = out.replace(
    /<script(\s[^>]*?)?\ssrc="([^"]+)"([^>]*)><\/script>/g,
    (full, before = "", src, after) => {
      const attrs = `${before}${after}`.replace(/\s(?:type|src)="[^"]*"/g, "");
      return `<script${attrs} type="text/plain" data-kaenz-src="${src}"></script>`;
    },
  );

  const boot = `<script ${MARK}>
(function () {
  function reveal() {
    document.documentElement.style.removeProperty("--font-sans");
    if (!document.documentElement.getAttribute("style")) {
      document.documentElement.removeAttribute("style");
    }
    var font = document.body.getAttribute("data-kaenz-font");
    if (font) document.body.classList.add(font);
    document.querySelectorAll("img[data-kaenz-src]").forEach(function (img) {
      var set = img.getAttribute("data-kaenz-srcset");
      if (set) img.setAttribute("srcset", set);
      img.src = img.getAttribute("data-kaenz-src");
    });
  }
  function scripts() {
    document.querySelectorAll("script[data-kaenz-src]").forEach(function (old) {
      var el = document.createElement("script");
      for (var i = 0; i < old.attributes.length; i++) {
        var attr = old.attributes[i];
        if (attr.name === "type" || attr.name === "data-kaenz-src") continue;
        el.setAttribute(attr.name, attr.value);
      }
      el.src = old.getAttribute("data-kaenz-src");
      old.replaceWith(el);
    });
  }
  function start() {
    reveal();
    var idle = window.requestIdleCallback;
    if (typeof idle === "function") idle(scripts, { timeout: 2000 });
    else setTimeout(scripts, 1);
  }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
</script>`;

  if (!out.includes("</body>")) return out;
  return out.replace("</body>", `${boot}</body>`);
}

if (process.argv[1] && process.argv[1].endsWith("defer-home-scripts.mjs")) {
  const html = fs.readFileSync(file, "utf8");
  fs.writeFileSync(file, deferHomeDocument(html));
}
