import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface ViewAllProps {
  to?: string;
  onClick?: () => void;
  title?: string;
  className?: string;
  size?: number;
}

export const ViewAll = ({
  to,
  onClick,
  title = "View All",
  className,
  size = 16,
}: ViewAllProps) => {
  const baseClass =
    "flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-primary";

  if (to) {
    return (
      <Link to={to} className={`${baseClass} ${className || ""}`} title={title}>
        <span>{title}</span>
        <ExternalLink size={size} />
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClass} ${className || ""}`}
      title={title}
    >
      <span>{title}</span>
      <ExternalLink size={size} />
    </button>
  );
};
