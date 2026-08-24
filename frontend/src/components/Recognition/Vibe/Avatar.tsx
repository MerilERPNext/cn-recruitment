import React, { useState } from "react";

interface AvatarProps {
  name: string;
  initials?: string;
  /** Optional explicit photo URL. Falls back to a deterministic one from the name. */
  photo?: string;
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

/**
 * Profile avatar used across the Vibe screens. Renders a profile photo and
 * gracefully falls back to a gradient initials badge if the image fails to load.
 */
const Avatar: React.FC<AvatarProps> = ({ name, initials, photo, size = 40, className = "" }) => {
  const [imageError, setImageError] = useState(false);

  const label =
    initials ||
    name
      .split(" ")
      .map((p) => p.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const gradient = GRADIENTS[name.length % GRADIENTS.length];

  if (photo && !imageError) {
    return (
      <img
        src={photo}
        alt={name}
        onError={() => setImageError(true)}
        className={`rounded-full object-cover shrink-0 bg-gray-100 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

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
