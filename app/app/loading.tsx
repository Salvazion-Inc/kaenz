export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy"
      role="status"
      aria-label="Kaenz"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-splash.png"
        alt="Kaenz"
        width={288}
        height={288}
        className="h-72 w-72 rounded-[1.75rem] object-cover"
      />
    </div>
  );
}
