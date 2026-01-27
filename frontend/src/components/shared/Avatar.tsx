import React from "react";

interface AvatarProps {
  src?: string;
  name: string;
  size?: string;
  indicatorBgColor?: string;
  indicatorBorderColor?: string;
  indicatorNode?: React.ReactNode;
  indicatorSize?: string;
  indicatorPositionClass?: string;
  avatarBgColor?: string;
  avatarTextColor?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "h-12 w-12",
  indicatorBgColor,
  indicatorBorderColor = "border-white",
  indicatorNode,
  indicatorSize = "h-4 w-4",
  indicatorPositionClass = "absolute bottom-0 right-0",
  avatarBgColor = "bg-indigo-100", avatarTextColor = "text-indigo-800"
}) => {
  // If a custom indicator node is passed, render that instead
  const indicator = indicatorNode ? (
    <span className={`${indicatorPositionClass} ${indicatorSize}`}>
      {indicatorNode}
    </span>
  ) : indicatorBgColor ? (
    <span
      className={`${indicatorPositionClass} ${indicatorSize} rounded-full ${indicatorBgColor} ${indicatorBorderColor}`}
    />
  ) : null;

  const avatarContent = src ? (
    <img
      src={src}
      alt={name}
      className={`aspect-square rounded-full object-cover border border-gray-200 bg-white ${size}`}
    />
  ) : (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-lg uppercase ${avatarBgColor} ${avatarTextColor} ${size}`}
    >
      {name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()}
    </div>
  );

  return (
    <div className="relative inline-block">
      {avatarContent}
      {indicator}
    </div>
  );
};

export default Avatar;