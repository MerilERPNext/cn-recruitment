// frontend/src/components/shared/Avatar.tsx
import React from 'react';

interface AvatarProps {
  src?: string;
  name: string; // Changed from 'alt' in JobApplicantList for consistency with initial suggestion
  size?: string; // e.g., "h-14 w-14"
}

const Avatar: React.FC<AvatarProps> = ({ src, name, size = "h-12 w-12" }) => { // Default size as per original
  if (src) {
    return (
      <img
        src={src}
        alt={name} // Use name as alt text
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