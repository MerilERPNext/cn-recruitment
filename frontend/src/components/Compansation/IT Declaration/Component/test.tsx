type Item = {
  exemption_sub_category: string;
  description: string | null;
  max_amount: number;
  editable: number;
  amount?: number;
};

type Props = {
  categoryName: string;
  items: Item[];
  onAmountChange: (
    categoryName: string,
    itemIndex: number,
    value: number
  ) => void;
};

const CategoryDeclaration = ({
  categoryName,
  items,
  onAmountChange,
}: Props) => {
  return (
    <div className="bg-white p-6 shadow rounded-lg">
      <h2 className="text-sm font-semibold mb-4">{categoryName}</h2>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const isEditable = item.editable === 1;

          return (
            <div
              key={idx}
              className="flex justify-between border-b pb-2"
            >
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

              <div className="text-right">
                <input
                  type="number"
                  disabled={!isEditable}
                  value={item.amount ?? ""}
                  onChange={(e) =>
                    onAmountChange(
                      categoryName,
                      idx,
                      Number(e.target.value)
                    )
                  }
                  className={`border rounded px-2 py-1 text-xs w-32 ${
                    isEditable
                      ? "bg-white"
                      : "bg-gray-100 cursor-not-allowed"
                  }`}
                />

                {item.max_amount > 0 && (
                  <p className="text-[10px] font-semibold">
                    Max ₹{item.max_amount}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryDeclaration;
