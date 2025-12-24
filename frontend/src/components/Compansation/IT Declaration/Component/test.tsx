type Item = {
    name: string;
    max_amount: number;
    custom_description: string | null;
  };
  
  type Props = {
    categoryName: string;
    items: Item[];
  };
  
  const CategoryDeclaration = ({ categoryName, items }: Props) => {
    return (
      <div>
        <h2 className="text-sm font-semibold mb-4">
          {categoryName}
        </h2>
  
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between border-b pb-2"
            >
              <div className="flex flex-col">
                <span className="text-xs font-medium">
                  {item.name}
                </span>
                {item.custom_description && (
                  <span className="text-[11px] text-gray-500">
                    {item.custom_description}
                  </span>
                )}
              </div>
  
              <div className="flex flex-col items-end">
                <input
                  type="number"
                  className="border rounded px-2 py-1 text-xs w-32"
                  placeholder="Amount"
                  max={item.max_amount || undefined}
                />
                {item.max_amount > 0 && (
                  <span className="text-[10px] text-gray-600 font-semibold">
                    Max ₹{item.max_amount}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  export default CategoryDeclaration;
  