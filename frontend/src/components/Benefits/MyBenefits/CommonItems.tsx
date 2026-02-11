import { useScreenSize } from "../../../hooks/useScreenSize";
import MobileDataCard from "./MobileDataCard";
import { COLUMN_LAYOUT } from "./MyBenefits";
import { SalaryComponentDetail } from "../../../hooks/useBenefit";
import { Typography } from "../../shared/atoms/Typography";
import { RupeeSymbolPerfix } from "../../../utils/currency";

// Desktop / row item
export const AccrualItem = ({ item }: { item: SalaryComponentDetail }) => {
  const { isDesktop } = useScreenSize();

  if (!isDesktop) {
    return <MobileDataCard data={item} />;
  }

  return (
    <div
      className="grid gap-4 px-6 py-4 border-b border-gray-100 items-start  transition-colors text-sm hover:bg-primary/10"
      style={{ gridTemplateColumns: COLUMN_LAYOUT }}
    >
      {/* Period / Month */}
      <Typography variant="bodySmall" className="font-medium text-center">
        {item.month}
      </Typography>

      {/* Working Days */}
      <Typography variant="bodySmall" className="font-medium text-center">
        {item.working_days}{" "}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {item.payment_days}{" "}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {item.arrear_days}{" "}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {item.lop_days}{" "}
      </Typography>

      {/* Periodic Original Amount */}
      <Typography variant="bodySmall" className="font-medium text-center">
        {RupeeSymbolPerfix(
          (item.periodic_original_amount ?? 0).toLocaleString(),
        )}
      </Typography>

      {/* Periodic Accrued */}
      <Typography variant="bodySmall" className="font-medium text-center">
        {RupeeSymbolPerfix(item.amount ?? 0).toLocaleString()}
      </Typography>

      {/* Claimed Amount */}
      <Typography variant="bodySmall" className="font-medium text-center">
        {RupeeSymbolPerfix(item.claimed_amount ?? 0).toLocaleString()}
      </Typography>

      <Typography variant="bodySmall" className="font-medium text-center">
        {RupeeSymbolPerfix(item.paid_amount ?? 0).toLocaleString()}
      </Typography>

      {/* Closing Balance */}
      <Typography variant="bodySmall" className="font-medium text-center">
        {RupeeSymbolPerfix(item.closing_balance ?? 0).toLocaleString()}
      </Typography>
    </div>
  );
};

export const StatItem = ({
  label,
  value,
  isNumber = false,
  subLabel,
  highlighted = false,
}: {
  label: string;
  value: number;
  isNumber?: boolean;
  subLabel?: string;
  highlighted?: boolean;
}) => (
  <div
    className={`flex flex-col gap-1 p-3 rounded-lg transition-colors ${
      highlighted
        ? "bg-blue-50/50 border border-blue-100"
        : "group-hover:bg-white bg-transparent"
    }`}
  >
    <span className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">
      {label}
    </span>

    <div className="flex flex-col">
      <span
        className={`text-xl font-bold ${
          highlighted ? "text-blue-700" : "text-slate-800"
        }`}
      >
        {subLabel == "Amount" && RupeeSymbolPerfix("")}
        {isNumber ? value : value.toLocaleString()}
      </span>

      {subLabel && (
        <span className="text-[10px] text-gray-500">{subLabel}</span>
      )}
    </div>
  </div>
);
