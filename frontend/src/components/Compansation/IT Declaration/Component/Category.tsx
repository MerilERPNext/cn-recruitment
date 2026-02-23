import { useMemo, useState } from "react";
import { RiDeleteBinLine } from "react-icons/ri";
import { Typography } from "../../../shared/atoms/Typography";
import Button from "../../../shared/atoms/Button";
import { useFileUpload } from "../../../../hooks/useEmployee";
import { FiX } from "react-icons/fi";
import { useDeleteDocument } from "../../../../hooks/payroll/UseDeleteDocuemt";
import { formatCurrency } from "../../../../utils/currency";
import toast from "react-hot-toast";
type Item = {
  custom_note: import("react/jsx-runtime").JSX.Element;
  custom_proof_status: string;
  attach_link: string | null;
  approval_needed: string;
  idx: string;
  proof_file?: File | string;
  attach_proof: string | null;
  attach_reqd: number;
  exemption_sub_category: string;
  description: string | null;
  max_amount: number;
  editable: number;
  amount?: number | "";
  proof_comment?: string;
  is_selected?: boolean;
  id?: string | number;
};

type Props = {
  categoryName: string;
  max_amount: number;
  lockingDate: string;
  items: Item[];
  onChange: (updatedItems: Item[]) => void;
  showProofFields?: boolean;
  selectable?: string;
  custom_80d_variable?: string | null;
  locked80DVariable?: string | null;
  setLocked80DVariable?: (v: string | null) => void;
};
import { Check, Clock, X } from "lucide-react";


const getProofStatusBadgeClass = (status: string) => {
  switch (status) {
    case "Approved":
      return "bg-success-100 text-success-600";
    case "Rejected":
      return "bg-error-50 text-error-600";
    case "Pending":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-50 text-gray-600";
  }
};

const getProofStatusIcon = (status: string) => {
  switch (status) {
    case "Approved":
      return <Check className="w-3 h-3 md:w-4 md:h-4" />;
    case "Rejected":
      return <X className="w-3 h-3 md:w-4 md:h-4" />;
    case "Pending":
      return <Clock className="w-3 h-3 md:w-4 md:h-4" />;
    default:
      return null;
  }
};

const CategoryDeclarationSelectable = ({
  categoryName,
  max_amount,
  lockingDate,
  items,
  onChange,
  showProofFields,
  selectable,
  custom_80d_variable,
  locked80DVariable,
  setLocked80DVariable,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const uploadMutation = useFileUpload();
  const isMultipleSelect = selectable === "Select Multiple";
  const { mutateAsync: deleteDoc } = useDeleteDocument();
  

  /* ---------------- Dropdown Options ---------------- */
  const dropdownOptions = useMemo(() => {
    const normalized = items.map((item) => ({
      ...item,
      is_effectively_selected:
        item.is_selected === true || Number(item.amount ?? 0) > 0,
    }));

    const hasAnySelected = normalized.some((i) => i.is_effectively_selected);

    return normalized.map((item) => ({
      label: item.exemption_sub_category,
      value: item.exemption_sub_category,

      disabled: isMultipleSelect
        ? item.is_effectively_selected
        : hasAnySelected,
    }));
  }, [items, isMultipleSelect]);

  const normalizedLocked = locked80DVariable || null;
  const normalizedCustom = custom_80d_variable || null;

  const isDisabled =
    Boolean(normalizedLocked) &&
    Boolean(normalizedCustom) &&
    normalizedLocked !== normalizedCustom;


  const handleProofFileUpload = (key: string, file: File | null) => {
    if (!file) return;

    uploadMutation.mutate(file, {
      onSuccess(data) {
        const updated = items.map((item) =>
          item.exemption_sub_category === key
            ? { ...item, proof_file: data?.file_url }
            : item
        );

        onChange(updated);
      },
      onError(err) {
        console.error("Proof upload failed", err);
      },
    });
  };

  const handleRemoveProof = async (
    id: string | number | undefined,
    proofFile?: string | File
  ) => {
    console.log("proofFile:", typeof proofFile);

    if (!proofFile || typeof proofFile !== "string") {
      console.warn("No backend file to delete");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this proof file?"
    );
    if (!confirmDelete) return;

    try {
      const parts = proofFile.split("/");
      let fileName = parts[parts.length - 1];
      fileName = decodeURIComponent(fileName);

      console.log("Deleting file:", fileName);

      await deleteDoc({
        doctype: "File",
        name: fileName,
      });

      const updated = items.map((item) =>
        item.id === id
          ? { ...item, proof_file: undefined, proof_comment: "" }
          : item
      );

      onChange(updated);
      alert("Proof deleted successfully ✅");
    } catch (err) {
      console.error("❌ Delete failed:", err);
      alert("Failed to delete proof. Please try again.");
    }
  };

  /* ---------------- Select Item ---------------- */
  const handleSelectItem = (value: string) => {
    if (!value) return;
    const updated = items.map((item) => {
      if (item.exemption_sub_category === value) {
        return {
          ...item,
          is_selected: true,
          amount: item.amount ?? 0,
        };
      }

      if (!isMultipleSelect) {
        return {
          ...item,
          is_selected: false,
          amount: undefined,
        };
      }

      return item;
    });

    if (custom_80d_variable) {
      setLocked80DVariable?.(custom_80d_variable);
    }
    onChange(updated);
  };

  /* ---------------- Amount Change ---------------- */
  const handleAmountChange = (key: string, value: number) => {
    const updated: Item[] = items.map((item) => {
      if (item.exemption_sub_category !== key) return item;
      if (item.editable === 0) return item;

      return {
        ...item,
        amount: Math.min(value),
      };
    });

    onChange(updated);
  };

  /* ---------------- Remove Selected Item ---------------- */
  const handleRemoveItem = (key: string) => {
    const updated = items.map((item) =>
      item.exemption_sub_category === key
        ? {
          ...item,
          is_selected: false,
          amount: undefined,
        }
        : item
    );
    const stillSelected = updated.some(
      (i) => i.is_selected || Number(i.amount) > 0
    );

    if (!stillSelected && custom_80d_variable) {
      setLocked80DVariable?.(null);
    }
    onChange(updated);
  };

  /* ---------------- Selected Items ---------------- */
  const selectedItems = items.filter(
    (item) =>
      item?.is_selected === true ||
      item?.editable === 0 ||
      Number(item?.amount ?? 0) > 0
  );

  console.log(
    isDisabled,
    "isDisabled",
    locked80DVariable,
    "locked80",
    custom_80d_variable
  );
  return (
    <div className="bg-white px-3 md:px-6 py-4 rounded-lg border border-gray-200 space-y-4">
      <div className="border-b pb-2">
        <Typography
          variant="bodySmall"
          color="body2"
          className="text-xs font-bold"
        >
          {categoryName} | Max Amount:{" "}
          <span className="text-primary text-xs font-bold">
            {formatCurrency(max_amount)}
          </span>
        </Typography>
      </div>

      <div className="space-y-3 ">
        {selectedItems.map((item) => (
          <div
            key={item.exemption_sub_category}
            className="flex flex-col sm:flex-row sm:justify-between sm:items-center rounded-lg border border-gray-200 p-3 md:p-4 gap-3"
          >
            <div className="flex flex-col gap-1 w-full sm:max-w-xs">
              <div>
                <Typography
                  variant="bodySmall"
                  color="body1"
                  className="text-xs font-medium"
                >
                  {item.exemption_sub_category}
                </Typography>
                {item.description && (
                  <p className="text-[11px] text-gray-500">
                    {item.description}
                  </p>
                )}
              </div>

              {showProofFields &&
                (item.attach_reqd === 1 || item?.approval_needed === "yes") && (
                  <div className="flex gap-2 pb-1 bg-white">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-700 font-medium">
                        Attachment
                      </label>

                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;

                          if (file && file.type !== "application/pdf") {
                            toast.error("Please upload only PDF file");
                            e.target.value = ""; // reset input
                            return;
                          }

                          handleProofFileUpload(
                            item.exemption_sub_category,
                            file
                          );
                        }}
                        className="border border-gray-300 rounded-lg pr-3 text-xs transition-all
                          file:text-xs file:border-0
                          file:bg-primary file:text-white
                          file:px-3 file:py-1.5 file:rounded-l-lg"
                      />

                      {(item?.proof_file ?? item?.attach_reqd === 1) && (
                        <div className="flex items-center justify-between gap-2 px-3 py-1 border rounded bg-gray-50 max-w-xs">
                          <span className="text-sm text-gray-700 truncate">
                            {typeof item?.proof_file === "string"
                              ? item.proof_file
                              : item?.proof_file?.name ||
                              item?.attach_proof ||
                              item?.attach_link ||
                              "-"}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleRemoveProof(item.id)}
                            className="text-gray-500 hover:text-red-600 transition disabled:opacity-50"
                            title="Remove file"
                          >
                            <FiX size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    {item?.custom_note && (
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-700 font-medium">
                          Note / Comment
                        </label>
                        <textarea
                          rows={1}
                          value={item.custom_note as unknown as string}
                          placeholder="Enter your comment..."
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                        />
                      </div>
                    )}
                  </div>
                )}
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">

              {item?.custom_proof_status && (
                <span
  className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold ${getProofStatusBadgeClass(
    item.custom_proof_status
  )}`}
>
  {getProofStatusIcon(item.custom_proof_status)}
  {item.custom_proof_status}
</span>
              )}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="text-left sm:text-right flex-1 sm:flex-none">
                  <p className="text-[10px] font-semibold text-gray-500">
                    Max {formatCurrency(item.max_amount)}
                  </p>
                  <input
                    type="number"
                    placeholder="Amount"
                    disabled={item.editable === 0 || lockingDate === "failed"}
                    value={item.amount === 0 ? "" : item.amount ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;

                      if (raw === "") {
                        handleAmountChange(item.exemption_sub_category, 0);
                        return;
                      }

                      handleAmountChange(
                        item.exemption_sub_category,
                        Number(raw)
                      );
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs w-full sm:w-32 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                  />
                </div>

                <div className="pt-3">
                  {item.editable !== 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveItem(item.exemption_sub_category)
                      }
                      className="text-error/80 p-2 rounded bg-error-50 text-xs hover:underline"
                    >
                      <RiDeleteBinLine size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {selectedItems.length === 0 && (
          <p className="text-xs text-gray-400">No items selected</p>
        )}
      </div>

      <div className="relative w-64">
        <Button
          variant="soft"
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={isDisabled}
          className="w-full flex justify-between items-center border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
        >
          <span className="text-gray-400">Select Items</span>
          <span className="text-gray-400">▼</span>
        </Button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
            {dropdownOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                onClick={() => {
                  if (opt.disabled) return;
                  handleSelectItem(opt.value);
                  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                  -setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100
                  ${opt.disabled ? "text-gray-400 cursor-not-allowed" : ""}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryDeclarationSelectable;
