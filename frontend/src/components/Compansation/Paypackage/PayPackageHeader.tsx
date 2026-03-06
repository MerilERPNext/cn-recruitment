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
    <div className="border-gray-100">
      <div className="md:px-6 py-4">
        <div className="flex justify-between  items-center">
          {isDesktop && <div>
            <Typography variant="h4">Pay package</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage Pay Package
            </Typography>
          </div>}

          <div className="flex items-center  justify-end max-sm:justify-between gap-3 max-lg:w-full">
            {/* 👁 Toggle */}
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
    </div>
  );
}
