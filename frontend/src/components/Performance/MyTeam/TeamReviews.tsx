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
  Unsatisfactory: { bg: "bg-red-500/10", text: "text-red-500", dot: "bg-red-500" },
  Below: { bg: "bg-amber-500/10", text: "text-amber-500", dot: "bg-amber-500" },
  Meets: { bg: "bg-blue-500/10", text: "text-primary", dot: "bg-blue-500" },
  Exceeds: { bg: "bg-emerald-500/10", text: "text-emerald-500", dot: "bg-emerald-500" },
  Outstanding: { bg: "bg-emerald-500/10", text: "text-emerald-500", dot: "bg-emerald-500" },
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
    <main className="min-h-full overflow-y-auto overflow-x-hidden bg-app px-3 py-4 font-sans text-text-title sm:px-4 lg:px-1 lg:py-1">
      <div className="mx-auto grid w-full  min-w-0 gap-4 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="order-2 min-w-0 xl:order-1 xl:sticky  xl:self-start">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <Typography
              variant="caption"
              color="body2"
              className="block text-[11px] font-bold uppercase tracking-wider"
            >
              Reviewing
            </Typography>

            <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-blue-500/10 p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-primary">
                {reportee.initials}
              </span>
              <div className="min-w-0">
                <Typography variant="bodySmall" className="block truncate font-bold">
                  {reportee.name}
                </Typography>
                <Typography variant="caption" color="body2" className="block truncate">
                  {reportee.role}
                </Typography>
              </div>
            </div>

            <Typography
              variant="caption"
              color="body2"
              className="mt-5 block text-[11px] font-bold uppercase tracking-wider"
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
                      isActive ? "bg-blue-500/10 text-primary" : "text-text-body2 hover:bg-slate-500/10"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        section.done
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-500/20 text-text-body2"
                      }`}
                    >
                      {section.done ? <Check className="h-3 w-3" /> : section.number}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{section.label}</span>
                    {section.done && !isActive ? <FileText className="h-3.5 w-3.5 text-text-body2" /> : null}
                  </button>
                );
              })}
            </nav>

            <div className="my-4 h-px bg-border" />
            <Typography
              variant="caption"
              color="body2"
              className="block text-[11px] font-bold uppercase tracking-wider"
            >
              Other reportees
            </Typography>
            <div className="mt-3 grid gap-2 min-[420px]:grid-cols-2 xl:grid-cols-1">
              {otherReportees.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1.5 text-left hover:bg-slate-500/10"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-primary">
                    {member.initials}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-title">
                    {member.name}
                  </span>
                  <span className="hidden text-[11px] font-medium text-text-body2 sm:inline xl:hidden">
                    {member.role}
                  </span>
                  <span className={member.signal === "up" ? "text-emerald-500" : "text-text-body2"}>
                    {member.signal === "up" ? "+" : "-"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="order-1 min-w-0 space-y-4 xl:order-2">
          <header className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Typography
                  variant="caption"
                  color="body2"
                  className="block text-[11px] font-bold uppercase tracking-wider"
                >
                  Section 4 of 7
                </Typography>
                <Typography variant="h2" className="mt-1 text-xl font-bold leading-tight sm:text-2xl">
                  Competencies
                </Typography>
              </div>
              <Button
                type="button"
                variant="soft"
                bgColor="primary"
                className="min-h-9 w-full justify-center rounded-md px-3 text-[12px] font-bold sm:w-auto"
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
                className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6"
              >
                <div className="min-w-0">
                  <Typography variant="bodyMedium" className="font-bold">
                    {competency.title} <span className="text-red-500">*</span>
                  </Typography>
                  <Typography variant="caption" color="body2" className="mt-1 block break-words">
                    {competency.description}
                  </Typography>
                </div>

                <div className="mt-5 grid gap-3 rounded-lg bg-app p-3 border border-border sm:grid-cols-3">
                  {[
                    { label: "Self", value: competency.self },
                    { label: "Peer avg (4)", value: competency.peer },
                    { label: "Last cycle", value: competency.lastCycle },
                  ].map((item) => (
                    <div key={item.label} className="min-w-0">
                      <Typography
                        variant="caption"
                        color="body2"
                        className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider"
                      >
                        {item.label}
                      </Typography>
                      <RatingPill rating={item.value} />
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <Typography variant="caption" color="body2" className="mb-2 block font-semibold">
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
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 font-bold"
                              : "border-border bg-card text-text-title hover:border-primary/50"
                          }`}
                        >
                          <span className="block text-sm font-semibold">{rating}</span>
                          <span className="block text-[11px] font-medium text-text-body2">
                            {ratingScore[rating]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="mt-5 block">
                  <Typography variant="caption" color="body2" className="mb-2 block font-semibold">
                    Manager comment
                  </Typography>
                  <textarea
                    rows={3}
                    defaultValue={competency.comment ?? ""}
                    className="min-h-[74px] w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed text-text-title placeholder-text-body2 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </label>
              </article>
            );
          })}

          <footer className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <Button
              type="button"
              variant="outline"
              bgColor="text"
              className="h-10 w-full justify-center rounded-lg px-4 lg:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-center lg:justify-end">
              <Button
                type="button"
                variant="outline"
                bgColor="error"
                className="h-10 w-full justify-center rounded-lg px-4 lg:w-auto"
              >
                Send back to Pallavi
              </Button>
              <Button
                type="button"
                variant="outline"
                bgColor="text"
                className="h-10 w-full justify-center rounded-lg px-4 lg:w-auto"
              >
                Save Draft
              </Button>
              <Button
                type="button"
                variant="contain"
                bgColor="primary"
                className="h-10 w-full justify-center rounded-lg px-4 sm:col-span-2 lg:w-auto"
                onClick={() => navigate("/webapp/performance-app/team-reviews/team-pre-release-preview")}
              >
                Next: Achievements
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </footer>
        </section>

        <aside className="order-3 min-w-0 space-y-4 xl:order-3 xl:col-start-2 2xl:col-start-auto 2xl:sticky  2xl:self-start">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-text-body2" />
              <Typography variant="bodySmall" className="font-bold">
                Self-Review · Design Craft
              </Typography>
            </div>
            <p className="text-sm italic leading-relaxed text-text-body2">
              "Pushed prototyping fidelity significantly this cycle. Built two clickable prototypes that became the basis for spec; saved the team an estimated 3 weeks vs. waterfall handoffs."
            </p>
            <div className="mt-3">
              <RatingPill rating="Outstanding" />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex min-w-0 flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 text-text-body2" />
                <Typography variant="bodySmall" className="font-bold">
                  Peer aggregate (4 of 4)
                </Typography>
              </div>
              <RatingPill rating="Outstanding" />
            </div>
            <Typography variant="caption" color="body2" className="block font-semibold">
              Avg score
            </Typography>
            <Typography variant="caption" color="body2" className="mt-3 block font-semibold">
              Top comment
            </Typography>
            <p className="mt-1 text-sm italic leading-relaxed text-text-body2">
              "Her craft sets a bar for the whole team. Best designer I've worked with at PW."
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Typography variant="bodySmall" className="font-bold">
                AI bias check
              </Typography>
            </div>
            <Typography variant="caption" color="body2" className="block leading-relaxed">
              No flagged language detected. Self + peer + your ratings are tightly aligned (var = 0.4 on 5-pt).
            </Typography>
          </section>
        </aside>
      </div>
    </main>
  );
};

export default TeamReviews;
