import React from "react";

interface CircularLoaderProps {
  size?: "sm" | "md" | "lg";
  color?: "gray-700" | "red-700" | "blue-500" | "white" | "black" | "primary"; // add as needed
  className?: string;
}

const sizeMap: Record<NonNullable<CircularLoaderProps["size"]>, string> = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

const colorMap: Record<NonNullable<CircularLoaderProps["color"]>, string> = {
  "gray-700": "border-gray-700",
  "red-700": "border-red-700",
  "blue-500": "border-blue-500",
  primary: "border-primary",
  white: "border-white",
  black: "border-black",
};

const CircularLoader: React.FC<CircularLoaderProps> = ({
  size = "md",
  color = "gray-700",
  className = "",
}) => {
  const sizeClasses = sizeMap[size];
  const colorClass = colorMap[color] || "border-gray-700"; // fallback

  const finalClassName = `inline-block animate-spin border-2 border-t-transparent rounded-full ${colorClass} ${sizeClasses} ${className}`;

  return <div className={finalClassName}></div>;
};

export default CircularLoader;
