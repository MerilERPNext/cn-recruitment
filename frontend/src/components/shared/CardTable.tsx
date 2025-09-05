import { ReactNode } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";

const CardTable = ({
  titles,
  children,
}: {
  titles: string[];
  children: ReactNode;
}) => {
  const { isDesktop } = useScreenSize();
  return (
    <div
      className={
        isDesktop
          ? `overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm p:2`
          : ""
      }
    >
      {/* Header */}
      {isDesktop && (
        <div
          className={`grid grid-cols-${titles?.length} gap-4 px-6 h-12 bg-gray-50 border-b border-gray-200`}
        >
          {titles?.map((item) => (
            <span className="text-xs font-semibold text-gray-500 flex items-center justify-center">
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
