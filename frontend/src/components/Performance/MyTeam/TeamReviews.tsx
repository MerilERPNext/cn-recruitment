import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  MessageSquareText,
  Sparkles,
  Save,
  X,
  Award,
  Star,
  UserCheck,
} from "lucide-react";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";

type Rating = "Unsatisfactory" | "Below" | "Meets" | "Exceeds" | "Outstanding";

type ReviewSection = {
  id: string;
  label: string;
  done?: boolean;
  number: number;
};

type Reportee = {
  id: string;
  initials: string;
  name: string;
  role: string;
  signal: "up" | "flat";
  selfQuote: string;
  peerComment: string;
  peerCount: number;
  peerRating: Rating;
  selfRating: Rating;
  lastCycleRating: Rating;
  competencies: {
    id: string;
    title: string;
    description: string;
    self: Rating;
    peer: Rating;
    lastCycle: Rating;
    defaultComment: string;
  }[];
  goals: {
    title: string;
    weightage: number;
    selfScore: string;
    status: string;
  }[];
  achievements: string[];
};

const sections: ReviewSection[] = [
  { id: "self-review", label: "Self-Review", done: true, number: 1 },
  { id: "peer-aggregate", label: "Peer Aggregate", done: true, number: 2 },
  { id: "goals", label: "Goals & KRs", done: true, number: 3 },
  { id: "competencies", label: "Competencies", done: true, number: 4 },
  { id: "achievements", label: "Achievements Review", number: 5 },
  { id: "manager-comments", label: "Manager Comments", number: 6 },
  { id: "recommendation", label: "Recommendation", number: 7 },
];

const reporteesData: Reportee[] = [
  {
    id: "pm",
    initials: "PM",
    name: "Pallavi Mahar",
    role: "Sr. Product Designer · 3.2y",
    signal: "up",
    selfQuote:
      "Pushed prototyping fidelity significantly this cycle. Built two clickable prototypes that became the basis for spec; saved the team an estimated 3 weeks vs. waterfall handoffs.",
    peerComment:
      "Her craft sets a bar for the whole team. Best designer I've worked with at PW.",
    peerCount: 4,
    peerRating: "Outstanding",
    selfRating: "Outstanding",
    lastCycleRating: "Exceeds",
    competencies: [
      {
        id: "design-craft",
        title: "Design Craft",
        description: "Visual, interaction and prototyping quality.",
        self: "Outstanding",
        peer: "Outstanding",
        lastCycle: "Exceeds",
        defaultComment:
          "Pallavi's craft work on Oxygen 2.0 is best-in-class. Her prototyping for the calibration screen was the artifact the team rallied around.",
      },
      {
        id: "systems-thinking",
        title: "Systems Thinking",
        description: "Designs that scale across products and audiences.",
        self: "Exceeds",
        peer: "Exceeds",
        lastCycle: "Exceeds",
        defaultComment:
          "Demonstrated strong systemic consistency across all responsive breakpoints and theme variables.",
      },
      {
        id: "cross-functional",
        title: "Cross-functional Partnership",
        description: "Influence with PM, Eng, Research.",
        self: "Outstanding",
        peer: "Outstanding",
        lastCycle: "Exceeds",
        defaultComment:
          "Maintains exceptional communication with engineering teams during handover.",
      },
      {
        id: "leadership",
        title: "Leadership & Mentorship",
        description: "Coaches; sets direction; raises team craft.",
        self: "Meets",
        peer: "Exceeds",
        lastCycle: "Exceeds",
        defaultComment:
          "Actively mentors junior designers and leads internal design critiques.",
      },
    ],
    goals: [
      { title: "Oxygen 2.0 Design System Migration", weightage: 40, selfScore: "100%", status: "Exceeds" },
      { title: "Mobile Candidate Portal Redesign", weightage: 30, selfScore: "95%", status: "Meets" },
      { title: "User Accessibility Audit & Guidelines", weightage: 30, selfScore: "100%", status: "Outstanding" },
    ],
    achievements: [
      "Led design architecture for Oxygen 2.0 component library.",
      "Reduced design-to-development handoff time by 3 weeks.",
    ],
  },
  {
    id: "ki",
    initials: "KI",
    name: "Karthik Iyer",
    role: "Engineering Lead · 4.1y",
    signal: "up",
    selfQuote:
      "Architected the new microservices scaling plan, reducing API response times by 45% and eliminating memory leaks in high-load scenarios.",
    peerComment:
      "Karthik's technical leadership kept the backend team aligned. Always ready to jump in and solve critical production issues.",
    peerCount: 5,
    peerRating: "Outstanding",
    selfRating: "Exceeds",
    lastCycleRating: "Exceeds",
    competencies: [
      {
        id: "tech-architecture",
        title: "Technical Architecture",
        description: "System design, scalability, and code quality.",
        self: "Outstanding",
        peer: "Outstanding",
        lastCycle: "Exceeds",
        defaultComment:
          "Exceptional architectural clarity. Handled complex database indexing and caching optimization seamlessly.",
      },
      {
        id: "execution-speed",
        title: "Execution & Delivery",
        description: "Delivering projects on schedule with high reliability.",
        self: "Exceeds",
        peer: "Exceeds",
        lastCycle: "Exceeds",
        defaultComment:
          "Consistently delivers complex backend modules ahead of cycle milestones.",
      },
      {
        id: "team-mentorship",
        title: "Engineering Mentorship",
        description: "Guiding junior engineers and raising code standards.",
        self: "Exceeds",
        peer: "Outstanding",
        lastCycle: "Meets",
        defaultComment:
          "Conducted 10+ tech talks and pair programming sessions for backend devs.",
      },
    ],
    goals: [
      { title: "API Response Time Optimization (<200ms)", weightage: 50, selfScore: "100%", status: "Outstanding" },
      { title: "Redis Caching Layer Deployment", weightage: 50, selfScore: "90%", status: "Exceeds" },
    ],
    achievements: [
      "Reduced p99 database response latency from 450ms to 120ms.",
      "Zero high-severity outages during peak recruitment traffic.",
    ],
  },
  {
    id: "ms",
    initials: "MS",
    name: "Mohit Sinha",
    role: "Lead UI/UX Designer · 2.5y",
    signal: "flat",
    selfQuote:
      "Redesigned the onboarding flow resulting in a 28% increase in first-week activation. Simplified multi-step user registration.",
    peerComment:
      "Mohit's user research insights were spot-on. His design system contributions saved frontend dev time significantly.",
    peerCount: 3,
    peerRating: "Exceeds",
    selfRating: "Exceeds",
    lastCycleRating: "Meets",
    competencies: [
      {
        id: "user-research",
        title: "User Research & Discovery",
        description: "Qualitative research, user interviews, and validation.",
        self: "Outstanding",
        peer: "Exceeds",
        lastCycle: "Meets",
        defaultComment:
          "Conducted thorough user interviews that uncovered core onboarding bottlenecks.",
      },
      {
        id: "interaction-design",
        title: "Interaction & UI Design",
        description: "Wireframing, UI polished states, and micro-interactions.",
        self: "Exceeds",
        peer: "Exceeds",
        lastCycle: "Exceeds",
        defaultComment:
          "Great visual polish across recruitment dashboard workflows.",
      },
    ],
    goals: [
      { title: "Onboarding Conversion Rate Boost", weightage: 60, selfScore: "100%", status: "Exceeds" },
      { title: "UX Benchmark & Usability Testing", weightage: 40, selfScore: "85%", status: "Meets" },
    ],
    achievements: [
      "Increased user onboarding completion rate by 28%.",
    ],
  },
  {
    id: "rb",
    initials: "RB",
    name: "Riya Banerjee",
    role: "Product Designer · 1.8y",
    signal: "up",
    selfQuote:
      "Created 15+ high-conversion landing page layouts and established design tokens for mobile responsiveness.",
    peerComment:
      "Riya is super fast and detail-oriented. Great collaborator across product and engineering.",
    peerCount: 4,
    peerRating: "Exceeds",
    selfRating: "Exceeds",
    lastCycleRating: "Meets",
    competencies: [
      {
        id: "visual-design",
        title: "Visual Design & Assets",
        description: "Graphic consistency, layout, and visual fidelity.",
        self: "Exceeds",
        peer: "Exceeds",
        lastCycle: "Meets",
        defaultComment:
          "Clean visual layouts with strong attention to typography and spacing.",
      },
    ],
    goals: [
      { title: "Responsive Layout Library", weightage: 50, selfScore: "95%", status: "Exceeds" },
      { title: "Design Asset Repository Setup", weightage: 50, selfScore: "90%", status: "Meets" },
    ],
    achievements: [
      "Created unified design asset library for mobile & desktop.",
    ],
  },
  {
    id: "ab",
    initials: "AB",
    name: "Aman Bhatt",
    role: "Senior Frontend Eng · 3.0y",
    signal: "flat",
    selfQuote:
      "Migrated legacy React components to TypeScript and optimized bundle size by 35%.",
    peerComment:
      "Aman delivers clean code and unit tests. Highly reliable team player.",
    peerCount: 3,
    peerRating: "Meets",
    selfRating: "Exceeds",
    lastCycleRating: "Meets",
    competencies: [
      {
        id: "frontend-perf",
        title: "Frontend Performance",
        description: "Code splitting, bundle reduction, and render efficiency.",
        self: "Exceeds",
        peer: "Meets",
        lastCycle: "Meets",
        defaultComment:
          "Solid frontend refactoring work on Performance review screens.",
      },
    ],
    goals: [
      { title: "TypeScript Migration & Strict Mode", weightage: 50, selfScore: "90%", status: "Meets" },
      { title: "Bundle Size Reduction by 30%", weightage: 50, selfScore: "100%", status: "Exceeds" },
    ],
    achievements: [
      "Reduced main bundle size by 35%.",
    ],
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
  const tone = ratingTone[rating] || ratingTone["Meets"];

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
  const [selectedReporteeId, setSelectedReporteeId] = useState<string>("pm");
  const [activeSectionId, setActiveSectionId] = useState<string>("competencies");

  // Ratings state per reportee & competency
  const [ratingsState, setRatingsState] = useState<Record<string, Record<string, Rating>>>(() => {
    const initial: Record<string, Record<string, Rating>> = {};
    reporteesData.forEach((rep) => {
      initial[rep.id] = {};
      rep.competencies.forEach((comp) => {
        initial[rep.id][comp.id] = comp.self;
      });
    });
    return initial;
  });

  // Comments state per reportee & competency
  const [commentsState, setCommentsState] = useState<Record<string, Record<string, string>>>(() => {
    const initial: Record<string, Record<string, string>> = {};
    reporteesData.forEach((rep) => {
      initial[rep.id] = {};
      rep.competencies.forEach((comp) => {
        initial[rep.id][comp.id] = comp.defaultComment || "";
      });
    });
    return initial;
  });

  // Manager overall comments and recommendation state per reportee
  const [managerSummaryState, setManagerSummaryState] = useState<Record<string, { summary: string; recommendation: string }>>({
    pm: { summary: "Pallavi is an exceptional product designer.", recommendation: "Exceeds Expectation - Salary Revision Recommended" },
    ki: { summary: "Karthik demonstrated high technical mastery.", recommendation: "Promotion to Staff Engineer Recommended" },
    ms: { summary: "Mohit delivered strong UX research outcomes.", recommendation: "Meets Expectations" },
    rb: { summary: "Riya has shown fast growth and high ownership.", recommendation: "Exceeds Expectations" },
    ab: { summary: "Aman executed frontend refactoring reliably.", recommendation: "Meets Expectations" },
  });

  const [sendBackModalOpen, setSendBackModalOpen] = useState(false);
  const [sendBackReason, setSendBackReason] = useState("");

  const currentReportee = reporteesData.find((r) => r.id === selectedReporteeId) || reporteesData[0];
  const activeSectionIndex = sections.findIndex((s) => s.id === activeSectionId);
  const currentSection = sections[activeSectionIndex] || sections[3];

  const handleRatingChange = (compKey: string, rating: Rating) => {
    setRatingsState((prev) => ({
      ...prev,
      [selectedReporteeId]: {
        ...(prev[selectedReporteeId] || {}),
        [compKey]: rating,
      },
    }));
  };

  const handleCommentChange = (compKey: string, commentText: string) => {
    setCommentsState((prev) => ({
      ...prev,
      [selectedReporteeId]: {
        ...(prev[selectedReporteeId] || {}),
        [compKey]: commentText,
      },
    }));
  };

  const handleSaveDraft = () => {
    toast.success(`Draft saved successfully for ${currentReportee.name}!`);
  };

  const handleConfirmSendBack = () => {
    if (!sendBackReason.trim()) {
      toast.error("Please enter a reason for sending back the review.");
      return;
    }
    toast.success(`Review sent back to ${currentReportee.name} for revision.`);
    setSendBackModalOpen(false);
    setSendBackReason("");
  };

  const handleNextSection = () => {
    if (activeSectionIndex < sections.length - 1) {
      setActiveSectionId(sections[activeSectionIndex + 1].id);
    } else {
      toast.success("Review finalized! Proceeding to preview & sign-off.");
      navigate("/webapp/performance-app/team-reviews/team-pre-release-preview");
    }
  };

  const handlePrevSection = () => {
    if (activeSectionIndex > 0) {
      setActiveSectionId(sections[activeSectionIndex - 1].id);
    } else {
      navigate("/webapp/performance-app/team-overview");
    }
  };

  return (
    <main className="min-h-full overflow-y-auto overflow-x-hidden bg-[#f4f7fb] px-3 py-4 font-sans text-gray-900 sm:px-4 lg:px-1 lg:py-1">
      <div className="mx-auto grid w-full min-w-0 gap-4 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* Left Sidebar */}
        <aside className="order-2 min-w-0 xl:order-1 xl:sticky xl:self-start">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <Typography
              variant="caption"
              className="block text-[11px] font-bold uppercase tracking-wider text-gray-400"
            >
              Reviewing
            </Typography>

            <div className="mt-3 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 shadow-xs">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-xs">
                {currentReportee.initials}
              </span>
              <div className="min-w-0">
                <Typography variant="bodySmall" className="block truncate font-bold text-gray-900">
                  {currentReportee.name}
                </Typography>
                <Typography variant="caption" className="block truncate text-gray-500">
                  {currentReportee.role}
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
                const isActive = section.id === activeSectionId;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                    className={`flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-[13px] font-semibold transition cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        isActive
                          ? "bg-white text-blue-600"
                          : section.done
                          ? "bg-emerald-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {section.done && !isActive ? <Check className="h-3 w-3" /> : section.number}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{section.label}</span>
                    {section.done && !isActive ? (
                      <FileText className="h-3.5 w-3.5 text-gray-400" />
                    ) : null}
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
              {reporteesData.map((member) => {
                const isSelected = member.id === selectedReporteeId;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedReporteeId(member.id)}
                    className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {member.initials}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-gray-800">
                      {member.name}
                    </span>
                    <span
                      className={
                        member.signal === "up"
                          ? "text-emerald-600 font-bold"
                          : "text-gray-400"
                      }
                    >
                      {member.signal === "up" ? "+" : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        {/* Main Section Content */}
        <section className="order-1 min-w-0 space-y-4 xl:order-2">
          <header className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Typography
                  variant="caption"
                  className="block text-[11px] font-bold uppercase tracking-wider text-blue-600"
                >
                  Section {currentSection.number} of {sections.length}
                </Typography>
                <Typography variant="h2" className="mt-1 text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                  {currentSection.label} — {currentReportee.name}
                </Typography>
              </div>
              <Button
                type="button"
                variant="soft"
                bgColor="primary"
                onClick={() => toast.success("AI Insights generated for " + currentReportee.name)}
                className="min-h-9 w-full justify-center rounded-md bg-purple-50 px-3 text-[12px] font-bold text-purple-700 hover:bg-purple-100 sm:w-auto cursor-pointer"
              >
                <Sparkles className="h-4 w-4 mr-1 text-purple-600" />
                AI Summary & Insights
              </Button>
            </div>
          </header>

          {/* Section 1: Self-Review */}
          {activeSectionId === "self-review" && (
            <article className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-base">
                <UserCheck className="w-5 h-5" />
                <span>Employee Self-Assessment Summary</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed bg-blue-50/60 border border-blue-100 p-4 rounded-xl italic">
                "{currentReportee.selfQuote}"
              </p>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-500">Employee Self Rating:</span>
                <RatingPill rating={currentReportee.selfRating} />
              </div>
            </article>
          )}

          {/* Section 2: Peer Aggregate */}
          {activeSectionId === "peer-aggregate" && (
            <article className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-600 font-bold text-base">
                  <Star className="w-5 h-5" />
                  <span>Peer Feedback Aggregate ({currentReportee.peerCount} Peers Reviewed)</span>
                </div>
                <RatingPill rating={currentReportee.peerRating} />
              </div>
              <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl space-y-2">
                <Typography variant="caption" className="font-bold text-purple-900 block">
                  Top Peer Quote
                </Typography>
                <p className="text-sm text-purple-950 italic leading-relaxed">
                  "{currentReportee.peerComment}"
                </p>
              </div>
            </article>
          )}

          {/* Section 3: Goals & KRs */}
          {activeSectionId === "goals" && (
            <article className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-base mb-2">
                <Award className="w-5 h-5" />
                <span>Goals & Key Results Evaluation</span>
              </div>
              <div className="space-y-3">
                {currentReportee.goals.map((goal, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <Typography variant="bodySmall" className="font-bold text-gray-900">
                        {goal.title}
                      </Typography>
                      <Typography variant="caption" className="text-gray-500 block">
                        Weightage: {goal.weightage}% · Self Achievement Score: {goal.selfScore}
                      </Typography>
                    </div>
                    <RatingPill rating={goal.status as Rating} />
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* Section 4: Competencies (Main Evaluation Grid) */}
          {activeSectionId === "competencies" && (
            <>
              {currentReportee.competencies.map((competency) => {
                const selectedRating =
                  ratingsState[selectedReporteeId]?.[competency.id] || competency.self;
                const currentComment =
                  commentsState[selectedReporteeId]?.[competency.id] ?? competency.defaultComment;

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
                        { label: `Peer avg (${currentReportee.peerCount})`, value: competency.peer },
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
                              onClick={() => handleRatingChange(competency.id, rating)}
                              className={`min-h-[54px] rounded-lg border px-3 py-2 text-center transition cursor-pointer ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500 shadow-xs"
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
                        value={currentComment}
                        onChange={(e) => handleCommentChange(competency.id, e.target.value)}
                        placeholder="Enter manager assessment comment..."
                        className="min-h-[74px] w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed text-gray-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </article>
                );
              })}
            </>
          )}

          {/* Section 5: Achievements Review */}
          {activeSectionId === "achievements" && (
            <article className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-amber-600 font-bold text-base">
                <Award className="w-5 h-5" />
                <span>Key Accomplishments & Impact</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                {currentReportee.achievements.map((ach, idx) => (
                  <li key={idx} className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                    {ach}
                  </li>
                ))}
              </ul>
            </article>
          )}

          {/* Section 6: Manager Comments */}
          {activeSectionId === "manager-comments" && (
            <article className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <Typography variant="h4" className="font-bold text-gray-900">
                Overall Manager Assessment & Notes
              </Typography>
              <textarea
                rows={4}
                value={managerSummaryState[selectedReporteeId]?.summary || ""}
                onChange={(e) =>
                  setManagerSummaryState((prev) => ({
                    ...prev,
                    [selectedReporteeId]: {
                      ...(prev[selectedReporteeId] || { recommendation: "Meets Expectations" }),
                      summary: e.target.value,
                    },
                  }))
                }
                placeholder="Enter overall summary feedback for this employee..."
                className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </article>
          )}

          {/* Section 7: Recommendation */}
          {activeSectionId === "recommendation" && (
            <article className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <Typography variant="h4" className="font-bold text-gray-900">
                Final Appraisal Recommendation
              </Typography>
              <div>
                <Typography variant="caption" className="font-semibold text-gray-700 block mb-2">
                  Recommendation Type
                </Typography>
                <select
                  value={managerSummaryState[selectedReporteeId]?.recommendation || "Meets Expectations"}
                  onChange={(e) =>
                    setManagerSummaryState((prev) => ({
                      ...prev,
                      [selectedReporteeId]: {
                        ...(prev[selectedReporteeId] || { summary: "" }),
                        recommendation: e.target.value,
                      },
                    }))
                  }
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm text-gray-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="Meets Expectations">Meets Expectations</option>
                  <option value="Exceeds Expectation - Salary Revision Recommended">
                    Exceeds Expectation - Salary Revision Recommended
                  </option>
                  <option value="Promotion to Staff Engineer Recommended">
                    Promotion to Next Level Recommended
                  </option>
                  <option value="Needs Improvement Plan">Needs Improvement Plan (PIP)</option>
                </select>
              </div>
            </article>
          )}

          {/* Footer Actions Bar */}
          <footer className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <Button
              type="button"
              variant="outline"
              bgColor="text"
              onClick={handlePrevSection}
              className="h-10 w-full justify-center rounded-lg border-gray-200 bg-white px-4 text-gray-700 lg:w-auto cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-center lg:justify-end">
              <Button
                type="button"
                variant="outline"
                bgColor="error"
                onClick={() => setSendBackModalOpen(true)}
                className="h-10 w-full justify-center rounded-lg border-red-300 bg-white px-4 text-red-600 hover:bg-red-50 lg:w-auto cursor-pointer"
              >
                Send back to {currentReportee.name.split(" ")[0]}
              </Button>
              <Button
                type="button"
                variant="outline"
                bgColor="text"
                onClick={handleSaveDraft}
                className="h-10 w-full justify-center rounded-lg border-gray-200 bg-white px-4 text-gray-700 lg:w-auto cursor-pointer"
              >
                <Save className="h-4 w-4 mr-1 text-gray-500" />
                Save Draft
              </Button>
              <Button
                type="button"
                variant="contain"
                bgColor="primary"
                className="h-10 w-full justify-center rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 sm:col-span-2 lg:w-auto cursor-pointer font-semibold"
                onClick={handleNextSection}
              >
                {activeSectionIndex < sections.length - 1
                  ? `Next: ${sections[activeSectionIndex + 1].label}`
                  : "Finalize & Preview"}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </footer>
        </section>

        {/* Right Sidebar Context Panels */}
        <aside className="order-3 min-w-0 space-y-4 xl:order-3 xl:col-start-2 2xl:col-start-auto 2xl:sticky 2xl:self-start">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-gray-500" />
              <Typography variant="bodySmall" className="font-bold text-gray-900">
                Self-Review · {currentReportee.name.split(" ")[0]}
              </Typography>
            </div>
            <p className="text-sm italic leading-relaxed text-gray-600">
              "{currentReportee.selfQuote}"
            </p>
            <div className="mt-3">
              <RatingPill rating={currentReportee.selfRating} />
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex min-w-0 flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <Typography variant="bodySmall" className="font-bold text-gray-900">
                  Peer aggregate ({currentReportee.peerCount} of {currentReportee.peerCount})
                </Typography>
              </div>
              <RatingPill rating={currentReportee.peerRating} />
            </div>
            <Typography variant="caption" className="block font-semibold text-gray-500">
              Top comment
            </Typography>
            <p className="mt-1 text-sm italic leading-relaxed text-gray-600">
              "{currentReportee.peerComment}"
            </p>
          </section>
        </aside>
      </div>

      {/* Send Back Reason Modal */}
      {sendBackModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSendBackModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <Typography variant="h4" className="font-bold text-gray-900">
                Send Back Review to {currentReportee.name}
              </Typography>
              <button
                onClick={() => setSendBackModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Typography variant="caption" className="text-gray-600 block">
              Please state the reason for requesting revision from {currentReportee.name}:
            </Typography>
            <textarea
              rows={3}
              value={sendBackReason}
              onChange={(e) => setSendBackReason(e.target.value)}
              placeholder="e.g. Please clarify Key Result achievements for Q3..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-800 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSendBackModalOpen(false)}
                className="px-4"
              >
                Cancel
              </Button>
              <Button
                variant="contain"
                bgColor="error"
                size="sm"
                onClick={handleConfirmSendBack}
                className="px-4 font-semibold"
              >
                Send Back
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default TeamReviews;

