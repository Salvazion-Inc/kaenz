export function CaptainAvatar({
  src,
  name,
  size = 40,
}: {
  src: string;
  name: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 overflow-hidden rounded-full border-2 border-kaenz/70 bg-navy-2 shadow-[0_0_0_2px_rgba(5,10,48,0.55)]"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-kaenz">
          {name
            .replace(/^Captain\s+/i, "")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
        </span>
      )}
    </span>
  );
}
