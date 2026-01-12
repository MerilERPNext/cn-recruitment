
import { useMemo, useState } from "react";
import { RiDeleteBinLine } from "react-icons/ri";
import { Typography } from "../../../shared/atoms/Typography";

type Item = {
  exemption_sub_category: string;
  description: string | null;
  max_amount: number;
  editable: number;
  amount?: number;
  proof_file?: File | null;
  proof_comment?: string;
};

type Props = {
  categoryName: string;
  items: Item[];
  onChange: (updatedItems: Item[]) => void;
  showProofFields?: boolean;
  selectable?: string;
};

const CategoryDeclarationSelectable = ({
  categoryName,
  items,
  onChange,
  showProofFields,
  selectable

}: Props) => {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedItemKey, setSelectedItemKey] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const isMultipleSelect = selectable === "Select Multiple";

  console.log("Selected Keys:", isMultipleSelect);



  /* ---------------- Dropdown Options ---------------- */
  const dropdownOptions = useMemo(() => {
    return items.map((item) => ({
      label: item.exemption_sub_category,
      value: item.exemption_sub_category,
      disabled: selectedKeys.includes(item.exemption_sub_category),
    }));
  }, [items, selectedKeys]);

  const handleProofChange = (
    key: string,
    field: "proof_file" | "proof_comment",
    value: File | string | null
  ) => {
    const updated = items.map((item) =>
      item.exemption_sub_category === key
        ? { ...item, [field]: value }
        : item
    );
  
    onChange(updated);
  };
  

  /* ---------------- Select Item ---------------- */
  const handleSelectItem = (value: string) => {
    if (!value) return;

    setSelectedKeys((prev) => [...prev, value]);
    setSelectedItemKey("");
  };

  /* ---------------- Amount Change ---------------- */
  const handleAmountChange = (key: string, value: number) => {
    const updated = items.map((item) =>
      item.exemption_sub_category === key
        ? {
            ...item,
            amount: Math.min(value, item.max_amount),
          }
        : item
    );

    onChange(updated);
  };

  /* ---------------- Remove Selected Item ---------------- */
  const handleRemoveItem = (key: string) => {
    setSelectedKeys((prev) => prev.filter((k) => k !== key));

    const updated = items.map((item) =>
      item.exemption_sub_category === key
        ? { ...item, amount: undefined }
        : item
    );

    onChange(updated);
  };

  /* ---------------- Selected Items ---------------- */
  const selectedItems = items.filter((item) =>
    selectedKeys.includes(item.exemption_sub_category)
  );

  return (
    <div className="bg-white px-6 py-4 rounded border space-y-4">
      <Typography variant="bodySmall" className="semibold">{categoryName}</Typography>

           {/* Selected Rows */}
           <div className="space-y-3">
          {selectedItems.map((item) => (
          <div
            key={item.exemption_sub_category}
            className="flex justify-between items-center border-b pb-2"
          >
            {/* Left */}
            <div>
              <p className="text-xs font-medium">
                {item.exemption_sub_category}
              </p>
              {item.description && (
                <p className="text-[11px] text-gray-500">
                  {item.description}
                </p>
              )}
            </div>
 
            {showProofFields && (
  <div className="flex gap-2  bg-white">
    {/* Attachment */}
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-600">Attachment</label>
      <input
        type="file"
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

    {/* Comment */}
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-600">Note / Comment</label>
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



            {/* Right */}
            <div className="flex items-center gap-3">
              <div className="text-right">
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
                <p className="text-[10px] font-semibold">
                  Max ₹{item.max_amount}
                </p>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() =>
                  handleRemoveItem(item.exemption_sub_category)
                }
                className="text-red-500 text-xs hover:underline"
              >
             <RiDeleteBinLine size={14} />
              </button>
            </div>
          </div>
        ))}

        {selectedItems.length === 0 && (
          <p className="text-xs text-gray-400">
            No items selected
          </p>
        )}
      </div>

      {/* Dropdown */}
     {/* Custom Select */}
<div className="relative w-64">
  <button
    type="button"
    onClick={() => setIsOpen((prev) => !prev)}
    className="w-full flex justify-between items-center border rounded px-3 py-1 text-xs bg-white"
  >
    <span className={selectedItemKey ? "text-gray-900" : "text-gray-400"}>
      {selectedItemKey || "Select Item"}
    </span>
    <span className="text-gray-400">▼</span>
  </button>

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
