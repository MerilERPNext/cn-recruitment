import React from "react";

interface AvatarProps {
  name: string;
  initials?: string;
  size?: number;
  className?: string;
}

const GRADIENTS = [
  "from-blue-400 to-purple-500",
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-pink-500",
  "from-indigo-400 to-blue-500",
  "from-rose-400 to-red-500",
];

/** Initials avatar used across the Vibe screens (no real photos in mock data). */
const Avatar: React.FC<AvatarProps> = ({ name, initials, size = 40, className = "" }) => {
  const label =
    initials ||
    name
      .split(" ")
      .map((p) => p.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const gradient = GRADIENTS[name.length % GRADIENTS.length];

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {label || "?"}
    </div>
  );
};

export default Avatar;
