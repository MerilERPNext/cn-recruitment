"use client";
import { Typography } from "../../shared/atoms/Typography";
import CustomDropdown from "../../shared/CustomDropdown";
import { useScreenSize } from "../../../hooks/useScreenSize";
import ShowHideButton from "../ui/ShowHideButton";

type PayrollPeriod = {
  name: string;
};

type Props = {
  selectedPeriod: string;
  onPeriodChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  payrollPeriods?: PayrollPeriod[];
  isLoading?: boolean;
  showAmount: boolean;
  onToggleAmount: () => void;
};

export default function SalaryAssignmentHeader({
  selectedPeriod,
  onPeriodChange,
  payrollPeriods,
  showAmount,
  onToggleAmount,
}: Props) {
  const { isDesktop } = useScreenSize();
  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-10 w-full font-brand">
      {/* Desktop top bar (hidden on mobile) */}
      {isDesktop && (
        <div className="sm:flex items-center justify-between h-[52px] px-7">
          <span className="font-bold text-[17px] text-text-title tracking-tight">Pay Package</span>
          <div className="flex items-center gap-3.5">
            <ShowHideButton showAmount={showAmount} onToggleAmount={onToggleAmount} />
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] text-text-body2">Payroll Period</span>
              <CustomDropdown
                value={selectedPeriod}
                onChange={onPeriodChange}
                options={
                  payrollPeriods?.map((p) => ({
                    value: p.name,
                    label: p.name,
                  })) || []
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile top bar (hidden on sm+) */}
      {!isDesktop && (
        <div className="flex flex-col px-4 pt-3 pb-3 gap-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[16px] text-text-title tracking-tight">Pay Package</span>
            <div className="flex items-center gap-2">
              <ShowHideButton showAmount={showAmount} onToggleAmount={onToggleAmount} />
              <CustomDropdown
                value={selectedPeriod}
                onChange={onPeriodChange}
                options={
                  payrollPeriods?.map((p) => ({
                    value: p.name,
                    label: p.name,
                  })) || []
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
