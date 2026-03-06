import { useEffect, useRef, useState } from "react";
import { FiCalendar, FiChevronDown } from "react-icons/fi";
import Button from "../../../shared/atoms/Button";
import {
  useEditITDeclaration,
  useEditValueITDeclaration,
} from "../../../../hooks/payroll/useEditITDeclaration";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  empdoc_id: string | null;
};

type FormState = {
  status: "Open" | "Closed" | "";
  declaration_type: string;
  from_date: string;
  to_date: string;
};

const EditITDeclarationAccess = ({
  isOpen,
  onClose,
  empdoc_id,
}: Props) => {
  const mutation = useEditITDeclaration();
  const { data: editValueITDeclaration } =
    useEditValueITDeclaration(empdoc_id);

  const [statusOpen, setStatusOpen] = useState(false);
  const [declarationOpen, setDeclarationOpen] = useState(false);

  const [formData, setFormData] = useState<FormState>({
    status: "",
    declaration_type: "",
    from_date: "",
    to_date: "",
  });

  const statusRef = useRef<HTMLDivElement>(null);
  const declarationRef = useRef<HTMLDivElement>(null);

  console.log("editValueITDeclaration", editValueITDeclaration);

  // 🔹 Backend default values
  useEffect(() => {
    if (editValueITDeclaration) {
      setFormData({
        status: editValueITDeclaration.status || "",
        declaration_type: editValueITDeclaration.type || "",
        from_date:
          editValueITDeclaration.individual_start_date || "",
        to_date:
          editValueITDeclaration.individual_end_date || "",
      });
    }
  }, [editValueITDeclaration]);

  // ESC close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) document.addEventListener("keydown", handleEsc);

    return () =>
      document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Close dropdown outside
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

  const updateField = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 🔥 Submit
  const handleSubmit = async () => {
    try {
      await mutation.mutateAsync({
        empdoc_id: empdoc_id,
        declaration_type: formData.declaration_type,
        status: formData.status,
        from_date: formData.from_date,
        to_date: formData.to_date,
      });

      onClose();
    } catch (error) {
      console.error("Mutation failed", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="relative max-w-xl bg-white rounded-lg p-6 animate-scaleIn">
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

        {/* Status */}
        <div className="mb-4 relative" ref={statusRef}>
          <label className="text-sm text-gray-600 block mb-2">
            Select Status
          </label>

          <div
            onClick={() => setStatusOpen(!statusOpen)}
            className="w-full border border-gray-200 px-4 py-1.5 bg-gray-50 flex justify-between items-center cursor-pointer"
          >
            <span>{formData.status || "Select Status"}</span>
            <FiChevronDown
              className={`transition-transform ${
                statusOpen ? "rotate-180" : ""
              }`}
            />
          </div>

          {statusOpen && (
            <div className="absolute w-full bg-white border border-gray-200 z-10">
              {["Open", "Closed"].map((item) => (
                <div
                  key={item}
                  onClick={() => {
                    updateField("status", item);
                    setStatusOpen(false);
                  }}
                  className="px-4 py-1.5 hover:bg-gray-100 cursor-pointer text-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Declaration */}
        <div className="mb-6 relative" ref={declarationRef}>
          <label className="text-sm text-gray-600 block mb-2">
            Select Declaration Type
          </label>

          <div
            onClick={() => setDeclarationOpen(!declarationOpen)}
            className="w-full border border-gray-200 px-4 py-1.5 bg-gray-50 flex justify-between items-center cursor-pointer"
          >
            <span>
              {formData.declaration_type || "Select Declaration"}
            </span>
            <FiChevronDown
              className={`transition-transform ${
                declarationOpen ? "rotate-180" : ""
              }`}
            />
          </div>

          {declarationOpen && (
            <div className="absolute w-full bg-white border border-gray-200 z-10">
              {[
                "Employee Tax Exemption Declaration",
                "Employee Tax Exemption Proof Submission",
              ].map((item) => (
                <div
                  key={item}
                  onClick={() => {
                    updateField("declaration_type", item);
                    setDeclarationOpen(false);
                  }}
                  className="px-4 py-1.5 hover:bg-gray-100 cursor-pointer text-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="bg-gray-50 p-2 border border-gray-100 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <FiCalendar className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-600 uppercase">
              Manage Date
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              value={formData.from_date}
              onChange={(e) =>
                updateField("from_date", e.target.value)
              }
              className="border px-4 py-1 bg-white"
            />
            <input
              type="date"
              value={formData.to_date}
              onChange={(e) =>
                updateField("to_date", e.target.value)
              }
              className="border px-4 py-1"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-1.5 rounded-lg border border-gray-200 text-gray-600"
          >
            Cancel
          </button>

          <Button variant="contain" size="md" onClick={handleSubmit}>
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditITDeclarationAccess;