export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-[100] isolate flex items-center justify-center bg-navy"
      role="status"
      aria-label="Kaenz"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-splash.png"
        alt="Kaenz"
        width={384}
        height={384}
        className="h-96 w-96 object-contain mix-blend-lighten"
      />
    </div>
  );
}
