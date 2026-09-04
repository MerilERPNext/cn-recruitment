/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { CardSkeleton } from "../../../shared/molecules/Skeletons/TableSkeleton";
import { NoDataFound } from "../../../shared/atoms/NoDataFound";

const IncomeTaxComputationlist = ({ data }: any) => {
  const payload = data || {};

  const summary = Array.isArray(payload.summary) ? payload.summary : [];
  const chapterVia = Array.isArray(payload.chapter_via)
    ? payload.chapter_via
    : [];
  const netTaxable = Array.isArray(payload.net_taxable_breakup)
    ? payload.net_taxable_breakup
    : [];

  const formatAmount = (val: any) =>
    typeof val === "number" ? val.toLocaleString("en-IN") : "-";

  // Loading state
  if (!summary && !chapterVia && !netTaxable) {
    return <CardSkeleton />;
  }

  // Empty state (API returned but no data)
  if (!summary.length && !chapterVia.length && !netTaxable.length) {
    return (
      <NoDataFound title="No Tax Summary Available" subtitle="No tax details found for the selected period." />
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-4 py-2 text-left w-[40%] whitespace-nowrap">Description</th>
              <th className="px-4 py-2 text-right w-[20%] whitespace-nowrap">
                Declared Amount
              </th>
              <th className="px-4 py-2 text-right w-[20%] whitespace-nowrap">
                Exemption
              </th>
              <th />
              <th className="px-4 py-2 text-right w-[20%] whitespace-nowrap">
                Taxable
              </th>

            </tr>
          </thead>

          <tbody>
            {/* ================= Salary Summary ================= */}
            <Section title="Income from Salary" />

            {summary.map((item: any) => (
              <Row
                key={item.key}
                label={item.name}
                declared={formatAmount(item.declared_amount ?? item.col1)}
                exemption={formatAmount(item.exemption_amount ?? item.col2)}
                taxable={formatAmount(
                  item.taxable_amount ?? item.col4 ?? item.amount
                )}
                bold={item.key?.startsWith("total")}
              />
            ))}

            {/* ================= Chapter VIA ================= */}
            {chapterVia.length > 0 && (
              <>
                <tr className="bg-gray-100 border-t font-semibold">
                  <td className="px-4 py-2">Total Chapter-VIA</td>
                  <td className="px-4 py-2 text-right">Declared</td>
                  <td className="px-4 py-2 text-right">Qualified</td>
                  <td className="px-4 py-2 text-right">Deductible</td>
                  <td />
                </tr>

                {chapterVia.map((section: any) => {
                  if (section.key === "total_chapter_via") return null;

                  // Section with components
                  if (Array.isArray(section.components)) {
                    return (
                      <React.Fragment key={section.key}>
                        {/* Section Name */}
                        <tr className="border-t font-medium text-blue-600">
                          <td className="px-4 py-2">{section.name}</td>
                          <td />
                          <td />
                          <td />
                        </tr>

                        {/* Components */}
                        {section.components.map((c: any, i: number) => (
                          <tr key={i} className="border-t">
                            <td className="px-6 py-2">{c.component}</td>
                            <td className="px-4 py-2 text-right">
                              {formatAmount(c.declared_amount)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {formatAmount(c.qualified_amount)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {formatAmount(c.deductible_amount)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  }

                  // Total rows
                  if (typeof section.amount === "number") {
                    return (
                      <tr
                        key={section.key}
                        className="border-t bg-gray-200 font-semibold"
                      >
                        <td className="px-4 py-2">{section.name}</td>
                        <td />
                        <td />
                        <td className="px-4 py-2 text-right">
                          {formatAmount(section.amount)}
                        </td>
                        <td />
                      </tr>
                    );
                  }

                  return null;
                })}
              </>
            )}

            {/* ================= Net Tax Calculation ================= */}
            {netTaxable.length > 0 && (
              <>
                <Section title="Tax Calculations" />

                {netTaxable.map((item: any) => (
                  <Row
                    key={item.key}
                    label={item.name}
                    declared={""}
                    exemption="-"
                    taxable={formatAmount(item.amount)}
                    bold={
                      item.key === "net_tax_payable" ||
                      item.key === "remaining_tax"
                    }
                  />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IncomeTaxComputationlist;

/* ================================================= */

const Section = ({ title }: { title: string }) => (
  <tr className="bg-primary/10 font-semibold text-primary">
    <td colSpan={5} className="px-4 py-2">
      {title}
    </td>
  </tr>
);

/* ================================================= */

const Row = ({
  label,
  declared,
  exemption,
  taxable,
  bold,
}: {
  label: string;
  declared: string;
  exemption: string;
  taxable: string;
  bold?: boolean;
}) => (
  <tr className={`border-t ${bold ? "bg-gray-50 font-semibold" : ""}`}>
    <td className="px-4 py-2">{label}</td>
    <td className="px-4 py-2 text-right">{declared}</td>
    <td className="px-4 py-2 text-right">{exemption}</td>
    <td />
    <td className="px-4 py-2 text-right">{taxable}</td>
  </tr>
);
