import React from "react";
import { BadgeType } from "../../services/recognitionService";

interface BadgeCardProps {
  badge: BadgeType;
  isSelected: boolean;
  onSelect: () => void;
}

export const BadgeCard: React.FC<BadgeCardProps> = ({
  badge,
  isSelected,
  onSelect,
}) => {
  // Render icon - could be an image URL or icon name
  const renderIcon = () => {
    if (badge.icon) {
      // If icon is a URL/image
      if (badge.icon.startsWith("http") || badge.icon.startsWith("/")) {
        return (
          <img
            src={badge.icon}
            alt={badge.recognition_type_name}
            className="w-12 h-12 object-contain"
          />
        );
      }
      // If icon is an emoji or unicode
      return (
        <span className="text-4xl" role="img" aria-label={badge.recognition_type_name}>
          {badge.icon}
        </span>
      );
    }
    // Fallback to a default icon
    return (
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
        style={{
          backgroundColor: badge.color ? `${badge.color}20` : "#f3f4f6",
          color: badge.color || "#6b7280",
        }}
      >
        🏆
      </div>
    );
  };

  return (
    <button
      onClick={onSelect}
      className={`
        w-full p-4 rounded-lg border-2 transition-all
        flex flex-col items-center gap-3
        hover:shadow-md hover:scale-105
        ${
          isSelected
            ? "border-primary-500 bg-primary-50 shadow-md"
            : "border-gray-200 bg-white hover:border-gray-300"
        }
      `}
      type="button"
    >
      <div className="flex items-center justify-center">
        {renderIcon()}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-900">
          {badge.recognition_type_name}
        </p>
        {badge.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {badge.description}
          </p>
        )}
      </div>
    </button>
  );
};
