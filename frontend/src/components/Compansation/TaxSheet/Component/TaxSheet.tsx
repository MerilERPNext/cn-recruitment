import React, { useEffect, useState } from "react";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../../hooks/useLoggedInUser";
import {
  useTaxSheetData,
  useTaxSheetPayrollPriodsData,
} from "../../../../hooks/useTaxSheet";
import { TaxSheetData, SeriesItem } from "../../../../types/taxSheet";
import CustomDropdown from "../../../shared/CustomDropdown";
import { Card } from "../../../shared/atoms/Card";
import { Typography } from "../../../shared/atoms/Typography";
import { CardSkeleton } from "../../../shared/molecules/Skeletons/TableSkeleton";

/* ---------------- Types ---------------- */

type SectionKey = keyof TaxSheetData;

interface SectionProps {
  title: string;
  data: SeriesItem[];
}

type PayrollPeriod = {
  start_date: string | number | Date;
  end_date: string | number | Date;
  name: string;
};

export default function TaxSheet() {
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(user?.company ?? null) as {
    data: PayrollPeriod[] | undefined;
  };
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    payrollPeriods?.[0]?.name || "",
  );

  useEffect(() => {
    if (!payrollPeriods?.length) return;

    const today = new Date();

    const matchedPeriod = payrollPeriods.find((p) => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);

      // inclusive range check
      return today >= start && today <= end;
    });

    setSelectedPeriod(
      matchedPeriod?.name || payrollPeriods[0].name
    );
  }, [payrollPeriods, selectedPeriod]);

  const payrollPeriodOptions =
    payrollPeriods?.map((p) => ({
      value: p.name,
      label: p.name,
    })) || [];

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(e.target.value);
  };

  const { data: taxsheetData } = useTaxSheetData(
    user?.employee || null,
    user?.company || null,
    selectedPeriod || null,
  ) as { data: TaxSheetData | undefined };

  useEffect(() => {
    if (selectedPeriod) {
      console.log("API called for payroll period:", selectedPeriod);
    }
  }, [selectedPeriod]);

  if (!taxsheetData) {
    return <CardSkeleton />;
  }

  const buildSections = (data: TaxSheetData) => {
    const keys = Object.keys(data) as SectionKey[];

    return keys
      .filter(
        (key) =>
          Array.isArray(data[key]) && key !== "months" && key !== "status",
      )
      ?.map((key) => ({
        key,
        title: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      }));
  };

  const sections = buildSections(taxsheetData);

  const Section: React.FC<SectionProps> = ({ title, data }) => {
    if (!data?.length) return null;

    return (
      <>
        <div className="col-span-full bg-gray-100 border-b px-4 py-2 text-sm font-semibold">
          {title}
        </div>

        {data?.map((row, idx) => (
          <React.Fragment key={idx}>
            <div className="border-b px-4 py-3 text-sm">{row.name}</div>

            {row.values?.map((value, i) => (
              <div key={i} className="border-b px-4 py-3 text-sm text-center">
                {value}
              </div>
            ))}

            <div className="border-b px-4 py-3 text-sm text-center font-semibold">
              {row.total}
            </div>
          </React.Fragment>
        ))}
      </>
    );
  };

  const FilterDropdowns = () => (
    <div className="flex items-center gap-2">
      <CustomDropdown
        value={selectedPeriod}
        onChange={handlePeriodChange}
        options={payrollPeriodOptions}
      />
    </div>
  );
  return (
    <div className="space-y-1">
      <Card padding="sm">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <Typography variant="h4">Tax Sheet {selectedPeriod}</Typography>
            <Typography variant="bodySmall" color="body2">
              Selected Pay Roll Period {selectedPeriod}
            </Typography>
          </div>
          <div className="flex flex-row md:flex-row md:items-center md:gap-4">
            <FilterDropdowns />
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto border rounded-lg">
        <div
          className="min-w-max"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${(taxsheetData?.months?.length || 0) + 2}, minmax(120px, 1fr))`,
          }}
        >
          <div className="bg-gray-50 border-b px-4 py-2 text-sm font-semibold">
            Particulars
          </div>

          {taxsheetData.months?.map((month) => (
            <div
              key={month}
              className="bg-gray-50 border-b px-4 py-2 text-center text-sm font-semibold"
            >
              {month}
            </div>
          ))}

          <div className="bg-gray-50 border-b px-4 py-2 text-center text-sm font-semibold">
            Total
          </div>

          {sections?.map((section) => (
            <Section
              key={section.key}
              title={section.title}
              data={taxsheetData[section.key] as SeriesItem[]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
