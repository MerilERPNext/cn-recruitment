import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { SalaryComponentDetail } from "../../../hooks/useBenefit";
import { formatCurrency } from "../../../utils/currency";

const MobileDataCard = ({ data }: { data: SalaryComponentDetail }) => {
  const [isOpen, setIsOpen] = useState(false);

  const workingDays = data.working_days ?? data.payment_days ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 mb-4">
      <div
        className="p-4 flex items-center justify-between bg-white cursor-pointer hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="font-bold text-slate-800">{data.month}</span>
          </div>

          <div className="text-xs text-gray-500">
            Work Days:{" "}
            <span className="font-medium text-slate-700">{workingDays}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="block text-[10px] text-gray-800 uppercase">
              Closing Balance
            </span>
            <span className="block font-bold text-slate-800">
              {formatCurrency(data.closing_balance ?? 0)}
            </span>
          </div>

          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-300" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-300" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="bg-gray-50/50 border-t border-gray-100 p-4 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            {/* Original */}
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-700 uppercase">
                Original
              </span>
              <span className="">
                {formatCurrency(data?.periodic_original_amount ?? 0)}
              </span>
            </div>

            {/* Accrued */}
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-700 uppercase">
                Accrued
              </span>
              <span className="">{formatCurrency(data?.amount ?? 0)}</span>
            </div>

            {/* Claimed */}
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-700 uppercase">
                Claimed
              </span>
              <span>{formatCurrency(data?.claimed_amount ?? 0)}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-gray-700 uppercase">Paid</span>
              <span>{formatCurrency(data?.paid_amount ?? 0)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileDataCard;
