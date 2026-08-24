import Image from "next/image";

export function Logo({
  size = 72,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/brand/logo.png"
      alt="Kaenz"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
