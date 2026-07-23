import React from "react";

export interface PcardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const Pcard: React.FC<PcardProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`min-w-0 rounded-xl border border-gray-100 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Pcard;
