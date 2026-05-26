import React from "react";
import { Check, Sparkles } from "lucide-react";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";

type Rating = "Outstanding" | "Exceeds" | "Meets" | "Below";

type PreviewEmployee = {
  id: string;
  initials: string;
  name: string;
  rating: Rating;
  status: "approved" | "review";
};

type ResolvedValue = {
  token: string;
  value: string;
};

type CustomBadgeProps = {
  dotClassName?: string;
  label: string;
  className: string;
};

const employees: PreviewEmployee[] = [
  { id: "pm", initials: "PM", name: "Pallavi Mahar", rating: "Exceeds", status: "approved" },
  { id: "ki", initials: "KI", name: "Karthik Iyer", rating: "Exceeds", status: "approved" },
  { id: "ms", initials: "MS", name: "Mohit Sinha", rating: "Meets", status: "approved" },
  { id: "rb", initials: "RB", name: "Riya Banerjee", rating: "Outstanding", status: "approved" },
  { id: "ab", initials: "AB", name: "Aman Bhatt", rating: "Meets", status: "review" },
  { id: "sd", initials: "SD", name: "Shreya Das", rating: "Exceeds", status: "review" },
  { id: "vr", initials: "VR", name: "Vikram Rao", rating: "Below", status: "review" },
  { id: "prm", initials: "PM", name: "Priya Menon", rating: "Exceeds", status: "review" },
];

const resolvedValues: ResolvedValue[] = [
  { token: "{{employee_name}}", value: "Pallavi Mahar" },
  { token: "{{employee_id}}", value: "PW-OX-3104" },
  { token: "{{designation}}", value: "Sr. Product Designer" },
  { token: "{{performance_rating}}", value: "Exceeds Expectations (4/5)" },
  { token: "{{effective_date}}", value: "1 Jul 2026" },
  { token: "{{prev_compensation}}", value: "₹ 28,80,000" },
  { token: "{{merit_pct}}", value: "12.0%" },
  { token: "{{bonus_amount}}", value: "₹ 4,32,000" },
  { token: "{{new_compensation}}", value: "₹ 32,25,600" },
  { token: "{{key_achievement}}", value: "the Oxygen 2.0 dashboard rollout" },
];

const ratingTone: Record<Rating, { bg: string; text: string; dot: string }> = {
  Outstanding: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-600" },
  Exceeds: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-600" },
  Meets: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-600" },
  Below: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-600" },
};

const CustomBadge = ({ dotClassName, label, className }: CustomBadgeProps) => (
  <span
    className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold leading-5 ${className}`}
  >
    {dotClassName ? <span className={`h-1.5 w-1.5 rounded-md ${dotClassName}`} /> : null}
    {label}
  </span>
);

const RatingBadge = ({ rating }: { rating: Rating }) => {
  const tone = ratingTone[rating];

  return (
    <CustomBadge
      dotClassName={tone.dot}
      label={rating}
      className={`${tone.bg} ${tone.text}`}
    />
  );
};

const Token = ({ children }: { children: React.ReactNode }) => (
  <mark className="rounded-md bg-yellow-100 px-1 py-0.5 font-semibold text-gray-700">
    {children}
  </mark>
);

const PreReleasePreview: React.FC = () => {
  return (
    <main className="min-h-full overflow-y-auto overflow-x-hidden bg-[#f4f7fb] px-3 py-4 font-sans text-gray-900 sm:px-4 lg:px-6 lg:py-6">
      <div className="mx-auto grid w-full max-w-[1480px] min-w-0 gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-4">
              <Typography variant="h3" className="text-lg font-bold text-gray-900">
                Pre-release Preview
              </Typography>
              <Typography variant="bodySmall" className="mt-1 block text-sm text-gray-500">
                Approve copy before HR releases to your team
              </Typography>
            </div>

            <div className="flex flex-col gap-3 border-y border-gray-100 bg-[#f8fafc] p-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
              <Typography variant="bodyMedium" className="text-sm font-bold text-gray-600">
                4 of 8 approved
              </Typography>
              <Button
                type="button"
                variant="contain"
                bgColor="success"
                className="h-10 w-full justify-center rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 min-[420px]:w-auto"
              >
                Approve remaining
              </Button>
            </div>

            <div className="divide-y divide-gray-100">
              {employees.map((employee, index) => {
                const isSelected = index === 0;

                return (
                  <button
                    key={employee.id}
                    type="button"
                    className={`flex min-h-[66px] w-full min-w-0 items-center gap-3 px-4 text-left transition ${
                      isSelected
                        ? "border-l-4 border-blue-500 bg-blue-50"
                        : "border-l-4 border-transparent bg-white hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-sm font-bold text-blue-600">
                      {employee.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-gray-900">{employee.name}</span>
                      <span className="mt-1 block">
                        <RatingBadge rating={employee.rating} />
                      </span>
                    </span>
                    {employee.status === "approved" ? (
                      <Sparkles className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <CustomBadge
                        label="Review"
                        className="shrink-0 bg-amber-50 text-amber-700"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="flex flex-col gap-3 border-b border-gray-100 bg-[#f8fafc] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Typography variant="h3" className="text-base font-bold text-gray-900 sm:text-lg">
                Appraisal Letter · Pallavi Mahar
              </Typography>
              <Typography variant="bodySmall" className="mt-1 block break-words text-sm text-gray-500">
                Template: FY26-Appraisal-EN-v3 · Language: English
              </Typography>
            </div>
            <div className="grid gap-2 min-[420px]:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                bgColor="text"
                className="h-10 w-full justify-center rounded-lg border-gray-300 bg-white px-4 text-sm font-bold text-gray-700 sm:w-auto"
              >
                Request edit
              </Button>
              <Button
                type="button"
                variant="contain"
                bgColor="success"
                className="h-10 w-full justify-center rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 sm:w-auto"
              >
                <Check className="h-4 w-4" />
                Approve for release
              </Button>
            </div>
          </header>

          <div className="grid min-w-0 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-5">
            <article className="min-w-0 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
              <div className="mx-auto min-h-[620px] max-w-[720px] p-5 sm:p-7 lg:p-10">
                <div className="flex flex-col gap-4 border-b-4 border-blue-500 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 grid-cols-2 gap-1 rounded-md bg-blue-500 p-1">
                      <span className="rounded-md bg-white" />
                      <span className="rounded-md bg-white/40" />
                      <span className="rounded-md bg-white/40" />
                      <span className="rounded-md bg-white" />
                    </div>
                    <Typography variant="h2" className="text-xl font-extrabold tracking-[0.18em] text-gray-900">
                      OXYGEN
                    </Typography>
                  </div>
                  <div className="text-left sm:text-right">
                    <Typography variant="bodySmall" className="block font-bold text-gray-800">
                      Physics Wallah Pvt. Ltd.
                    </Typography>
                    <Typography variant="caption" className="block text-gray-500">
                      Gurugram, Haryana
                    </Typography>
                  </div>
                </div>

                <div className="mt-7 space-y-4 text-sm leading-relaxed text-gray-700">
                  <Typography variant="h2" className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                    Annual Performance Appraisal — FY26
                  </Typography>
                  <p>8 June 2026</p>
                  <p>
                    Dear <Token>{"{{employee_name}}"}</Token>,
                    <br />
                    Employee ID: <Token>{"{{employee_id}}"}</Token> · Designation:{" "}
                    <Token>{"{{designation}}"}</Token>
                  </p>
                  <p>
                    We are pleased to share the outcome of your annual performance review for FY26. Your
                    work on <Token>{"{{key_achievement}}"}</Token> has been outstanding.
                  </p>

                  <div className="mt-6 divide-y divide-gray-200">
                    {[
                      ["Performance Rating", "{{performance_rating}}"],
                      ["Effective Date", "{{effective_date}}"],
                      ["Annual Compensation (Previous)", "{{prev_compensation}}"],
                      ["Merit Increase", "{{merit_pct}}"],
                      ["Performance Bonus", "{{bonus_amount}}"],
                      ["Annual Compensation (Revised)", "{{new_compensation}}"],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-1 gap-1 py-2 min-[520px]:grid-cols-[1fr_auto]">
                        <span className="text-gray-600">{label}</span>
                        <Token>{value}</Token>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <p>Warm regards,</p>
                    <Typography variant="bodyMedium" className="mt-2 block font-bold text-gray-900">
                      Aditi Sharma
                    </Typography>
                    <Typography variant="bodySmall" className="text-gray-600">
                      Head — People & Culture
                    </Typography>
                  </div>
                </div>
              </div>
            </article>

            <aside className="min-w-0">
              <Typography
                variant="caption"
                className="mb-3 block text-[11px] font-extrabold uppercase tracking-wider text-gray-500"
              >
                Resolved values for Pallavi
              </Typography>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {resolvedValues.map((item) => (
                  <div key={item.token} className="min-w-0 rounded-md border border-gray-200 bg-white p-3 shadow-sm">
                    <Typography
                      variant="caption"
                      className="block truncate font-mono text-[11px] font-bold text-amber-700"
                    >
                      {item.token}
                    </Typography>
                    <Typography variant="bodySmall" className="mt-1 block break-words text-sm font-bold text-gray-800">
                      {item.value}
                    </Typography>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
};

export default PreReleasePreview;
