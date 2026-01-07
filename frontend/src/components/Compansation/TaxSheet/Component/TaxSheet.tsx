"use client";
import React, { useEffect, useState } from "react";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../../hooks/useLoggedInUser";
import {
  useTaxSheetData,
  useTaxSheetPayrollPriodsData,
} from "../../../../hooks/useTaxSheet";
import { TaxSheetData, SeriesItem } from "../../../../types/taxSheet";
import CustomDropdown from "../../../shared/CustomDropdown";

/* ---------------- Types ---------------- */

type SectionKey = keyof TaxSheetData;

interface SectionProps {
  title: string;
  data: SeriesItem[];
}

type PayrollPeriod = {
  name: string;
};

export default function TaxSheet() {
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const { data: payrollPeriods } =
    useTaxSheetPayrollPriodsData(user?.company || null) as {
      data: PayrollPeriod[] | undefined;
    };
  const [selectedPeriod, setSelectedPeriod] = useState<string>(payrollPeriods?.[0]?.name || "");
  useEffect(() => {
    if (!selectedPeriod) {
      setSelectedPeriod(payrollPeriods?.[0]?.name || "");
    }
  }, [payrollPeriods, selectedPeriod]);

  const payrollPeriodOptions =
    payrollPeriods?.map((p) => ({
      value: p.name,
      label: p.name,
    })) || [];

  const handlePeriodChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedPeriod(e.target.value);
  };

  const { data: taxsheetData } = useTaxSheetData(
    user?.employee || null,
    user?.company || null,
    selectedPeriod || null
  ) as { data: TaxSheetData | undefined };

  useEffect(() => {
    if (selectedPeriod) {
      console.log("API called for payroll period:", selectedPeriod);
    }
  }, [selectedPeriod]);

  if (!taxsheetData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <span className="text-sm text-gray-500">Loading tax sheet...</span>
        </div>
      </div>
    );
  }
  

  const buildSections = (data: TaxSheetData) => {
    const keys = Object.keys(data) as SectionKey[];

    return keys
      .filter(
        (key) =>
          Array.isArray(data[key]) &&
          key !== "months" &&
          key !== "status"
      )
      .map((key) => ({
        key,
        title: key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
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

        {data.map((row, idx) => (
          <React.Fragment key={idx}>
            <div className="border-b px-4 py-3 text-sm">
              {row.name}
            </div>

            {row.values.map((value, i) => (
              <div
                key={i}
                className="border-b px-4 py-3 text-sm text-center"
              >
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
      <header className="py-2 px-4 bg-blue-50 rounded">
        <div className="flex items-center justify-between w-full">
          <h1 className="base-title font-semibold text-gray-800">
            Tax Sheet {selectedPeriod}
          </h1>
<div className="flex flex-row md:flex-row md:items-center md:gap-4">
<FilterDropdowns />
</div>
        </div>
 
      </header>

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

          {taxsheetData.months.map((month) => (
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

          {sections.map((section) => (
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
