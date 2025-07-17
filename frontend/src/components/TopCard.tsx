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

interface TopCardProps {
  name: string;
  email: string;
  phone_number: string;
  jobTitle: string;
  applicantId: string;
  status?: string;
  customSubStatus?: string;
  refetch?: () => void;
}

const TopCard: React.FC<TopCardProps> = ({
  name,
  email,
  phone_number,
  jobTitle,
  applicantId,
  status: initialStatus = "Open",
  customSubStatus: initialSubStatus = "",
  refetch,
}) => {
  const [status, setStatus] = useState<string>(initialStatus);
  const [subStatus, setSubStatus] = useState<string>(initialSubStatus);
  const isFirstRender = useRef(true);

  const { data: subStatusOptions = [], isLoading: isSubLoading } =
    useSubStatuses(status);
  const updateMutation = useUpdateJobApplicant();

  // Set default sub-status
  useEffect(() => {
    if (!initialSubStatus && subStatusOptions.length > 0) {
      setSubStatus(subStatusOptions[0]);
    }
  }, [subStatusOptions, initialSubStatus]);

  // Update backend when status/subStatus change
  useEffect(() => {
    if (!applicantId || isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    updateMutation.mutate(
      {
        name: applicantId,
        updates: {
          status,
          custom_substatus: subStatus,
        },
      },
      {
        onSuccess: () => {
          console.log("✅ Backend updated. Refetching latest data...");
          refetch?.();
        },
      }
    );
  }, [status, subStatus, applicantId, refetch]);

  const handleCall = () => {
    console.log("📞 Phone number (raw):", phone_number);
    if (phone_number && phone_number !== "N/A") {
      window.open(`tel:${phone_number}`);
      console.log("✅ Call triggered for", phone_number);
    } else {
      console.log("❌ Phone number not available for call.");
    }
  };

  const handleWhatsApp = () => {
    console.log("💬 Phone number (raw):", phone_number);
    if (phone_number && phone_number !== "N/A") {
      let cleanPhoneNumber = phone_number.replace(/\D/g, "");
      if (cleanPhoneNumber.length === 10 && !cleanPhoneNumber.startsWith("91")) {
        cleanPhoneNumber = "91" + cleanPhoneNumber;
      }
      const whatsappUrl = `https://wa.me/${cleanPhoneNumber}`;
      console.log("✅ WhatsApp URL:", whatsappUrl);
      window.open(whatsappUrl, "_blank");
    } else {
      console.log("❌ Phone number not available for WhatsApp.");
    }
  };

  const handleEmail = () => {
    if (email && email !== "N/A") {
      window.open(`mailto:${email}`);
      console.log("Email clicked for", email);
    } else {
      console.log("Email ID not available.");
    }
  };

  return (
    <div className="p-4 bg-white">
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

      <div className="grid grid-cols-2 gap-4 mb-4">
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

      <div className="flex justify-between items-center gap-2 p-2">
        <button
          onClick={handleCall}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-[var(--primary-color)] text-white rounded-lg font-semibold text-sm"
        >
          <MdCall className="text-base" /> Call
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-500 text-white rounded-lg font-semibold text-sm"
        >
          <MdChat className="text-base" /> WhatsApp
        </button>
        <button
          onClick={handleEmail}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-200 text-[var(--text-primary)] rounded-lg font-semibold text-sm"
        >
          <MdMail className="text-base" /> Email
        </button>
      </div>
    </div>
  );
};

export default TopCard;
