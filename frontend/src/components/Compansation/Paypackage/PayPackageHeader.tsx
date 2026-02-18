"use client";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import { Typography } from "../../shared/atoms/Typography";
import CustomDropdown from "../../shared/CustomDropdown";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Button from "../../shared/atoms/Button";

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

          <div className="flex items-center justify-end gap-3 w-full">
            {/* 👁 Toggle */}
            <Button
              onClick={onToggleAmount}
              variant="outline"
              bgColor="white"
              size="md"
              className="flex items-center gap-2  border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
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
            </Button>
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
