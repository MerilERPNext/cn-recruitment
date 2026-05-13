/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from "react";

export const OcrParsingStep: React.FC<{
  label: string;
  delay: number;
  index: number;
}> = ({ label, delay }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!visible) return null;

  return (
    <div
      className="flex items-center gap-2"
      style={{
        animation: "ocrStepFadeIn 0.4s ease-out forwards",
      }}
    >
      <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
      <span className="text-xs text-blue-600">{label}</span>
      <style>{`
        @keyframes ocrStepFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
