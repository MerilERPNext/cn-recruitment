import { useMemo, useState } from "react";
import { RiDeleteBinLine } from "react-icons/ri";
import { Typography } from "../../../shared/atoms/Typography";
import Button from "../../../shared/atoms/Button";
import { useFileUpload } from "../../../../hooks/useEmployee";
import { FiX } from "react-icons/fi";
import { useDeleteDocument } from "../../../../hooks/payroll/UseDeleteDocuemt";
import { formatCurrency } from "../../../../utils/currency";
type Item = {
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
  setLocked80DVariable?: (v: string | null) => void ;
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
  const { mutateAsync: deleteDoc,} = useDeleteDocument();

  /* ---------------- Dropdown Options ---------------- */
  const dropdownOptions = useMemo(() => {
    const normalized = items.map((item) => ({
      ...item,
      is_effectively_selected:
        item.is_selected === true || Number(item.amount ?? 0) > 0,
    }));
  
    const hasAnySelected = normalized.some(i => i.is_effectively_selected);
  
    return normalized.map(item => ({
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
  



  const handleProofChange = (
    key: string,
    field: "proof_file" | "proof_comment",
    value: File | string | null,
  ) => {
    const updated = items.map((item) =>
      item.exemption_sub_category === key ? { ...item, [field]: value } : item,
    );

    onChange(updated);
  };

  const handleProofFileUpload = (key: string, file: File | null) => {
    if (!file) return;

    uploadMutation.mutate(file, {
      onSuccess(data) {
        const updated = items.map((item) =>
          item.exemption_sub_category === key
            ? { ...item, proof_file: data?.file_url }
            : item,
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
    proofFile?: string | File,
  ) => {
    console.log("proofFile:", typeof proofFile);

    if (!proofFile || typeof proofFile !== "string") {
      console.warn("No backend file to delete");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this proof file?",
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
          : item,
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
        : item,
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
      Number(item?.amount ?? 0) > 0,
  );

console.log(isDisabled, "isDisabled", locked80DVariable,"locked80", custom_80d_variable);
  return (
    <div className="bg-white px-6 py-4 rounded border space-y-4">
      <Typography variant="bodySmall" color="body2" className="semibold">
        {categoryName} | Max Amount:{" "}
        <span className="text-primary text-xs font-semibold">
          {formatCurrency(max_amount)}
        </span>
      </Typography>

      <div className="space-y-3">
        {selectedItems.map((item) => (
          <div
            key={item.exemption_sub_category}
            className="flex justify-between items-center border-b pb-2"
          >
            <div>
              <Typography
                variant="bodySmall"
                color="body1"
                className="text-xs font-medium"
              >
                {item.exemption_sub_category}
              </Typography>
              {item.description && (
                <p className="text-[11px] text-gray-500">{item.description}</p>
              )}
            </div>

            {showProofFields && (item.attach_reqd === 1 || item?.approval_needed === "yes") && (
              <div className="flex gap-2 pb-1 bg-white">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Attachment</label>

                  <input
                    type="file"
                    onChange={(e) =>
                      handleProofFileUpload(
                        item.exemption_sub_category,
                        e.target.files?.[0] || null,
                      )
                    }
                    className="border rounded pr-3 text-xs
                      file:text-xs file:border-0
                      file:bg-primary file:text-white
                      file:px-3 file:py-1"
                  />

                  {item?.attach_proof && (
                    <div className="flex items-center justify-between gap-2 px-3 py-1 border rounded bg-gray-50 max-w-xs">
                      <span className="text-sm text-gray-700 truncate">
                        {typeof item.attach_proof === "string"
                          ? item.attach_proof
                          : item.attach_link}
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

                {  item.idx === "we" &&          <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">
                    Note / Comment
                  </label>
                  <textarea
                    rows={1}
                    onChange={(e) =>
                      handleProofChange(
                        item.exemption_sub_category,
                        "proof_comment",
                        e.target.value
                      )
                    }
                    placeholder="Enter your comment..."
                    className="border rounded px-3 py-1 text-xs resize-none"
                  />
                </div>}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-semibold">
                  Max {formatCurrency(item.max_amount)}
                </p>
                <input
                  type="number"
                  placeholder="Amount"
                  disabled={item.editable === 0 || lockingDate === "failed"}
                  value={item.amount === 0 ? "" : (item.amount ?? "")}
                  onChange={(e) => {
                    const raw = e.target.value;

                    if (raw === "") {
                      handleAmountChange(item.exemption_sub_category, 0);
                      return;
                    }

                    handleAmountChange(
                      item.exemption_sub_category,
                      Number(raw),
                    );
                  }}
                  className="border rounded px-2 py-1 text-xs w-32"
                />
              </div>

              <div className="pt-3">
                {item.editable !== 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveItem(item.exemption_sub_category)
                    }
                    className="text-red-500 p-2 rounded bg-error-50 text-xs hover:underline"
                  >
                    <RiDeleteBinLine size={14} />
                  </button>
                )}
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
          className="w-full flex justify-between items-center border border-gray-200 rounded px-3 py-1 text-xs bg-white"
        >
          <span className="text-gray-400">Select Items</span>
          <span className="text-gray-400">▼</span>
        </Button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-48 overflow-auto">
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
