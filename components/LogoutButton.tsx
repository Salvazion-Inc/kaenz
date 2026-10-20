export function LogoutButton({
  label,
  className,
  onSubmit,
}: {
  label: string;
  className?: string;
  onSubmit?: () => void;
}) {
  return (
    <form action="/api/auth/logout" method="POST" className="inline" onSubmit={onSubmit}>
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
