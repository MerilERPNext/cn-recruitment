import { Typography } from "../../../shared/atoms/Typography";
import AppreciationImage from "./AppreciationImage";
import HistoryActions from "./HistoryActions";
import type { AppreciationHistoryItem } from "./types";

const HistoryCardList = ({ items }: { items: AppreciationHistoryItem[] }) => (
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
            <Typography variant="mobileCardSubtitle" className="mt-1 block">
              {item.person} · {item.date}
            </Typography>
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

        <HistoryActions className="mt-4" />
      </article>
    ))}
  </div>
);

export default HistoryCardList;
