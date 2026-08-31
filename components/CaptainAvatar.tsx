import Image from "next/image";

export function CaptainAvatar({
  src,
  name,
  size = 40,
}: {
  src: string;
  name: string;
  size?: number;
}) {
  const className = "rounded-full object-cover";
  if (!src) {
    return (
      <div
        className="rounded-full bg-white/15"
        style={{ width: size, height: size }}
      />
    );
  }
  if (src.startsWith("http") || src.endsWith(".svg")) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className={className}
    />
  );
}
