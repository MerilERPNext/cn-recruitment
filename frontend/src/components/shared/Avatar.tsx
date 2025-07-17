
import React from 'react';

interface AvatarProps {
  src?: string;
  name: string; 
  size?: string; 
}

const Avatar: React.FC<AvatarProps> = ({ src, name, size = "h-12 w-12" }) => { 
  if (src) {
    return (
      <img
        src={src}
        alt={name} 
        className={`aspect-square rounded-full ${size} object-cover border border-gray-200 bg-white`}
      />
    );
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-lg uppercase ${size}`}>
      {initials}
    </div>
  );
};

export default Avatar;