"use client"

import React from "react";
import { useCurrentEmployeeAllDetails } from "../../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../../hooks/useLoggedInUser";
import { useTaxSheetData } from "../../../../hooks/useTaxSheet";
import { TaxSheetData, SeriesItem } from "../../../../types/taxSheet";

type SectionKey = keyof TaxSheetData;

interface SectionProps {
  title: string;
  data: SeriesItem[];
}

export default function TaxSheet() {
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const { data: taxsheetData } = useTaxSheetData(
    user?.employee || null
  ) as { data: TaxSheetData | undefined };

  if (!taxsheetData) return <div>Loading...</div>;

  /** --- Build dynamic sections from keys --- **/
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


  /** ---- Reusable Section component ---- **/
  const Section: React.FC<SectionProps> = ({ title, data }) => {
    if (!data || data.length === 0) return null;

    return (
      <>
        <div className="col-span-full bg-gray-100 border-b px-4 py-2 text-sm font-semibold">
          {title}
        </div>

        {data.map((row: SeriesItem, idx: number) => (
          <React.Fragment key={idx}>
            <div className="border-b px-4 py-3 text-sm">{row.name}</div>

            {row.values.map((value: number, i: number) => (
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


  return (
    <div className="space-y-4">
      <div className="overflow-x-auto border rounded-lg">

        <div
          className="min-w-max"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${taxsheetData.months.length + 2}, minmax(120px, 1fr))`,
          }}
        >

          {/* Header Row */}
          <div className="bg-gray-50 border-b px-4 py-2 text-sm font-semibold">
            Particulars
          </div>

          {taxsheetData.months.map((month: string) => (
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


          {/* ---- render all dynamic sections ---- */}
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
