import React from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: string;
  status?: "present" | "absent" | "onleave";
}

const statusColors = {
  present: "bg-green-500",
  absent: "bg-red-500",
  onleave: "bg-yellow-400",
};

const Avatar: React.FC<AvatarProps> = ({ src, name, size = "h-12 w-12", status }) => {
  const statusDot = status ? (
    <span
      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${statusColors[status]}`}
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
      className={`flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-lg uppercase ${size}`}
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
      {statusDot}
    </div>
  );
};

export default Avatar;
