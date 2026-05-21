import React from "react";
import {
  AlertCircle,
  ChevronRight,
  Clock,
  CornerDownRight,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Badge, { type BadgeVariant } from "../../shared/Badge";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import { useScreenSize } from "../../../hooks/useScreenSize";

type GoalStatus = "On-track" | "At-risk" | "Off-track";

interface ApprovalGoal {
  id: string;
  owner: string;
  initials: string;
  title: string;
  submittedAgo: string;
  weightage: number;
  selected?: boolean;
  flags?: string[];
}

interface TeamGoal {
  id: string;
  type: "OKR";
  title: string;
  progress: number;
  status: GoalStatus;
}

interface ReporteeGoals {
  id: string;
  name: string;
  initials: string;
  role: string;
  goalCount: number;
  average: number;
  expanded?: boolean;
  goals: TeamGoal[];
}

const approvalGoals: ApprovalGoal[] = [
  {
    id: "approval-1",
    owner: "Pallavi Mahar",
    initials: "PM",
    title: "Ship Oxygen 2.0 dashboard to 100% of PW employees",
    submittedAgo: "2 days ago",
    weightage: 30,
    selected: true,
  },
  {
    id: "approval-2",
    owner: "Pallavi Mahar",
    initials: "PM",
    title: "Reduce design -> eng handoff time by 40%",
    submittedAgo: "2 days ago",
    weightage: 20,
    selected: true,
  },
  {
    id: "approval-3",
    owner: "Karthik Iyer",
    initials: "KI",
    title: "Migrate auth service to v3 with zero-downtime cutover",
    submittedAgo: "1 day ago",
    weightage: 35,
    flags: ["Weightage exceeds 25% template"],
  },
  {
    id: "approval-4",
    owner: "Aman Bhatt",
    initials: "AB",
    title: "Onboard 4 new engineers to platform team",
    submittedAgo: "4 hours ago",
    weightage: 25,
    flags: ["Edited after first approval"],
  },
  {
    id: "approval-5",
    owner: "Mohit Sinha",
    initials: "MS",
    title: "Maintain design CSAT >= 4.5",
    submittedAgo: "5 hours ago",
    weightage: 20,
  },
];

const reporteeGoals: ReporteeGoals[] = [
  {
    id: "pallavi",
    name: "Pallavi Mahar",
    initials: "PM",
    role: "Sr. Product Designer",
    goalCount: 5,
    average: 64,
    expanded: true,
    goals: [
      {
        id: "pallavi-1",
        type: "OKR",
        title: "Ship Oxygen 2.0 dashboard to 100% of PW employees",
        progress: 64,
        status: "On-track",
      },
      {
        id: "pallavi-2",
        type: "OKR",
        title: "Reduce design -> engineering handoff time by 40%",
        progress: 42,
        status: "At-risk",
      },
      {
        id: "pallavi-3",
        type: "OKR",
        title: "Mentor 2 junior designers to mid-level promotion",
        progress: 80,
        status: "On-track",
      },
    ],
  },
  {
    id: "karthik",
    name: "Karthik Iyer",
    initials: "KI",
    role: "Sr. Designer",
    goalCount: 5,
    average: 78,
    goals: [],
  },
  {
    id: "mohit",
    name: "Mohit Sinha",
    initials: "MS",
    role: "Sr. Designer",
    goalCount: 4,
    average: 52,
    goals: [],
  },
];

const statusVariant: Record<GoalStatus, BadgeVariant> = {
  "On-track": "success",
  "At-risk": "warning",
  "Off-track": "danger",
};

const statusBarColor: Record<GoalStatus, string> = {
  "On-track": "bg-blue-500",
  "At-risk": "bg-blue-500",
  "Off-track": "bg-red-500",
};

const statusSummary = [
  { label: "18 On-track", variant: "success" as BadgeVariant },
  { label: "10 At-risk", variant: "warning" as BadgeVariant },
  { label: "4 Off-track", variant: "danger" as BadgeVariant },
];

const TeamGoals: React.FC = () => {
  const { isMobile } = useScreenSize();

  return (
    <main className={`min-h-full overflow-y-auto bg-[#f8fafc] font-sans ${isMobile ? "p-4" : "p-6"}`}>
      <div className="mx-auto max-w-screen space-y-5">
        <header className={`flex ${isMobile ? "flex-col gap-4" : "items-center justify-between"}`}>
          <div>
            <Typography variant="h3" className="text-gray-900">
              Team Goals
            </Typography>
            <Typography variant="bodySmall" className="text-gray-500">
              32 goals across 8 reportees - 5 pending your approval
            </Typography>
          </div>
          <div className={`flex ${isMobile ? "w-full flex-col" : "items-center"} gap-3`}>
            <Button variant="outline" bgColor="text" size="sm" className={isMobile ? "w-full" : ""}>
              Cascade from Org
            </Button>
            <Button
              variant="contain"
              bgColor="primary"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              className={isMobile ? "w-full" : ""}
            >
              Assign Goal
            </Button>
          </div>
        </header>

        <section className="overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm">
          <div
            className={`flex ${
              isMobile ? "flex-col gap-3" : "items-center justify-between"
            } border-b border-amber-100 bg-amber-50 px-5 py-4`}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-amber-700" />
              <Typography variant="bodySmall" className="font-semibold text-amber-900">
                Approval Queue - 5 goals awaiting you
              </Typography>
              {!isMobile && (
                <Typography variant="caption" className="text-amber-800">
                  auto-approve in 2 days if no action
                </Typography>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" bgColor="text" size="sm" className="bg-white">
                Reject all
              </Button>
              <Button variant="contain" bgColor="success" size="sm">
                Approve all
              </Button>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {approvalGoals.map((goal) => (
              <article
                key={goal.id}
                className={`grid gap-4 px-5 py-4 ${
                  isMobile
                    ? "grid-cols-[auto_1fr]"
                    : "grid-cols-[auto_minmax(0,1fr)_120px_110px_260px] items-center"
                }`}
              >
                <label className="mt-5 flex h-4 w-4 items-center justify-center">
                  <input
                    type="checkbox"
                    defaultChecked={goal.selected}
                    aria-label={`Select ${goal.title}`}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge label="OKR" variant="purple" size="sm" />
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 text-[10px] font-semibold text-blue-600">
                      {goal.initials}
                    </span>
                    <Typography variant="caption" className="text-gray-600">
                      {goal.owner}
                    </Typography>
                    {goal.flags?.map((flag) => (
                      <span
                        key={flag}
                        className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600"
                      >
                        <AlertCircle className="h-3 w-3" />
                        {flag}
                      </span>
                    ))}
                  </div>
                  <Typography variant="bodySmall" className="truncate font-semibold text-gray-900">
                    {goal.title}
                  </Typography>
                  <Typography variant="caption" className="text-gray-500">
                    Submitted {goal.submittedAgo}
                  </Typography>
                </div>

                <div className={isMobile ? "col-start-2" : ""}>
                  <Typography variant="label" className="text-gray-500">
                    Weightage
                  </Typography>
                  <Typography
                    variant="bodyMedium"
                    className={`font-bold rounded-md ${goal.weightage > 25 ? "text-red-600" : "text-gray-900"}`}
                  >
                    {goal.weightage}%
                  </Typography>
                </div>

                <div className={isMobile ? "col-start-2" : ""}>
                  <span className="inline-flex items-center rounded-md bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Submitted
                  </span>
                </div>

                <div className={`flex flex-wrap gap-2 ${isMobile ? "col-span-2" : "justify-end"}`}>
                  <Button variant="outline" bgColor="text" size="sm" className="bg-white">
                    Send back
                  </Button>
                  <Button variant="outline" bgColor="error" size="sm" className="bg-white">
                    Reject
                  </Button>
                  <Button className="text-white" variant="contain" bgColor="primary" size="sm">
                    Approve
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <header className={`mb-4 flex ${isMobile ? "flex-col gap-3" : "items-start justify-between"}`}>
            <div>
              <div className="flex items-center gap-3">
                <Typography variant="h4" className="font-bold text-gray-900">
                  All Team Goals
                </Typography>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">32</span>
              </div>
              <Typography variant="caption" className="text-gray-500">
                Approved & in progress - grouped by reportee
              </Typography>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusSummary.map((item) => (
                <Badge key={item.label} label={item.label} variant={item.variant} size="sm" />
              ))}
            </div>
          </header>

          <div className="space-y-3">
            {reporteeGoals.map((reportee) => (
              <article key={reportee.id} className="overflow-hidden rounded-xl border border-gray-100">
                <button
                  type="button"
                  className="flex w-full items-center justify-between bg-blue-50/60 px-4 py-3 text-left transition-colors hover:bg-blue-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                      {reportee.initials}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Typography variant="bodySmall" className="font-semibold text-gray-900">
                          {reportee.name}
                        </Typography>
                        <Typography variant="caption" className="text-gray-500">
                          {reportee.role} - {reportee.goalCount} goals - {reportee.average}% avg
                        </Typography>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-gray-500 ${reportee.expanded ? "rotate-90" : ""}`} />
                </button>

                {reportee.expanded && (
                  <div className="divide-y divide-gray-50 px-4 py-2">
                    {reportee.goals.map((goal) => (
                      <div
                        key={goal.id}
                        className={`grid gap-3 py-3 ${
                          isMobile ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_220px] items-center"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <CornerDownRight className="h-4 w-4 shrink-0 text-gray-300" />
                          <Badge label={goal.type} variant="purple" size="sm" />
                          <Typography variant="bodySmall" className="truncate text-gray-700">
                            {goal.title}
                          </Typography>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full ${statusBarColor[goal.status]}`}
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                          <Badge label={goal.status} variant={statusVariant[goal.status]} size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <Typography variant="bodyMedium" className="font-semibold text-gray-900">
              14 approved this cycle
            </Typography>
            <Typography variant="caption" className="text-gray-500">
              Most submissions are aligned with org-level OKRs.
            </Typography>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <Typography variant="bodyMedium" className="font-semibold text-gray-900">
              2 need manager follow-up
            </Typography>
            <Typography variant="caption" className="text-gray-500">
              Weightage and edit-history exceptions are highlighted.
            </Typography>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Send className="h-5 w-5" />
            </div>
            <Typography variant="bodyMedium" className="font-semibold text-gray-900">
              Cascading ready
            </Typography>
            <Typography variant="caption" className="text-gray-500">
              Assign org-derived goals to reportees from the header action.
            </Typography>
          </div>
        </section>
      </div>
    </main>
  );
};

export default TeamGoals;
