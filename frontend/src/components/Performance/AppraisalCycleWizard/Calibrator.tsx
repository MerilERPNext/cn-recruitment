import { Grid3X3, Pause, Send } from "lucide-react";
import { useState } from "react";
import Badge from "../../shared/Badge";
import { Select } from "../../shared/atoms/Select";
import { Typography } from "../../shared/atoms/Typography";
import ManagerOverride from "./components/Calibrator/ManagerOverride";

type Rating = "Outstanding" | "Exceeds" | "Meets" | "Below";

type PriorCycle = Rating | "Unsatisfactory" | "";

type CalibratorEmployee = {
  id: number;
  initials: string;
  name: string;
  detail: string;
  manager: string;
  prior: [PriorCycle, PriorCycle, PriorCycle];
  self: Rating;
  managerSuggested: Rating;
  calibrated: Rating;
  nineBox: [number, number];
  flag?: {
    label: string;
    tone: "green" | "amber";
  };
  override?: boolean;
};

const ratingOptions: { label: Rating; value: Rating }[] = [
  { label: "Outstanding", value: "Outstanding" },
  { label: "Exceeds", value: "Exceeds" },
  { label: "Meets", value: "Meets" },
  { label: "Below", value: "Below" },
];

const distribution = [
  { label: "Unsati", value: 8, color: "bg-blue-500", height: "h-2" },
  { label: "Below", value: 21, color: "bg-rose-500", height: "h-6" },
  { label: "Meets", value: 53, color: "bg-red-500", height: "h-14" },
  { label: "Exceed", value: 14, color: "bg-blue-500", height: "h-4" },
  { label: "Outsta", value: 4, color: "bg-blue-500", height: "h-1.5" },
];

const employees: CalibratorEmployee[] = [
  {
    id: 1,
    initials: "PM",
    name: "Pallavi Mahar",
    detail: "Design · Oxygen · L4 · 3.2y",
    manager: "Rohit Khanna",
    prior: ["Meets", "Exceeds", "Exceeds"],
    self: "Outstanding",
    managerSuggested: "Outstanding",
    calibrated: "Exceeds",
    nineBox: [2, 0],
    override: true,
  },
  {
    id: 2,
    initials: "KI",
    name: "Karthik Iyer",
    detail: "Engineering · Platform · L4 · 4.1y",
    manager: "Rohit Khanna",
    prior: ["Meets", "Exceeds", "Outstanding"],
    self: "Outstanding",
    managerSuggested: "Outstanding",
    calibrated: "Outstanding",
    nineBox: [2, 0],
    flag: { label: "Promotion candidate", tone: "green" },
  },
  {
    id: 3,
    initials: "NP",
    name: "Neha Patel",
    detail: "Product · Oxygen · L4 · 5.2y",
    manager: "Sanjay Roy",
    prior: ["Exceeds", "Outstanding", "Exceeds"],
    self: "Outstanding",
    managerSuggested: "Exceeds",
    calibrated: "Exceeds",
    nineBox: [2, 1],
  },
  {
    id: 4,
    initials: "MS",
    name: "Mohit Sinha",
    detail: "Design · Recruit · L3 · 2.0y",
    manager: "Rohit Khanna",
    prior: ["Below", "Meets", "Meets"],
    self: "Meets",
    managerSuggested: "Meets",
    calibrated: "Meets",
    nineBox: [1, 1],
  },
  {
    id: 5,
    initials: "RB",
    name: "Riya Banerjee",
    detail: "Design · Oxygen · L2 · 1.8y",
    manager: "Rohit Khanna",
    prior: ["", "", "Exceeds"],
    self: "Outstanding",
    managerSuggested: "Outstanding",
    calibrated: "Outstanding",
    nineBox: [2, 0],
    flag: { label: "Hi-Po · early promo eligible", tone: "green" },
  },
  {
    id: 6,
    initials: "AB",
    name: "Aman Bhatt",
    detail: "Engineering · Web · L2 · 1.5y",
    manager: "Karthik Iyer",
    prior: ["", "", "Meets"],
    self: "Meets",
    managerSuggested: "Meets",
    calibrated: "Meets",
    nineBox: [1, 1],
  },
  {
    id: 7,
    initials: "SD",
    name: "Shreya Das",
    detail: "Design · Oxygen · L1 · 0.6y",
    manager: "Rohit Khanna",
    prior: ["", "", ""],
    self: "Outstanding",
    managerSuggested: "Exceeds",
    calibrated: "Exceeds",
    nineBox: [2, 0],
    flag: { label: "Probationary", tone: "amber" },
  },
  {
    id: 8,
    initials: "VR",
    name: "Vikram Rao",
    detail: "Design · LMS · L2 · 2.4y",
    manager: "Rohit Khanna",
    prior: ["Below", "Meets", "Below"],
    self: "Meets",
    managerSuggested: "Below",
    calibrated: "Meets",
    nineBox: [0, 1],
    flag: { label: "Manager raised - needs discussion", tone: "amber" },
    override: true,
  },
  {
    id: 9,
    initials: "PM",
    name: "Priya Menon",
    detail: "Research · L3 · 3.0y",
    manager: "Rohit Khanna",
    prior: ["Meets", "Exceeds", "Exceeds"],
    self: "Outstanding",
    managerSuggested: "Exceeds",
    calibrated: "Exceeds",
    nineBox: [2, 0],
  },
  {
    id: 10,
    initials: "SR",
    name: "Sanjay Roy",
    detail: "Product · Oxygen · L5 · 6.8y",
    manager: "Aditi Sharma",
    prior: ["Meets", "Exceeds", "Outstanding"],
    self: "Outstanding",
    managerSuggested: "Outstanding",
    calibrated: "Outstanding",
    nineBox: [2, 0],
  },
  {
    id: 11,
    initials: "TM",
    name: "Tarun Mishra",
    detail: "Engineering · Mobile · L3 · 2.7y",
    manager: "Karthik Iyer",
    prior: ["Below", "Meets", "Exceeds"],
    self: "Outstanding",
    managerSuggested: "Exceeds",
    calibrated: "Exceeds",
    nineBox: [2, 1],
  },
  {
    id: 12,
    initials: "DA",
    name: "Divya Agarwal",
    detail: "Product · Recruit · L3 · 2.2y",
    manager: "Sanjay Roy",
    prior: ["Meets", "Exceeds", "Meets"],
    self: "Exceeds",
    managerSuggested: "Exceeds",
    calibrated: "Meets",
    nineBox: [1, 1],
    flag: { label: "Inconsistent - yoy variance", tone: "amber" },
    override: true,
  },
];

const generatePastelColor = (index: number) => {
  const colors = [
    "bg-blue-100 text-blue-700 ring-blue-300",
    "bg-purple-100 text-purple-700 ring-purple-300",
    "bg-green-100 text-green-700 ring-green-300",
    "bg-pink-100 text-pink-700 ring-pink-300",
    "bg-yellow-100 text-yellow-700 ring-yellow-300",
    "bg-orange-100 text-orange-700 ring-orange-300",
    "bg-cyan-100 text-cyan-700 ring-cyan-300",
    "bg-red-100 text-red-700 ring-red-300",
  ];
  return colors[index % colors.length];
};

const ratingColorIndex: Record<Rating | "Unsatisfactory", number> = {
  Unsatisfactory: 0,
  Below: 4,
  Meets: 0,
  Exceeds: 2,
  Outstanding: 6,
};

const ratingTextColor: Record<Rating, string> = {
  Outstanding: "text-emerald-700",
  Exceeds: "text-emerald-700",
  Meets: "text-blue-600",
  Below: "text-amber-700",
};

const CalibratorSession = () => {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [calibratedRatings, setCalibratedRatings] = useState(
    employees.reduce<Record<number, Rating>>(
      (acc, employee) => ({ ...acc, [employee.id]: employee.calibrated }),
      {},
    ),
  );

  return (
    <div className="min-h-dvh bg-[#f4f7fb] font-sans text-gray-900">
      <main className="mx-auto flex max-w-[1440px] flex-col gap-3 p-3 sm:gap-4 sm:p-4">
        <section className="shrink-0 rounded-md border border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
                <Badge
                  label="Session Live"
                  backgroundColor={generatePastelColor(2)}
                  textColor=""
                  size="sm"
                />
                <span>FY26 · India Tech · L1-L5 · 12 of 142 calibrated</span>
              </div>
              <Typography variant="h1" className="text-lg font-bold leading-tight text-gray-900 sm:text-xl">
                Calibration · India Tech · 5 Jun 2026
              </Typography>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center">
              <div className="flex items-center sm:col-span-2 xl:col-span-1">
                {["AS", "RK", "SR", "NP"].map((initials, index) => (
                  <span
                    key={initials}
                    className="-ml-1 first:ml-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-[11px] font-bold text-blue-600"
                    style={{ zIndex: 10 - index }}
                  >
                    {initials}
                  </span>
                ))}
                <span className="ml-3 text-sm font-medium text-gray-600">+ 2 calibrators in session</span>
              </div>
              <button className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-blue-300 bg-white px-4 text-sm font-bold text-blue-600 shadow-sm">
                <Grid3X3 className="h-4 w-4" />
                Open 9-Box view
              </button>
              <button className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm">
                <Pause className="h-4 w-4" />
                Pause Session
              </button>
              <button className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm sm:col-span-2 xl:col-span-1">
                <Send className="h-4 w-4" />
                Submit & Publish ratings
              </button>
            </div>
          </div>
        </section>

        <section className="shrink-0 rounded-md border border-gray-200 bg-white px-4 py-5 shadow-sm sm:px-5">
          <Typography
            variant="caption"
            className="block font-bold uppercase tracking-wider text-gray-500"
          >
            Distribution · Soft Target
          </Typography>
          <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Typography variant="h2" className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Within +5%
              </Typography>
              <p className="mt-1 text-sm font-medium text-gray-500">
                Target 5/15/60/15/5 · Actual 8/21/53/14/4
              </p>
            </div>
            <div className="grid flex-1 grid-cols-5 items-end gap-2 sm:gap-6 lg:max-w-[980px]">
              {distribution.map((item) => (
                <div key={item.label} className="flex min-w-0 flex-col items-center">
                  <span className={`mb-1 text-xs font-bold ${item.value > 20 ? "text-rose-500" : "text-gray-600"}`}>
                    {item.value}%
                  </span>
                  <span className={`w-8 rounded-t-md sm:w-11 ${item.height} ${item.color}`} />
                  <span className="mt-1 truncate text-[11px] font-medium text-gray-600">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3 md:hidden">
          {employees.map((employee) => {
            const selectedRating =
              ratingOptions.find((option) => option.value === calibratedRatings[employee.id]) ??
              ratingOptions[0];

            return (
              <article
                key={employee.id}
                className="rounded-md border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-500">
                    {employee.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      className="break-words text-left text-sm font-bold text-gray-900 hover:text-blue-600"
                      onClick={() => setOverrideOpen(true)}
                    >
                      {employee.name}
                    </button>
                    <div className="mt-0.5 text-xs font-medium leading-relaxed text-gray-500">
                      {employee.detail}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-gray-600">
                      Manager: {employee.manager}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { label: "FY26 Self", value: employee.self },
                    { label: "Manager Suggested", value: employee.managerSuggested },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-gray-50 p-3">
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        {item.label}
                      </div>
                      <Badge
                        label={item.value}
                        backgroundColor={generatePastelColor(ratingColorIndex[item.value])}
                        textColor=""
                        size="sm"
                      />
                    </div>
                  ))}
                  <div className={`rounded-lg p-3 ${employee.override ? "bg-amber-50" : "bg-blue-50"}`}>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Calibrated
                    </div>
                    <Select
                    
                      options={ratingOptions}
                      value={selectedRating}
                      onChange={(option) =>
                        {
                          setCalibratedRatings((current) => ({
                            ...current,
                            [employee.id]: option.value,
                          }));
                          setOverrideOpen(true);
                        }
                      }
                      className={`relative w-full [&>button]:min-h-[36px] [&>button]:rounded-md [&>button]:border-gray-200 [&>button]:px-2 [&>button]:py-1.5 [&>button]:text-xs [&>button]:font-bold [&>button]:shadow-sm [&>button_span]:font-bold [&>div]:mt-1 [&>div]:w-full [&>div]:rounded-none [&>div]:p-0 [&_li]:rounded-none [&_li]:px-3 [&_li]:py-1.5 ${ratingTextColor[selectedRating.value]}`}
                    />
                    {employee.override && (
                      <span className="mt-1 block text-[10px] font-bold uppercase text-amber-700">
                        + Override
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_72px]">
                  <div className="rounded-lg bg-[#f3f7ff] p-3">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Prior Cycles
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {employee.prior.map((rating, index) => (
                        <span key={`${employee.id}-mobile-${index}`} className="inline-flex items-center gap-2">
                          <span className="text-[11px] font-bold text-gray-400">
                            FY{23 + index}
                          </span>
                          {rating ? (
                            <Badge
                              label={rating === "Unsatisfactory" ? "Unsati" : rating}
                              backgroundColor={generatePastelColor(ratingColorIndex[rating])}
                              textColor=""
                              size="sm"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-400">-</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      9-Box
                    </div>
                    <div className="grid h-[52px] w-[52px] grid-cols-3 gap-0.5">
                      {Array.from({ length: 9 }).map((_, index) => {
                        const row = Math.floor(index / 3);
                        const col = index % 3;
                        const active = col === employee.nineBox[0] && row === employee.nineBox[1];

                        return (
                          <span
                            key={index}
                            className={`rounded-[3px] ${
                              active ? "bg-blue-500 ring-2 ring-white" : "bg-gray-200"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {employee.flag && (
                  <div className="mt-4">
                    <Badge
                      label={employee.flag.label}
                      backgroundColor={generatePastelColor(employee.flag.tone === "green" ? 2 : 4)}
                      textColor=""
                      size="sm"
                    />
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1320px] border-collapse text-left">
              <thead className="sticky top-0 z-20 bg-[#f3f7ff] text-xs font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th rowSpan={2} className="w-[230px] border-b border-r border-gray-200 px-4 py-4">
                    Employee
                  </th>
                  <th rowSpan={2} className="w-[130px] border-b border-r border-gray-200 px-4 py-4">
                    Manager
                  </th>
                  <th colSpan={3} className="border-b border-r border-gray-200 bg-[#f1f6ff] px-4 py-3">
                    Prior cycles (culture amp pattern · up to 3)
                  </th>
                  <th rowSpan={2} className="w-[120px] border-b border-r border-gray-200 px-4 py-4">
                    FY26 Self
                  </th>
                  <th rowSpan={2} className="w-[170px] border-b border-r border-gray-200 px-4 py-4">
                    FY26 Manager Suggested
                  </th>
                  <th rowSpan={2} className="w-[130px] border-b border-x border-blue-300 bg-blue-50 px-4 py-4">
                    FY26 Calibrated
                  </th>
                  <th rowSpan={2} className="w-[90px] border-b border-r border-gray-200 px-3 py-4">
                    9-Box
                  </th>
                  <th rowSpan={2} className="w-[220px] border-b border-gray-200 px-4 py-4">
                    Flag
                  </th>
                </tr>
                <tr>
                  {["FY23", "FY24", "FY25"].map((year) => (
                    <th key={year} className="w-[120px] border-b border-r border-gray-200 bg-[#f1f6ff] px-4 py-3">
                      {year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => {
                  const selectedRating =
                    ratingOptions.find((option) => option.value === calibratedRatings[employee.id]) ??
                    ratingOptions[0];

                  return (
                    <tr key={employee.id} className="border-b border-gray-100 last:border-b-0">
                      <td className="border-r border-gray-100 px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-500">
                            {employee.initials}
                          </span>
                          <div className="min-w-0">
                            <button
                              className="block max-w-full truncate text-left text-sm font-bold text-gray-800 hover:text-blue-600"
                              
                            >
                              {employee.name}
                            </button>
                            <div className="truncate text-xs font-medium text-gray-500">
                              {employee.detail}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4 text-sm font-semibold text-gray-600">
                        {employee.manager}
                      </td>
                      {employee.prior.map((rating, index) => (
                        <td key={`${employee.id}-${index}`} className="border-r border-gray-100 bg-[#f3f7ff] px-4 py-4">
                          {rating ? (
                            <Badge
                              label={rating === "Unsatisfactory" ? "Unsati" : rating}
                              backgroundColor={generatePastelColor(ratingColorIndex[rating])}
                              textColor=""
                              size="sm"
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-400">-</span>
                          )}
                        </td>
                      ))}
                      <td className="border-r border-gray-100 px-4 py-4">
                        <Badge
                          label={employee.self}
                          backgroundColor={generatePastelColor(ratingColorIndex[employee.self])}
                          textColor=""
                          size="sm"
                        />
                      </td>
                      <td className="border-r border-gray-100 px-4 py-4">
                        <Badge
                          label={employee.managerSuggested}
                          backgroundColor={generatePastelColor(ratingColorIndex[employee.managerSuggested])}
                          textColor=""
                          size="sm"
                        />
                      </td>
                      <td
                        className={`border-x border-blue-300 bg-blue-50 px-3 py-4 ${
                          employee.override ? "bg-amber-50" : ""
                        }`}
                      >
                        <Select
                          options={ratingOptions}
                          value={selectedRating}
                          onChange={(option) =>
                            {
                              setCalibratedRatings((current) => ({
                                ...current,
                                [employee.id]: option.value,
                              }));
                              setOverrideOpen(true);
                            }
                          }
                          className={`relative w-[96px] [&>button]:min-h-[34px] [&>button]:rounded-md [&>button]:border-gray-200 [&>button]:px-2 [&>button]:py-1.5 [&>button]:text-xs [&>button]:font-bold [&>button]:shadow-sm [&>button_span]:font-bold [&>div]:mt-1 [&>div]:w-[130px] [&>div]:rounded-none [&>div]:p-0 [&_li]:rounded-none [&_li]:px-3 [&_li]:py-1.5 ${ratingTextColor[selectedRating.value]}`}
                        />
                        {employee.override && (
                          <span className="mt-1 block text-[10px] font-bold uppercase text-amber-700">
                            + Override
                          </span>
                        )}
                      </td>
                      <td className="border-r border-gray-100 px-3 py-3">
                        <div className="grid h-[52px] w-[52px] grid-cols-3 gap-0.5">
                          {Array.from({ length: 9 }).map((_, index) => {
                            const row = Math.floor(index / 3);
                            const col = index % 3;
                            const active = col === employee.nineBox[0] && row === employee.nineBox[1];

                            return (
                              <span
                                key={index}
                                className={`rounded-[3px] ${
                                  active ? "bg-blue-500 ring-2 ring-white" : "bg-gray-200"
                                }`}
                              />
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {employee.flag && (
                          <Badge
                            label={employee.flag.label}
                            backgroundColor={generatePastelColor(employee.flag.tone === "green" ? 2 : 4)}
                            textColor=""
                            size="sm"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <ManagerOverride open={overrideOpen} onClose={() => setOverrideOpen(false)} />
    </div>
  );
};

export default CalibratorSession;
