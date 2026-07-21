"use client";
import { X } from "lucide-react";
import PolicyQAContent from "./PolicyQAContent";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  doctypeName: string;
  targetDoctype: string;
}

const PolicyDrawer = ({
  isOpen,
  onClose,
  title,
  doctypeName,
  targetDoctype,
}: Props) => {
  if (!isOpen) return null;

  return (
    <div>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close drawer"
        className="fixed inset-0 bg-black/50 z-[100] cursor-default"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[40rem] bg-white z-[110] shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="base-title">{title}</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto">
          <PolicyQAContent
            doctypeName={doctypeName}
            targetDoctype={targetDoctype}
            showStatus={doctypeName === "Attendance Policies" || doctypeName === "Overtime Policy"}
          />
        </div>
      </div>
    </div>
  );
};

export default PolicyDrawer;
