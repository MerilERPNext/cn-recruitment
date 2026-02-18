/* eslint-disable @typescript-eslint/no-explicit-any */
import { CardSkeleton } from "../../../shared/molecules/Skeletons/TableSkeleton";

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

  if (!summary.length && !chapterVia.length && !netTaxable.length) {
    return <CardSkeleton />;
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
              <Section title="Chapter VIA Deductions" />

              {chapterVia.map((section: any) => (
                <ChapterSection key={section.key} section={section} />
              ))}
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
                  declared={formatAmount(item.amount)}
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
  );
};

export default IncomeTaxComputationlist;

/* ================================================= */

const Section = ({ title }: { title: string }) => (
  <tr className="bg-primary/10 font-semibold text-primary">
    <td colSpan={4} className="px-4 py-2">
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
    <td className="px-4 py-2 text-center">{exemption}</td>
    <td className="px-4 py-2 text-center">{taxable}</td>
  </tr>
);

/* ================================================= */

const ChapterSection = ({ section }: any) => (
  <>
    {/* Section Header */}
    <tr className="bg-gray-100 font-medium">
      <td colSpan={4} className="px-4 py-2">
        {section.name}
      </td>
    </tr>

    {/* Components */}
    {Array.isArray(section.components) &&
      section.components.map((c: any, idx: number) => (
        <tr key={idx} className="border-t text-sm">
          <td className="px-6 py-2">{c.component}</td>
          <td className="px-4 py-2 text-right">
            {typeof c.declared_amount === "number"
              ? c.declared_amount.toLocaleString("en-IN")
              : "-"}
          </td>
          <td className="px-4 py-2 text-center">
            {typeof c.qualified_amount === "number"
              ? c.qualified_amount.toLocaleString("en-IN")
              : "-"}
          </td>
          <td className="px-4 py-2 text-center">
            {typeof c.deductible_amount === "number"
              ? c.deductible_amount.toLocaleString("en-IN")
              : "-"}
          </td>
        </tr>
      ))}

    {/* Total Row */}
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
