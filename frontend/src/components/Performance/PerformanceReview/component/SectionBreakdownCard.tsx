import Badge from "../../../shared/Badge";
import { Typography } from "../../../shared/atoms/Typography";
import type { BreakdownItem } from "./types";

type SectionBreakdownCardProps = {
  items: BreakdownItem[];
};

const RatingBadge = ({ label, size = "sm" }: { label: string; size?: "sm" | "md" }) => (
  <Badge
    label={label}
    variant="success"
    size={size}
    pulse={{ show: false }}
    icon={<div className="h-1.5 w-1.5 rounded-md bg-green-500" />}
  />
);

const SectionBreakdownCard = ({ items }: SectionBreakdownCardProps) => {
  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <Typography
          variant="h2"
          className="mb-1 text-xl font-bold text-gray-900"
        >
          Section Breakdown
        </Typography>
        <Typography
          variant="bodyMedium"
          className="text-sm leading-relaxed text-gray-500"
        >
          Weighted average across 3 sections · 5-Point Descriptive
        </Typography>
      </div>

      <div className="flex flex-col gap-6 sm:gap-8">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex min-w-0 flex-1 flex-col md:pr-8">
              <Typography
                variant="body"
                className="mb-1 font-bold leading-snug text-gray-900"
              >
                {item.title}{" "}
                <span className="font-normal text-gray-400">- {item.weight}</span>
              </Typography>
              <Typography
                variant="bodyMedium"
                className="text-sm italic leading-relaxed text-gray-500"
              >
                {item.note}
              </Typography>
            </div>

            <div className="flex w-full min-w-0 items-center justify-between gap-3 md:w-[260px] md:shrink-0 md:gap-6">
              <div className="flex w-full min-w-[96px] max-w-[120px] flex-col">
                <Typography variant="caption" className="mb-1 text-gray-500">
                  {item.progress}
                </Typography>
                <div className="h-1.5 w-full overflow-hidden rounded-md bg-gray-100">
                  <div
                    className="h-full rounded-md bg-blue-500"
                    style={{ width: item.progress }}
                  />
                </div>
              </div>
              <div className="shrink-0">
                <RatingBadge label={item.rating} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <hr className="my-6 border-t-[1.5px] border-gray-900 sm:my-8" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Typography variant="h3" className="text-xl font-bold text-gray-900">
          Weighted Final
        </Typography>
        <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-start sm:gap-6">
          <Typography variant="h2" className="text-2xl font-bold text-gray-900">
            4.2
          </Typography>
          <RatingBadge label="Exceeds · 4/5" size="md" />
        </div>
      </div>
    </div>
  );
};

export default SectionBreakdownCard;

