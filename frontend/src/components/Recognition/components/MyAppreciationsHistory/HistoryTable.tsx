import CardTable from "../../../shared/CardTable";
import { Typography } from "../../../shared/atoms/Typography";
import AppreciationImage from "./AppreciationImage";
import HistoryActions from "./HistoryActions";
import PersonAvatar from "./PersonAvatar";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";
import { TABLE_TITLES, TABLE_WIDTHS } from "./constants";
import type { AppreciationHistoryItem } from "./types";

type HistoryTableProps = {
  items: AppreciationHistoryItem[];
  relationLabel: string;
};

const HistoryTable = ({ items, relationLabel }: HistoryTableProps) => (
  <div className="overflow-hidden rounded-lg border border-gray-100">
    <CardTable
      titles={TABLE_TITLES.map((title) =>
        title === "Received From" ? relationLabel : title,
      )}
      columnWidths={TABLE_WIDTHS}
      noBorder
      noShadow
      noRound
    >
      <div className="min-w-[900px]">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid min-h-[86px] items-center gap-4 border-b border-gray-100 px-6 py-4 transition-colors hover:bg-gray-50/70"
            style={{ gridTemplateColumns: TABLE_WIDTHS.join(" ") }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <AppreciationImage imageUrl={item.imageUrl} title={item.title} />
              <Typography
                variant="bodySmall"
                className="truncate font-bold text-gray-700"
              >
                {item.title}
              </Typography>
            </div>

            <div className="flex min-w-0 justify-center">
              <span className="inline-flex max-w-full rounded-md bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                <span className="truncate">{item.value}</span>
              </span>
            </div>

            <div className="flex min-w-0 items-center justify-center gap-2">
              <PersonAvatar name={item.person} imageUrl={item.personImage} />
<<<<<<< HEAD
              <WrapperHoverCard employeeId={item.personId}>
=======
              <WrapperHoverCard employeeId={item.employeeId}>
>>>>>>> dev-microapps
                <Typography
                  variant="bodySmall"
                  className="truncate font-bold text-blue-600 cursor-pointer"
                >
                  {item.person}
                </Typography>
              </WrapperHoverCard>
            </div>
            <Typography
              variant="bodySmall"
              className="text-center font-semibold text-gray-700"
            >
              {item.date}
            </Typography>
            <HistoryActions item={item} className="mx-auto" />
          </div>
        ))}
      </div>
    </CardTable>
  </div>
);

export default HistoryTable;
