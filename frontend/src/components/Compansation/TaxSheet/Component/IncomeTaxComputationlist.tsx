/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

const IncomeTaxComputationlist = ({ data }: any) => {
  const payload = data || {};

  const summary = Array.isArray(payload.summary)
    ? payload.summary
    : [];

  const chapterVia = Array.isArray(payload.chapter_via)
    ? payload.chapter_via
    : [];

  const netTaxable = Array.isArray(payload.net_taxable_breakup)
    ? payload.net_taxable_breakup
    : [];

  const formatAmount = (val?: number) =>
    typeof val === "number" ? val.toLocaleString("en-IN") : "-";

  if (!summary.length && !chapterVia.length && !netTaxable.length) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <span className="text-sm text-gray-500">Loading tax sheet...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-4 py-2 text-left">Description</th>
            <th className="px-4 py-2 text-right">Declared Amount</th>
            <th className="px-4 py-2 text-center">Exemption</th>
            <th className="px-4 py-2 text-center">Taxable Amount</th>
          </tr>
        </thead>
        <tbody>
          <Section title="Income from Salary" />

          {summary.map((item: any) => (
            <Row
              key={item.key}
              label={item.name}
              value={formatAmount(item.amount)}
              bold={item.key?.startsWith("total")}
            />
          ))}
          {chapterVia.length > 0 && (
            <>
              <Section title="Chapter VIA Deductions" />

              {chapterVia.map((section: any) => (
                <ChapterSection key={section.key} section={section} />
              ))}
            </>
          )}
          {netTaxable.length > 0 && (
            <>
              <Section title="Tax Calculations" />

              {netTaxable.map((item: any) => (
                <Row
                  key={item.key}
                  label={item.name}
                  value={formatAmount(item.amount)}
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
  );
};

export default IncomeTaxComputationlist;
const Section = ({ title }: { title: string }) => (
  <tr className="bg-blue-50 font-semibold text-blue-800">
    <td colSpan={4} className="px-4 py-2">
      {title}
    </td>
  </tr>
);
const Row = ({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) => (
  <tr className={`border-t ${bold ? "bg-gray-50 font-semibold" : ""}`}>
    <td className="px-4 py-2">{label}</td>
    <td className="px-4 py-2 text-right">{value}</td>
    <td className="px-4 py-2 text-center">-</td>
    <td className="px-4 py-2 text-center">-</td>
  </tr>
);

const ChapterSection = ({ section }: any) => (
  <>
    <tr className="bg-gray-100 font-medium">
      <td colSpan={4} className="px-4 py-2">
        {section.name}
      </td>
    </tr>

    {Array.isArray(section.components) &&
      section.components.map((c: any, idx: number) => (
        <tr key={idx} className="border-t text-sm">
          <td className="px-6 py-2">{c.component}</td>
          <td className="px-4 py-2 text-right">
            {c.declared_amount?.toLocaleString("en-IN") || "-"}
          </td>
          <td className="px-4 py-2 text-center">
            {c.qualified_amount?.toLocaleString("en-IN") || "-"}
          </td>
          <td className="px-4 py-2 text-center">
            {c.deductible_amount?.toLocaleString("en-IN") || "-"}
          </td>
        </tr>
      ))}

    {typeof section.amount === "number" && (
      <tr className="border-t bg-gray-50 font-semibold">
        <td className="px-4 py-2">Total</td>
        <td className="px-4 py-2 text-right">
          {section.amount.toLocaleString("en-IN")}
        </td>
        <td />
        <td />
      </tr>
    )}
  </>
);
