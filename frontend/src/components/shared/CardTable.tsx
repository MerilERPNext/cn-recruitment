import { ReactNode } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { Typography } from "./atoms/Typography";

const CardTable = ({
  titles,
  columnWidths,
  children,
}: {
  titles: string[];
  columnWidths?: string[];
  children: ReactNode;
}) => {
  const { isDesktop } = useScreenSize();

  const gridTemplateColumns = columnWidths?.length
    ? columnWidths.join(" ")
    : `repeat(${titles.length}, 1fr)`;

  return (
    <div className="bg-white rounded-lg shadow-sm md:border border-gray-100 flex flex-col max-h-full">
      {/* Desktop horizontal scroll container */}
      <div
        className={
          isDesktop
            ? "overflow-x-auto rounded-lg bg-white shadow-sm flex flex-col h-full"
            : "flex flex-col h-full"
        }
      >
        {/* Width holder ONLY on desktop */}
        <div className={`${isDesktop ? "min-w-max" : ""} flex flex-col h-full`}>
          {/* Fixed Header - only on desktop */}
          {isDesktop && (
            <div
              className="grid gap-4 px-6 py-4 bg-gray-50 border-b flex-shrink-0 sticky top-0 z-10"
              style={{ gridTemplateColumns }}
            >
              {titles.map((title, index) => (
                <Typography
                  key={index}
                  variant="bodySmall"
                  className="font-bold text-center whitespace-nowrap"
                >
                  {title}
                </Typography>
              ))}
            </div>
          )}

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default CardTable;
