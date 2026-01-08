import { ReactNode } from "react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { Typography } from "./atoms/Typography";

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
          ? `overflow-x-auto rounded-lg bg-white shadow-sm`
          : ""
      }
    >
      {/* Header */}
      {isDesktop && (
        <div
          className="grid gap-4 px-6 py-4 bg-gray-50"
          style={{ gridTemplateColumns }}
        >
          {titles?.map((item, i) => (
            <Typography
              key={i}
              variant="bodySmall"
              className="font-medium flex items-center justify-start"
            >
              {item}
            </Typography>
          ))}
        </div>
      )}
      {children}
    </div>
  );
};

export default CardTable;
