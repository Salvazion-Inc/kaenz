import Image from "next/image";

export function Logo({
  size = 72,
  className = "",
  sizes,
  priority = false,
}: {
  size?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/logo.png"
      alt="Kaenz"
      width={size}
      height={size}
      sizes={sizes}
      className={className}
      priority={priority}
    />
  );
}
