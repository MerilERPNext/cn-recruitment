import { Calendar } from "lucide-react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import MobileDataCard from "./MobileDataCard";
import { COLUMN_LAYOUT } from "./MyBenefits";
import { SalaryComponentDetail } from "../../../hooks/useBenefit";

// Desktop / row item
export const AccrualItem = ({ item }: { item: SalaryComponentDetail }) => {
    const { isDesktop } = useScreenSize();

    if (!isDesktop) {
        return <MobileDataCard data={item} />;
    }

    return (
        <div
            className="grid gap-4 px-6 py-4 border-b border-gray-100 items-start hover:bg-blue-50/30 transition-colors text-sm"
            style={{ gridTemplateColumns: COLUMN_LAYOUT }}
        >
            {/* Period / Month */}
            <div className="font-medium text-slate-800 items-center flex gap-2">
                <Calendar className="h-3 w-3 text-slate-400" />
                {item.month}
            </div>

            {/* Working Days */}
            <div className="text-gray-600">
                {item.working_days ?? item.working_days ?? 0}
            </div>

            <div className="text-gray-600">
                {item.working_days ?? item.payment_days ?? 0}
            </div>

            {/* Periodic Original Amount */}
            <div className=" text-slate-600">
                ₹{(item.periodic_original_amount ?? 0).toLocaleString()}
            </div>

            {/* Periodic Accrued */}
            <div className=" text-slate-600">
                ₹{(item.amount ?? 0).toLocaleString()}
            </div>


            {/* Claimed Amount */}
            <div className="f">
                <span className="text-orange-600 font-medium">
                    ₹{(item.claimed_amount ?? 0).toLocaleString()}
                </span>
            </div>

            <div className="">
                <span className="text-slate-600 font-medium">
                    ₹{(item.paid_amount ?? 0).toLocaleString()}
                </span>
            </div>

            {/* Closing Balance */}
            <div className="font-bold text-slate-800 ">
                ₹{(item.closing_balance ?? 0).toLocaleString()}
            </div>
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
        className={`flex flex-col gap-1 p-3 rounded-lg transition-colors ${highlighted
            ? "bg-blue-50/50 border border-blue-100"
            : "group-hover:bg-white bg-transparent"
            }`}
    >
        <span className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">
            {label}
        </span>

        <div className="flex flex-col">
            <span
                className={`text-xl font-bold ${highlighted ? "text-blue-700" : "text-slate-800"
                    }`}
            >
                {subLabel == "Amount" && "₹"}{isNumber ? value : value.toLocaleString()}
            </span>

            {subLabel && (
                <span className="text-[10px] text-gray-500">{subLabel}</span>
            )}
        </div>
    </div>
);
