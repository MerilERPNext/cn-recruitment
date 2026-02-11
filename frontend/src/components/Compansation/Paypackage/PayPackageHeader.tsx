"use client";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import { Typography } from "../../shared/atoms/Typography";
import CustomDropdown from "../../shared/CustomDropdown";
import { useScreenSize } from "../../../hooks/useScreenSize";

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
        <div className="flex justify-between items-center">
         {isDesktop && <div>
            <Typography variant="h4">Pay package</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage Pay Package
            </Typography>
          </div>}

          <div className="flex items-center justify-between gap-3 w-full">
            {/* 👁 Toggle */}
            <button
              onClick={onToggleAmount}
              className="my-btn-secondary"
              title={showAmount ? "Show amounts" : "Hide amounts"}
            >
              {showAmount ? (
                <>
                  <span className="text-sm font-medium text-gray-700">
                    Show Amounts
                  </span>
                  <BsToggleOff className="w-6 h-6 text-gray-400" />
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-gray-700">
                    Hide Amounts
                  </span>
                  <BsToggleOn className="w-6 h-6 text-primary" />
                </>
              )}
            </button>
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
