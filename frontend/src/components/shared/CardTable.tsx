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
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      {/* Desktop horizontal scroll only */}
      <div
        className={
          isDesktop ? "overflow-x-auto rounded-lg bg-white shadow-sm" : ""
        }
      >
        {/* Width holder ONLY on desktop */}
        <div className={isDesktop ? "min-w-max" : ""}>
          {/* Header only on desktop */}
          {isDesktop && (
            <div
              className="grid gap-4 px-6 py-4 bg-gray-50 border-b"
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

          {/* Scroll body */}
          <div className="overflow-y-auto max-h-[75vh]">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default CardTable;
