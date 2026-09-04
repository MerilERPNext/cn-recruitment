import { Typography } from "./atoms/Typography";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "purple" | "purple-outline" | "blue" | "white" | "default";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  backgroundColor?: string;
  textColor?: string;
  pulse?: {
    show: boolean,
    color?: string
  }
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string; pulse?: string }> = {
  success: { bg: "bg-green-100", text: "text-green-700", pulse: "bg-green-700" },
  warning: { bg: "bg-yellow-100", text: "text-yellow-700", pulse: "bg-yellow-700" },
  danger: { bg: "bg-red-100", text: "text-red-700", pulse: "bg-red-700" },
  info: { bg: "bg-blue-100", text: "text-blue-700" },
  purple: { bg: "bg-purple-100", text: "text-purple-700" },
  "purple-outline": { bg: "bg-purple-100 ring-1 ring-inset ring-purple-300", text: "text-purple-700" },
  blue: { bg: "bg-blue-500", text: "text-white" },
  white: { bg: "bg-white", text: "text-blue-600" },
  default: { bg: "bg-gray-200", text: "text-black" },
};

/* Most status maps in the app return a single "bg-x text-y" pair and pass the
   whole thing as `backgroundColor` (see getStatusColor in Requisition,
   ReferralList, HelpDesk...). The text half has to be pulled back out, or the
   label falls through to `text-black` — which dark mode remaps to the title
   ink, so every badge's label renders in the same near-white and the status
   colour stops carrying any meaning. */
const splitColorClasses = (value?: string) => {
  const tokens = value?.split(/\s+/).filter(Boolean) ?? [];
  const isTextClass = (token: string) => /(^|:)text-/.test(token);
  return {
    bg: tokens.filter((token) => !isTextClass(token)).join(" "),
    text: tokens.filter(isTextClass).join(" "),
  };
};

const Badge = ({
  label,
  variant,
  backgroundColor,
  textColor,
  pulse,
  size = "md",
  icon,
}: BadgeProps) => {
  const sizeClasses = {
    sm: "py-0.5 px-2 text-xs",
    md: "py-1 px-3 text-sm",
    lg: "py-2 px-4 text-base",
  };

  const custom = splitColorClasses(backgroundColor);

  const styles = variant ? VARIANT_STYLES[variant] : {
    bg: custom.bg || "bg-gray-200",
    text: textColor || custom.text || "text-black",
    pulse: pulse?.color
  };

  const showPulse = pulse?.show !== undefined ? pulse.show : !!(variant && styles.pulse);

  return (
    <div className={`w-fit rounded-xl ${styles.bg} ${styles.text} ${sizeClasses[size]} flex justify-center items-center gap-1.5`}>
      {showPulse && <span
        className={`w-2 h-2 rounded-full animate-pulse ${styles.pulse || pulse?.color}`}
      />}
      {icon && <span className="flex items-center justify-center shrink-0">{icon}</span>}
      <Typography variant="label" className={styles.text}>
        {label}
      </Typography>
    </div>
  );
};

export default Badge;

