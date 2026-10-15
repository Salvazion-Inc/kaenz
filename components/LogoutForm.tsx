function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Real HTML form, not a React submit handler. The inline onsubmit runs before
 * hydration and drops the biometric vault, then the browser POSTs.
 */
export function LogoutForm({ label, className }: { label: string; className: string }) {
  const html = `<form action="/api/auth/logout" method="post" onsubmit="try{localStorage.removeItem('kaenz.biometric.state');localStorage.removeItem('kaenz.biometric.vault')}catch(e){}"><button type="submit" class="${esc(className)}">${esc(label)}</button></form>`;
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
