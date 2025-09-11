import { ReactNode } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";

const CardTable = ({
  titles,
  columnWidths,
  children,
}: {
  titles: string[];
  columnWidths?: string[]; // optional
  children: ReactNode;
}) => {
  const { isDesktop } = useScreenSize();

  // fallback: all columns equally sized
  const gridTemplateColumns = columnWidths?.length
    ? columnWidths.join(" ")
    : `repeat(${titles.length}, 1fr)`;

  return (
    <div
      className={
        isDesktop
          ? `overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm`
          : ""
      }
    >
      {/* Header */}
      {isDesktop && (
        <div
          className="grid gap-4 px-6 h-12 bg-gray-50 border-b border-gray-200"
          style={{ gridTemplateColumns }}
        >
          {titles?.map((item, i) => (
            <span
              key={i}
              className="text-xs font-semibold text-gray-500 flex items-center justify-start"
            >
              {item}
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  );
};

export default CardTable;
