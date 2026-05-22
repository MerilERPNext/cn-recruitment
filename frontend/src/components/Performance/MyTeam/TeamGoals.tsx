import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  AlertCircle,
  CornerDownRight,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Typography } from '../../shared/atoms/Typography';
import Badge, { type BadgeVariant } from '../../shared/Badge';
import Button from '../../shared/atoms/Button';
import Modal from '../../shared/Modal';
import { useScreenSize } from '../../../hooks/useScreenSize';

// ─── Types ───────────────────────────────────────────────────────────────────

type GoalStatus = 'On-track' | 'At-risk' | 'Off-track';

interface KeyResult {
  id: string;
  title: string;
  target: number | string;
}

interface ApprovalGoal {
  id: string;
  type: 'OKR' | 'KI';
  employeeInitials: string;
  employeeName: string;
  warning?: string;
  title: string;
  submittedAgo: string;
  weightage: number;
  checked: boolean;
}

interface TeamMemberGoal {
  id: string;
  type: 'OKR' | 'KI';
  title: string;
  progress: number;
  status: GoalStatus;
}

interface TeamMember {
  id: string;
  initials: string;
  name: string;
  designation: string;
  goalCount: number;
  avgProgress: number;
  goals: TeamMemberGoal[];
  expanded: boolean;
}

interface GoalDetailData {
  id: string;
  type: 'OKR' | 'KI';
  label: string;
  status: 'Submitted';
  approvalStatus: 'Pending Approval';
  title: string;
  employeeInitials: string;
  employeeName: string;
  designation: string;
  submittedAgo: string;
  weightage: number;
  start: string;
  end: string;
  metric: string;
  alignedTo: string;
  contribution: string;
  visibility: string;
  autoPull: string;
  description: string;
  keyResults: KeyResult[];
  managerComment: string;
  autoApprovesInDays: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const APPROVAL_GOALS: ApprovalGoal[] = [
  { id: 'a1', type: 'OKR', employeeInitials: 'PM', employeeName: 'Pallavi Mahar', title: 'Ship Oxygen 2.0 dashboard to 100% of PW employees', submittedAgo: '2 days ago', weightage: 30, checked: true },
  { id: 'a2', type: 'OKR', employeeInitials: 'PM', employeeName: 'Pallavi Mahar', title: 'Reduce design → eng handoff time by 40%', submittedAgo: '2 days ago', weightage: 20, checked: true },
  { id: 'a3', type: 'OKR', employeeInitials: 'KI', employeeName: 'Karthik Iyer', warning: 'Weightage exceeds 25% template', title: 'Migrate auth service to v3 with zero-downtime cutover', submittedAgo: '1 day ago', weightage: 35, checked: false },
  { id: 'a4', type: 'OKR', employeeInitials: 'AB', employeeName: 'Aman Bhatt', warning: 'Edited after first approval', title: 'Onboard 4 new engineers to platform team', submittedAgo: '4 hours ago', weightage: 25, checked: false },
  { id: 'a5', type: 'OKR', employeeInitials: 'MS', employeeName: 'Mohit Sinha', title: 'Maintain design CSAT ≥ 4.5', submittedAgo: '5 hours ago', weightage: 20, checked: false },
];

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'm1', initials: 'PM', name: 'Pallavi Mahar', designation: 'Sr. Product Designer',
    goalCount: 5, avgProgress: 64, expanded: true,
    goals: [
      { id: 'g1', type: 'OKR', title: 'Ship Oxygen 2.0 dashboard to 100% of PW employees', progress: 64, status: 'On-track' },
      { id: 'g2', type: 'OKR', title: 'Reduce design → engineering handoff time by 40%', progress: 42, status: 'At-risk' },
      { id: 'g3', type: 'OKR', title: 'Mentor 2 junior designers to mid-level promotion', progress: 80, status: 'On-track' },
    ],
  },
  {
    id: 'm2', initials: 'KI', name: 'Karthik Iyer', designation: 'Sr. Designer',
    goalCount: 5, avgProgress: 78, expanded: false,
    goals: [
      { id: 'g4', type: 'OKR', title: 'Migrate auth service to v3 with zero-downtime cutover', progress: 55, status: 'At-risk' },
      { id: 'g5', type: 'KI', title: 'Design system contribution — 10 components', progress: 90, status: 'On-track' },
    ],
  },
  {
    id: 'm3', initials: 'MS', name: 'Mohit Sinha', designation: 'Sr. Designer',
    goalCount: 4, avgProgress: 52, expanded: false,
    goals: [
      { id: 'g6', type: 'OKR', title: 'Maintain design CSAT ≥ 4.5', progress: 91, status: 'On-track' },
      { id: 'g7', type: 'OKR', title: 'Launch design-thinking workshop series', progress: 18, status: 'Off-track' },
    ],
  },
];

const GOAL_DETAIL: GoalDetailData = {
  id: 'a1', type: 'OKR', label: 'Individual', status: 'Submitted', approvalStatus: 'Pending Approval',
  title: 'Ship Oxygen 2.0 dashboard to 100% of PW employees',
  employeeInitials: 'PM', employeeName: 'Pallavi Mahar', designation: 'Sr. Product Designer', submittedAgo: '2 days ago',
  weightage: 30, start: '1 Apr 2026', end: '31 Mar 2027', metric: '% rollout · target 100',
  alignedTo: 'Alakh Pandey · Org OKR', contribution: '12% of parent', visibility: 'Team', autoPull: 'Jira · OXY-2.0',
  description: 'Lead the design + research for the redesigned dashboard. Drive adoption past 80% WAU. Coordinate with PMM and CS for rollout comms. Quarterly progress reviews with Aditi.',
  keyResults: [
    { id: 'KR 1', title: 'Design system v2 components shipped (24 of 32)', target: 32 },
    { id: 'KR 2', title: 'Dashboard usability score ≥ 4.4 / 5', target: 4.4 },
    { id: 'KR 3', title: 'WAU adoption ≥ 80% by Q3', target: 80 },
  ],
  managerComment: 'Looks good. Make sure KR3 has weekly check-ins — this is the riskiest one.',
  autoApprovesInDays: 2,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const getInitialsBg = (initials: string) => {
  const map: Record<string, string> = {
    PM: 'bg-purple-100 text-purple-700',
    KI: 'bg-blue-100 text-blue-700',
    AB: 'bg-green-100 text-green-700',
    MS: 'bg-orange-100 text-orange-700',
  };
  return map[initials] || 'bg-gray-200 text-gray-700';
};

// ─── Goal Detail Modal ────────────────────────────────────────────────────────

interface GoalDetailModalProps {
  goal: GoalDetailData;
  onClose: () => void;
}

const GoalDetailModal: React.FC<GoalDetailModalProps> = ({ goal, onClose }) => {
  const [comment, setComment] = useState(goal.managerComment);
  const { isMobile } = useScreenSize();

  return (
    <Modal isOpen onClose={onClose} size="md">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-2 items-center mt-1">
            <Badge label={`${goal.type} · ${goal.label}`} backgroundColor="bg-purple-50 text-purple-700" size="sm" />
            <Badge label={goal.status} backgroundColor="bg-yellow-50 text-yellow-700" size="sm" />
            <Badge label={goal.approvalStatus} backgroundColor="bg-orange-50 text-orange-600" size="sm" />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-2 p-1 border border-gray-200 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Title + Employee */}
          <div>
            <Typography variant="h3" className="text-gray-900 mb-2">{goal.title}</Typography>
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${getInitialsBg(goal.employeeInitials)}`}>
                {goal.employeeInitials}
              </div>
              <Typography variant="bodySmall" className="text-gray-500">
                {goal.employeeName} · {goal.designation} · submitted {goal.submittedAgo}
              </Typography>
            </div>
          </div>

          {/* Meta Grid */}
          <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-6`}>
            {[
              { label: 'WEIGHTAGE', value: `${goal.weightage}%` },
              { label: 'START', value: goal.start },
              { label: 'END', value: goal.end },
              { label: 'METRIC', value: goal.metric },
              { label: 'ALIGNED TO', value: goal.alignedTo },
              { label: 'CONTRIBUTION', value: goal.contribution },
              { label: 'VISIBILITY', value: goal.visibility },
              { label: 'AUTO-PULL', value: goal.autoPull },
            ].map((item) => (
              <div key={item.label}>
                <Typography variant="caption" className="text-gray-400 uppercase tracking-wider block mb-1 font-semibold">{item.label}</Typography>
                <Typography variant="bodySmall" className="font-semibold text-gray-800">{item.value}</Typography>
              </div>
            ))}
          </div>

          {/* Description */}
          <div>
            <Typography variant="bodySmall" className="font-medium text-gray-900 mb-2 block">Description</Typography>
            <div className="bg-[#f8fafc] border border-gray-100 rounded-xl p-4">
              <Typography variant="bodySmall" className="text-gray-600">{goal.description}</Typography>
            </div>
          </div>

          {/* Key Results */}
          <div>
            <Typography variant="bodySmall" className="font-medium text-gray-900 mb-3 block">
              Key Results ({goal.keyResults.length})
            </Typography>
            <div className="space-y-2">
              {goal.keyResults.map((kr) => (
                <div key={kr.id} className="flex items-center justify-between gap-3 py-3 px-4 border border-gray-100 rounded-xl bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge label={kr.id} variant="purple-outline" size="sm" />
                    <Typography variant="bodySmall" className="text-gray-800 font-medium">{kr.title}</Typography>
                  </div>
                  <Typography variant="caption" className="text-gray-500 shrink-0">Target {kr.target}</Typography>
                </div>
              ))}
            </div>
          </div>

          {/* Add Comment */}
          <div>
            <Typography variant="bodySmall" className="font-medium text-gray-900 mb-2 block">
              Add comment <span className="text-gray-400 font-normal">(visible to {goal.employeeName.split(' ')[0]})</span>
            </Typography>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-sm"
            />
          </div>

          {/* Audit */}
          <div className="border-t border-gray-100 pt-4 pb-2">
            <Typography variant="caption" className="uppercase tracking-wider text-gray-400 font-semibold">AUDIT</Typography>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-lg">
          <Typography variant="caption" className="text-gray-500">Auto-approves in {goal.autoApprovesInDays} days</Typography>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" bgColor="text" size="sm" onClick={onClose} className="bg-white px-4">Send back</Button>
            <button className="text-sm font-medium border border-red-200 text-red-600 bg-white hover:bg-red-50 px-4 py-1.5 rounded-lg transition-colors">Reject</button>
            <button className="text-sm font-medium bg-[#0f8c5a] hover:bg-[#0d7a4e] text-white px-4 py-1.5 rounded-lg transition-colors shadow-sm">Approve goal</button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const TeamGoals: React.FC = () => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  const [checkedGoals, setCheckedGoals] = useState<Set<string>>(
    new Set(APPROVAL_GOALS.filter((g) => g.checked).map((g) => g.id))
  );
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set(['m1']));
  const [selectedGoal, setSelectedGoal] = useState<GoalDetailData | null>(null);

  const totalGoals = 32;
  const totalReportees = 8;
  const pendingApproval = APPROVAL_GOALS.length;

  const toggleCheck = (id: string) => {
    setCheckedGoals((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleMember = (id: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <main className={`min-h-full overflow-y-auto overflow-x-hidden bg-[#f8fafc] font-sans ${isMobile ? "p-4" : "p-6"}`}>
      <div className="mx-auto w-full max-w-screen space-y-5">

        {/* Page Header */}
        <header className={`flex min-w-0 ${isCompact ? "flex-col gap-4" : "items-center justify-between gap-4"}`}>
          <div className="min-w-0">
            <Typography variant="h3" className="text-gray-900">
              Team Goals
            </Typography>
            <Typography variant="bodySmall" className="text-gray-500">
              {totalGoals} goals across {totalReportees} reportees - {pendingApproval} pending your approval
            </Typography>
          </div>
          <div className={`flex ${isCompact ? "w-full flex-col sm:flex-row" : "shrink-0 items-center"} gap-3`}>
            <Button variant="outline" bgColor="text" size="sm" className={isCompact ? "w-full sm:w-fit" : ""}>
              Cascade from Org
            </Button>
            <Button
              variant="contain"
              bgColor="primary"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              className={isCompact ? "w-full sm:w-fit" : ""}
            >
              Assign Goal
            </Button>
          </div>
        </header>

        {/* Approval Queue Section */}
        <section className="overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm">
          <div
            className={`flex ${
              isCompact ? "flex-col gap-3" : "items-center justify-between"
            } border-b border-amber-100 bg-amber-50 px-5 py-4`}
          >
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 sm:mt-0" />
              <Typography variant="bodySmall" className="min-w-0 font-semibold text-amber-900">
                Approval Queue — {APPROVAL_GOALS.length} goals awaiting you
              </Typography>
              {!isMobile && (
                <Typography variant="caption" className="shrink-0 text-amber-800">
                  - auto-approve in 2 days if no action
                </Typography>
              )}
            </div>
            <div className={`flex gap-3 ${isCompact ? "w-full flex-col sm:w-auto sm:flex-row" : "items-center"}`}>
              <button className={`text-sm font-medium border border-red-200 text-red-600 bg-white hover:bg-red-50 px-4 py-1.5 rounded-lg transition-colors ${isCompact ? "w-full sm:w-fit" : ""}`}>
                Reject all
              </button>
              <button className={`text-sm font-medium bg-[#0f8c5a] hover:bg-[#0d7a4e] text-white px-4 py-1.5 rounded-lg transition-colors shadow-sm ${isCompact ? "w-full sm:w-fit" : ""}`}>
                Approve all
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {APPROVAL_GOALS.map((goal) => (
              <article
                key={goal.id}
                onClick={() => setSelectedGoal(GOAL_DETAIL)}
                className={`grid gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  isCompact
                    ? "grid-cols-[auto_1fr]"
                    : "grid-cols-[auto_minmax(0,1fr)_120px_110px_260px] items-center"
                }`}
              >
                <label className={`flex h-4 w-4 items-start justify-center`} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={checkedGoals.has(goal.id)}
                    onChange={() => toggleCheck(goal.id)}
                    aria-label={`Select ${goal.title}`}
                    className="h-4 w-4 rounded border-gray-300 text-blue-500 accent-blue-500 focus:ring-blue-500 cursor-pointer"
                  />
                </label>

                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge label={goal.type} variant="purple" size="sm" />
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold ${getInitialsBg(goal.employeeInitials)}`}>
                      {goal.employeeInitials}
                    </span>
                    <Typography variant="caption" className="text-gray-600">
                      {goal.employeeName}
                    </Typography>
                    {goal.warning && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        <AlertCircle className="h-3 w-3" />
                        {goal.warning}
                      </span>
                    )}
                  </div>
                  <Typography
                    variant="bodySmall"
                    className={`font-semibold text-gray-900 ${isCompact ? "break-words" : "truncate"}`}
                  >
                    {goal.title}
                  </Typography>
                  <Typography variant="caption" className="text-gray-500">
                    Submitted {goal.submittedAgo}
                  </Typography>
                </div>

                <div className={isCompact ? "col-start-2" : ""}>
                  <Typography variant="label" className="text-gray-500 uppercase tracking-wider block mb-0.5 font-semibold">
                    Weightage
                  </Typography>
                  <Typography
                    variant="bodyMedium"
                    className={`font-bold ${goal.weightage > 30 ? "text-red-600" : "text-gray-900"}`}
                  >
                    {goal.weightage}%
                  </Typography>
                </div>

                <div className={isCompact ? "col-start-2" : ""}>
                  <span className="inline-flex items-center rounded-md bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Submitted
                  </span>
                </div>

                <div className={`flex flex-wrap gap-2 ${isCompact ? "col-span-2 justify-center sm:col-start-2" : "justify-end"}`} onClick={(e) => e.stopPropagation()}>
                  <Button variant="outline" bgColor="text" size="sm" className={isCompact ? "min-w-24 flex-1 bg-white sm:flex-none" : "bg-white"}>
                    Send back
                  </Button>
                  <button className={`text-sm font-medium border border-red-200 text-red-600 bg-white hover:bg-red-50 px-4 py-1.5 rounded-lg transition-colors ${isCompact ? "min-w-24 flex-1 sm:flex-none" : ""}`}>
                    Reject
                  </button>
                  <button className={`text-sm font-medium bg-[#0f8c5a] hover:bg-[#0d7a4e] text-white px-4 py-1.5 rounded-lg transition-colors shadow-sm ${isCompact ? "min-w-24 flex-1 sm:flex-none" : ""}`}>
                    Approve
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* All Team Goals Section */}
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <header className={`mb-4 flex min-w-0 ${isCompact ? "flex-col gap-3" : "items-start justify-between gap-4"}`}>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-3">
                <Typography variant="h4" className="font-bold text-gray-900">
                  All Team Goals
                </Typography>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{totalGoals}</span>
              </div>
              <Typography variant="caption" className="text-gray-500">
                Approved & in progress · grouped by reportee
              </Typography>
            </div>
            <div className={`flex flex-wrap gap-2 ${isCompact ? "w-full" : "shrink-0 justify-end"}`}>
              {statusSummary.map((item) => (
                <Badge key={item.label} label={item.label} variant={item.variant} size="sm" />
              ))}
            </div>
          </header>

          <div className="space-y-3">
            {TEAM_MEMBERS.map((member) => {
              const isExpanded = expandedMembers.has(member.id);
              return (
                <article key={member.id} className="overflow-hidden rounded-xl border border-gray-100">
                  <button
                    type="button"
                    onClick={() => toggleMember(member.id)}
                    className="flex w-full items-start justify-between gap-3 bg-blue-50/60 px-4 py-3 text-left transition-colors hover:bg-blue-50 sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${getInitialsBg(member.initials)}`}>
                        {member.initials}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Typography variant="bodySmall" className="font-semibold text-gray-900">
                            {member.name}
                          </Typography>
                          <Typography variant="caption" className="text-gray-500">
                            {member.designation} · {member.goalCount} goals · {member.avgProgress}% avg
                          </Typography>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`mt-2 h-4 w-4 shrink-0 text-gray-500 sm:mt-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </button>

                  {isExpanded && (
                    <div className="divide-y divide-gray-50 px-4 py-2">
                      {member.goals.map((goal) => (
                        <div
                          key={goal.id}
                          onClick={() => setSelectedGoal(GOAL_DETAIL)}
                          className={`grid gap-3 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            isCompact ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_220px] items-center"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <CornerDownRight className="h-4 w-4 shrink-0 text-gray-300" />
                            <Badge label={goal.type} variant="purple" size="sm" />
                            <Typography
                              variant="bodySmall"
                              className={`min-w-0 text-gray-700 ${isCompact ? "break-words" : "truncate"}`}
                            >
                              {goal.title}
                            </Typography>
                          </div>
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-md bg-gray-100">
                              <div
                                className={`h-full rounded-md ${statusBarColor[goal.status]}`}
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
              );
            })}
          </div>
        </section>

      </div>

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <GoalDetailModal goal={selectedGoal} onClose={() => setSelectedGoal(null)} />
      )}
    </main>
  );
};

export default TeamGoals;
