import { useEffect, useRef, useState } from "react";
import { FiCalendar, FiChevronDown } from "react-icons/fi";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const EditITDeclarationAccess = ({ isOpen, onClose }: Props) => {
  const [statusOpen, setStatusOpen] = useState(false);
  const [declarationOpen, setDeclarationOpen] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState("Open");
  const [selectedDeclaration, setSelectedDeclaration] =
    useState("IT Declaration");

  const statusRef = useRef<HTMLDivElement>(null);
  const declarationRef = useRef<HTMLDivElement>(null);

  // ESC key close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        statusRef.current &&
        !statusRef.current.contains(e.target as Node)
      ) {
        setStatusOpen(false);
      }

      if (
        declarationRef.current &&
        !declarationRef.current.contains(e.target as Node)
      ) {
        setDeclarationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Popup Card */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6 animate-scaleIn">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Edit IT Declaration Access
            </h2>
            <p className="text-sm text-gray-500">
              Update configuration and access period for employees.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Select Status */}
        <div className="mb-4 relative" ref={statusRef}>
          <label className="text-sm text-gray-600 block mb-2">
            Select Status
          </label>

          <div
            onClick={() => setStatusOpen(!statusOpen)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 flex justify-between items-center cursor-pointer"
          >
            <span>{selectedStatus}</span>
            <FiChevronDown
              className={`transition-transform ${
                statusOpen ? "rotate-180" : ""
              }`}
            />
          </div>

          {statusOpen && (
            <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
              {["Open", "Closed"].map((item) => (
                <div
                  key={item}
                  onClick={() => {
                    setSelectedStatus(item);
                    setStatusOpen(false);
                  }}
                  className="px-4 py-3 hover:bg-gray-100 cursor-pointer text-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Select Declaration */}
        <div className="mb-6 relative" ref={declarationRef}>
          <label className="text-sm text-gray-600 block mb-2">
            Select Declaration Type
          </label>

          <div
            onClick={() => setDeclarationOpen(!declarationOpen)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 flex justify-between items-center cursor-pointer"
          >
            <span>{selectedDeclaration}</span>
            <FiChevronDown
              className={`transition-transform ${
                declarationOpen ? "rotate-180" : ""
              }`}
            />
          </div>

          {declarationOpen && (
            <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
              {[
                "IT Declaration",
                "Proof of Investment (POI)",
                "Tax Regime",
              ].map((item) => (
                <div
                  key={item}
                  onClick={() => {
                    setSelectedDeclaration(item);
                    setDeclarationOpen(false);
                  }}
                  className="px-4 py-3 hover:bg-gray-100 cursor-pointer text-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manage Date */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiCalendar className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-600 uppercase">
              Manage Date
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value="2026-02-27"
              disabled
              className="border rounded-xl px-4 py-3 bg-gray-100"
            />
            <input type="date" className="border rounded-xl px-4 py-3" />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600"
          >
            Cancel
          </button>

          <button className="px-6 py-2.5 rounded-xl bg-orange-500 text-white">
            SUBMIT
          </button>
        </div>
      </div>

      {/* Animation */}
      <style>
        {`
          .animate-scaleIn {
            animation: scaleIn 0.2s ease-out;
          }
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>
    </div>
  );
};

export default EditITDeclarationAccess;