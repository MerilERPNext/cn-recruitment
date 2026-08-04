import { Typography } from "../../../shared/atoms/Typography";
import AppreciationImage from "./AppreciationImage";
import HistoryActions from "./HistoryActions";
import PersonAvatar from "./PersonAvatar";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";
import type { AppreciationHistoryItem } from "./types";

type HistoryCardListProps = {
  items: AppreciationHistoryItem[];
  relationLabel: string;
};

const HistoryCardList = ({ items, relationLabel }: HistoryCardListProps) => (
  <div className="grid gap-3">
    {items.map((item) => (
      <article
        key={item.id}
        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <AppreciationImage imageUrl={item.imageUrl} title={item.title} />
          <div className="min-w-0 flex-1">
            <Typography variant="mobileCardTitle" className="break-words">
              {item.title}
            </Typography>
            <Typography variant="mobileCardLabel" className="mt-1 block">
              {relationLabel}
            </Typography>
            <div className="mt-0.5 flex items-center gap-2">
              <PersonAvatar name={item.person} imageUrl={item.personImage} size={22} />
              <WrapperHoverCard employeeId={item.personId}>
                <Typography variant="mobileCardSubtitle" className="truncate cursor-pointer">
                  {item.person} · {item.date}
                </Typography>
              </WrapperHoverCard>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2">
          <Typography variant="mobileCardLabel" className="block">
            Value
          </Typography>
          <Typography
            variant="bodySmall"
            className="mt-1 block font-semibold text-gray-700"
          >
            {item.value}
          </Typography>
        </div>

        <HistoryActions item={item} className="mt-4" />
      </article>
    ))}
  </div>
);

export default HistoryCardList;
