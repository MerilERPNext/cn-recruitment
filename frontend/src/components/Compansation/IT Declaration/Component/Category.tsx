import { useMemo, useState } from "react";
import { RiDeleteBinLine } from "react-icons/ri";
import { Typography } from "../../../shared/atoms/Typography";
import Button from "../../../shared/atoms/Button";

type Item = {
  attach_proof: string;
  attach_reqd: number;
  exemption_sub_category: string;
  description: string | null;
  max_amount: number;
  editable: number;
  amount?: number;
  proof_file?: File | null;
  proof_comment?: string;
  is_selected?: boolean;
};

type Props = {
  categoryName: string;
  max_amount: number;
  items: Item[];
  onChange: (updatedItems: Item[]) => void;
  showProofFields?: boolean;
  selectable?: string;
};

const CategoryDeclarationSelectable = ({
  categoryName,
  max_amount,
  items,
  onChange,
  showProofFields,
  selectable,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMultipleSelect = selectable === "Select Multiple";

  /* ---------------- Dropdown Options ---------------- */
  const dropdownOptions = useMemo(() => {
    return items.map((item) => ({
      label: item.exemption_sub_category,
      value: item.exemption_sub_category,
      disabled:
        (!isMultipleSelect && items.some((i) => i.is_selected)) ||
        (isMultipleSelect && item.is_selected),
    }));
  }, [isMultipleSelect, items]);

  const handleProofChange = (
    key: string,
    field: "proof_file" | "proof_comment",
    value: File | string | null
  ) => {
    const updated = items.map((item) =>
      item.exemption_sub_category === key ? { ...item, [field]: value } : item
    );

    onChange(updated);
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

    onChange(updated);
  };

  /* ---------------- Amount Change ---------------- */
  const handleAmountChange = (key: string, value: number) => {
    const updated = items.map((item) => {
      if (item.exemption_sub_category !== key) return item;
      if (item.editable === 0) {
        return item;
      }

      return {
        ...item,
        amount: Math.min(value, item.max_amount),
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

    onChange(updated);
  };

  /* ---------------- Selected Items ---------------- */
  const selectedItems = items.filter(
    (item) => item.is_selected === true || item.editable === 0
  );

  return (
    <div className="bg-white px-6 py-4 rounded border space-y-4">
      <Typography variant="bodySmall" color="body2" className="semibold">
        {categoryName} | Max Amount:{" "}
        <span className="text-primary text-xs font-semibold">
          {" "}
          ₹{max_amount || selectable}
        </span>{" "}
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

            {showProofFields && item.attach_reqd === 1 && (
              <div className="flex gap-2 pb-1 bg-white">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600">Attachment</label>
                  <input
                    type="file"
                    value={item.attach_proof}
                    onChange={(e) =>
                      handleProofChange(
                        item.exemption_sub_category,
                        "proof_file",
                        e.target.files?.[0] || null
                      )
                    }
                    className="border rounded pr-3 text-xs file:text-xs file:border-0 file:bg-primary file:text-white file:px-3 file:py-1"
                  />
                </div>
                <div className="flex flex-col gap-1">
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
                </div>
              </div>
            )}

            <div className="flex items-center  gap-3">
              <div className="text-right">
                <p className="text-[10px] font-semibold">
                  Max ₹{item.max_amount}
                </p>
                <input
                  type="number"
                  disabled={item.editable === 0}
                  value={item.amount ?? ""}
                  onChange={(e) =>
                    handleAmountChange(
                      item.exemption_sub_category,
                      Number(e.target.value)
                    )
                  }
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
                    className="text-red-500 p-2  rounded bg-error-50 text-xs hover:underline"
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
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100
            ${opt.disabled ? "text-gray-400 cursor-not-allowed" : ""}
          `}
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
