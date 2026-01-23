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
    /* OUTER scroll container */
    <div
      className={
        isDesktop ? "overflow-x-auto rounded-lg bg-white shadow-sm" : ""
      }
    >
      {/* INNER width holder */}
      <div className="min-w-auto">
        {/* Header */}
        {isDesktop && (
          <div
            className="grid gap-4 px-6 py-4 bg-gray-50/80"
            style={{ gridTemplateColumns }}
          >
            {titles.map((item, i) => (
              <Typography key={i} variant="bodySmall" className="font-medium">
                {item}
              </Typography>
            ))}
          </div>
        )}

        {/* Rows */}
        {children}
      </div>
    </div>
  );
};

export default CardTable;
