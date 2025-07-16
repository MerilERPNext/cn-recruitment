import React, { useState, useEffect, useRef } from "react";
import {
  MdCall,
  MdChat,
  MdMail,
  MdExpandMore,
  MdPerson,
} from "react-icons/md";
import {
  useSubStatuses,
  useUpdateJobApplicant,
} from "../hooks/useJobApplicant";

// ✅ Props interface
interface TopCardProps {
  name: string;
  email: string;
  jobTitle: string;
  applicantId: string;
  status?: string;
  customSubStatus?: string;
}


const TopCard: React.FC<TopCardProps> = ({
  name,
  email,
  jobTitle,
  applicantId,
  status: initialStatus = "Open", // ✅ fallback to Open
  customSubStatus: initialSubStatus = "", // ✅ fallback to empty
}) => {
  const [status, setStatus] = useState<string>(initialStatus);
  const [subStatus, setSubStatus] = useState<string>(initialSubStatus);
  const isFirstRender = useRef(true);

  const { data: subStatusOptions = [], isLoading: isSubLoading } =
    useSubStatuses(status);
  const updateMutation = useUpdateJobApplicant();

  // Auto-select substatus if not set
  useEffect(() => {
    if (subStatusOptions.length > 0) {
      setSubStatus((prev) => prev || subStatusOptions[0]);
    } else {
      setSubStatus("");
    }
  }, [subStatusOptions]);

  // Update backend when status/subStatus change
  useEffect(() => {
    if (!applicantId || isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    console.log("🟢 Updating backend with:", {
      status,
      custom_substatus: subStatus,
    });

    updateMutation.mutate({
      name: applicantId,
      updates: {
        status,
        custom_substatus: subStatus,
      },
    });
  }, [status, subStatus]);

  return (
    <div className="p-4 bg-white">
      {/* --- Profile Info --- */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-3xl">
          <MdPerson />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {name}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">{email}</p>
          <p className="text-sm text-[var(--text-secondary)]">{jobTitle}</p>
        </div>
      </div>

      {/* --- Dropdowns --- */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Status Dropdown */}
        <div className="relative flex-1">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full appearance-none bg-gray-100 border border-gray-300 text-sm font-semibold rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]"
          >
            {[
              "Open",
              "Screening",
              "Replied",
              "Interview",
              "Hold",
              "Approvals",
              "Accepted",
              "Rejected",
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--text-secondary)]">
            <MdExpandMore className="text-base" />
          </div>
        </div>

        {/* Sub-status Dropdown */}
        <div className="relative flex-1">
          <select
            disabled={isSubLoading}
            value={subStatus}
            onChange={(e) => setSubStatus(e.target.value)}
            className="w-full appearance-none bg-gray-100 border border-gray-300 text-sm font-semibold rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)]"
          >
            {subStatusOptions.length === 0 ? (
              <option value="">No sub-status available</option>
            ) : (
              subStatusOptions.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))
            )}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--text-secondary)]">
            <MdExpandMore className="text-base" />
          </div>
        </div>
      </div>

      {/* --- Action Buttons --- */}
      <div className="flex justify-between items-center gap-2 p-2">
        <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-[var(--primary-color)] text-white rounded-lg font-semibold text-sm">
          <MdCall className="text-base" /> Call
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-500 text-white rounded-lg font-semibold text-sm">
          <MdChat className="text-base" /> WhatsApp
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-200 text-[var(--text-primary)] rounded-lg font-semibold text-sm">
          <MdMail className="text-base" /> Email
        </button>
      </div>
    </div>
  );
};

export default TopCard;
