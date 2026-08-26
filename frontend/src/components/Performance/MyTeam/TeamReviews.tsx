import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";

type Rating = "Unsatisfactory" | "Below" | "Meets" | "Exceeds" | "Outstanding";

type ReviewSection = {
  id: string;
  label: string;
  done?: boolean;
  number?: number;
};

type Reportee = {
  id: string;
  initials: string;
  name: string;
  role: string;
  signal: "up" | "flat";
};

type Competency = {
  id: string;
  title: string;
  description: string;
  self: Rating;
  peer: Rating;
  lastCycle: Rating;
  selected: Rating;
  comment?: string;
};

const reportee = {
  initials: "PM",
  name: "Pallavi Mahar",
  role: "Sr. Product Designer · 3.2y",
};

const sections: ReviewSection[] = [
  { id: "self-review", label: "Self-Review", done: true },
  { id: "peer-aggregate", label: "Peer Aggregate", done: true },
  { id: "goals", label: "Goals & KRs", done: true },
  { id: "competencies", label: "Competencies", done: true },
  { id: "achievements", label: "Achievements Review", number: 5 },
  { id: "manager-comments", label: "Manager Comments", number: 6 },
  { id: "recommendation", label: "Recommendation", number: 7 },
];

const otherReportees: Reportee[] = [
  { id: "ki", initials: "KI", name: "Karthik Iyer", role: "Engineering", signal: "up" },
  { id: "ms", initials: "MS", name: "Mohit Sinha", role: "Design", signal: "flat" },
  { id: "rb", initials: "RB", name: "Riya Banerjee", role: "Design", signal: "up" },
  { id: "ab", initials: "AB", name: "Aman Bhatt", role: "Engineering", signal: "flat" },
];

const competencies: Competency[] = [
  {
    id: "design-craft",
    title: "Design Craft",
    description: "Visual, interaction and prototyping quality.",
    self: "Outstanding",
    peer: "Outstanding",
    lastCycle: "Exceeds",
    selected: "Outstanding",
    comment:
      "Pallavi's craft work on Oxygen 2.0 is best-in-class. Her prototyping for the calibration screen was the artifact the team rallied around.",
  },
  {
    id: "systems-thinking",
    title: "Systems Thinking",
    description: "Designs that scale across products and audiences.",
    self: "Exceeds",
    peer: "Exceeds",
    lastCycle: "Exceeds",
    selected: "Exceeds",
  },
  {
    id: "cross-functional",
    title: "Cross-functional Partnership",
    description: "Influence with PM, Eng, Research.",
    self: "Outstanding",
    peer: "Outstanding",
    lastCycle: "Exceeds",
    selected: "Exceeds",
  },
  {
    id: "leadership",
    title: "Leadership & Mentorship",
    description: "Coaches; sets direction; raises team craft.",
    self: "Meets",
    peer: "Exceeds",
    lastCycle: "Exceeds",
    selected: "Exceeds",
  },
];

const ratingOptions: Rating[] = [
  "Unsatisfactory",
  "Below",
  "Meets",
  "Exceeds",
  "Outstanding",
];

const ratingScore: Record<Rating, string> = {
  Unsatisfactory: "1 / 5",
  Below: "2 / 5",
  Meets: "3 / 5",
  Exceeds: "4 / 5",
  Outstanding: "5 / 5",
};

const ratingTone: Record<Rating, { bg: string; text: string; dot: string }> = {
  Unsatisfactory: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  Below: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  Meets: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  Exceeds: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  Outstanding: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

const RatingPill = ({ rating }: { rating: Rating }) => {
  const tone = ratingTone[rating];

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold ${tone.bg} ${tone.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-md ${tone.dot}`} />
      {rating}
    </span>
  );
};

const TeamReviews: React.FC = () => {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState<Record<string, Rating>>(
    () =>
      competencies.reduce<Record<string, Rating>>((acc, item) => {
        acc[item.id] = item.selected;
        return acc;
      }, {}),
  );

  return (
    <main className="min-h-full overflow-y-auto overflow-x-hidden bg-[#f4f7fb] px-3 py-4 font-sans text-gray-900 sm:px-4 lg:px-1 lg:py-1">
      <div className="mx-auto grid w-full  min-w-0 gap-4 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="order-2 min-w-0 xl:order-1 xl:sticky  xl:self-start">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <Typography
              variant="caption"
              className="block text-[11px] font-bold uppercase tracking-wider text-gray-400"
            >
              Reviewing
            </Typography>

            <div className="mt-3 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                {reportee.initials}
              </span>
              <div className="min-w-0">
                <Typography variant="bodySmall" className="block truncate font-bold text-gray-900">
                  {reportee.name}
                </Typography>
                <Typography variant="caption" className="block truncate text-gray-500">
                  {reportee.role}
                </Typography>
              </div>
            </div>

            <Typography
              variant="caption"
              className="mt-5 block text-[11px] font-bold uppercase tracking-wider text-gray-400"
            >
              Sections
            </Typography>
            <nav className="mt-2 grid gap-1 sm:grid-cols-2 xl:grid-cols-1" aria-label="Review sections">
              {sections.map((section) => {
                const isActive = section.id === "competencies";

                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-[13px] font-semibold transition ${
                      isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        section.done
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {section.done ? <Check className="h-3 w-3" /> : section.number}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{section.label}</span>
                    {section.done && !isActive ? <FileText className="h-3.5 w-3.5 text-gray-400" /> : null}
                  </button>
                );
              })}
            </nav>

            <div className="my-4 h-px bg-gray-100" />
            <Typography
              variant="caption"
              className="block text-[11px] font-bold uppercase tracking-wider text-gray-400"
            >
              Other reportees
            </Typography>
            <div className="mt-3 grid gap-2 min-[420px]:grid-cols-2 xl:grid-cols-1">
              {otherReportees.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1.5 text-left hover:bg-gray-50"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600">
                    {member.initials}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-gray-700">
                    {member.name}
                  </span>
                  <span className="hidden text-[11px] font-medium text-gray-400 sm:inline xl:hidden">
                    {member.role}
                  </span>
                  <span className={member.signal === "up" ? "text-emerald-500" : "text-gray-400"}>
                    {member.signal === "up" ? "+" : "-"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="order-1 min-w-0 space-y-4 xl:order-2">
          <header className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Typography
                  variant="caption"
                  className="block text-[11px] font-bold uppercase tracking-wider text-gray-500"
                >
                  Section 4 of 7
                </Typography>
                <Typography variant="h2" className="mt-1 text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                  Competencies
                </Typography>
              </div>
              <Button
                type="button"
                variant="soft"
                bgColor="primary"
                className="min-h-9 w-full justify-center rounded-md bg-purple-50 px-3 text-[12px] font-bold text-purple-700 hover:bg-purple-100 sm:w-auto"
              >
                <Sparkles className="h-4 w-4" />
                AI summary of self+peers
              </Button>
            </div>
          </header>

          {competencies.map((competency) => {
            const selectedRating = ratings[competency.id];

            return (
              <article
                key={competency.id}
                className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
              >
                <div className="min-w-0">
                  <Typography variant="bodyMedium" className="font-bold text-gray-900">
                    {competency.title} <span className="text-red-500">*</span>
                  </Typography>
                  <Typography variant="caption" className="mt-1 block break-words text-gray-500">
                    {competency.description}
                  </Typography>
                </div>

                <div className="mt-5 grid gap-3 rounded-lg bg-[#f4f7fb] p-3 sm:grid-cols-3">
                  {[
                    { label: "Self", value: competency.self },
                    { label: "Peer avg (4)", value: competency.peer },
                    { label: "Last cycle", value: competency.lastCycle },
                  ].map((item) => (
                    <div key={item.label} className="min-w-0">
                      <Typography
                        variant="caption"
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-gray-500"
                      >
                        {item.label}
                      </Typography>
                      <RatingPill rating={item.value} />
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <Typography variant="caption" className="mb-2 block font-semibold text-gray-700">
                    Your rating
                  </Typography>
                  <div className="grid gap-2 min-[420px]:grid-cols-2 md:grid-cols-3 min-[1500px]:grid-cols-5">
                    {ratingOptions.map((rating) => {
                      const isSelected = selectedRating === rating;

                      return (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setRatings((current) => ({ ...current, [competency.id]: rating }))}
                          className={`min-h-[54px] rounded-lg border px-3 py-2 text-center transition ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                          }`}
                        >
                          <span className="block text-sm font-semibold">{rating}</span>
                          <span className="block text-[11px] font-medium text-gray-500">
                            {ratingScore[rating]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="mt-5 block">
                  <Typography variant="caption" className="mb-2 block font-semibold text-gray-700">
                    Manager comment
                  </Typography>
                  <textarea
                    rows={3}
                    defaultValue={competency.comment ?? ""}
                    className="min-h-[74px] w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </article>
            );
          })}

          <footer className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <Button
              type="button"
              variant="outline"
              bgColor="text"
              className="h-10 w-full justify-center rounded-lg border-gray-200 bg-white px-4 text-gray-700 lg:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-center lg:justify-end">
              <Button
                type="button"
                variant="outline"
                bgColor="error"
                className="h-10 w-full justify-center rounded-lg border-red-300 bg-white px-4 text-red-600 hover:bg-red-50 lg:w-auto"
              >
                Send back to Pallavi
              </Button>
              <Button
                type="button"
                variant="outline"
                bgColor="text"
                className="h-10 w-full justify-center rounded-lg border-gray-200 bg-white px-4 text-gray-700 lg:w-auto"
              >
                Save Draft
              </Button>
              <Button
                type="button"
                variant="contain"
                bgColor="primary"
                className="h-10 w-full justify-center rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 sm:col-span-2 lg:w-auto"
                onClick={() => navigate("/webapp/performance-app/team-reviews/team-pre-release-preview")}
              >
                Next: Achievements
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </footer>
        </section>

        <aside className="order-3 min-w-0 space-y-4 xl:order-3 xl:col-start-2 2xl:col-start-auto 2xl:sticky  2xl:self-start">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-gray-500" />
              <Typography variant="bodySmall" className="font-bold text-gray-900">
                Self-Review · Design Craft
              </Typography>
            </div>
            <p className="text-sm italic leading-relaxed text-gray-600">
              "Pushed prototyping fidelity significantly this cycle. Built two clickable prototypes that became the basis for spec; saved the team an estimated 3 weeks vs. waterfall handoffs."
            </p>
            <div className="mt-3">
              <RatingPill rating="Outstanding" />
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex min-w-0 flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <Typography variant="bodySmall" className="font-bold text-gray-900">
                  Peer aggregate (4 of 4)
                </Typography>
              </div>
              <RatingPill rating="Outstanding" />
            </div>
            <Typography variant="caption" className="block font-semibold text-gray-500">
              Avg score
            </Typography>
            <Typography variant="caption" className="mt-3 block font-semibold text-gray-500">
              Top comment
            </Typography>
            <p className="mt-1 text-sm italic leading-relaxed text-gray-600">
              "Her craft sets a bar for the whole team. Best designer I've worked with at PW."
            </p>
          </section>

       
        </aside>
      </div>
    </main>
  );
};

export default TeamReviews;
