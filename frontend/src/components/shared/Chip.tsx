interface ChipProps {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  variant?: "default" | "primary" | "outline";
}

export function Chip({
  label,
  icon: Icon,
  href,
  onClick,
  active,
  variant = "default",
}: ChipProps) {
  const baseClass = `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
                     border bg-gray-900/80 border-gray-700/60 backdrop-blur
                     hover:bg-gray-800/90 transition-all duration-100
                     hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500`;

  const activeClass = active
    ? "border-indigo-400/80 text-indigo-200"
    : "text-gray-200";
  const variantClass =
    variant === "primary" ? "bg-indigo-600/80 border-indigo-500" : "";

  const className = `${baseClass} ${activeClass} ${variantClass}`;

  const content = (
    <>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-pressed={active ?? undefined}
    >
      {content}
    </button>
  );
}
