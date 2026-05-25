import {
  Calendar,
  Clock,
  Users,
  Grid,
  FileText,
  BarChart2,
  Target,
  Mail,
  Zap,
  CheckCircle2,
  AlertCircle,
  Play,
  Sparkles,
} from "lucide-react";
import WizardShell from "./WizardShell";
import { mockWizardData } from "./AppraisalCycleWizard";
import { Typography } from "../../shared/atoms/Typography";

const summaryItems = [
  {
    id: "cycle-name",
    label: "CYCLE NAME",
    value: "FY26 Annual Performance Cycle",
    icon: <Calendar className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "period",
    label: "PERIOD",
    value: "1 Apr 2026 → 31 Mar 2027 · 12 months",
    icon: <Clock className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "eligible-employees",
    label: "ELIGIBLE EMPLOYEES",
    value: "2,140 (43 excluded)",
    icon: <Users className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "stages",
    label: "STAGES",
    value: "10 stages · 56 days",
    icon: <Grid className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "form-template",
    label: "FORM TEMPLATE",
    value: "Standard Annual Form · v3 (7 sections, 32 Qs)",
    icon: <FileText className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "competency-framework",
    label: "COMPETENCY FRAMEWORK",
    value: "PW Design · 8 x 5 levels",
    icon: <BarChart2 className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "normalisation",
    label: "NORMALISATION",
    value: "Soft target distribution (5/15/60/15/5)",
    icon: <Target className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "letters",
    label: "LETTERS",
    value: "4 types · EN + HI + AR · DocuSign + Aadhaar",
    icon: <Mail className="h-5 w-5 text-blue-500" />,
  },
  {
    id: "release-schedule",
    label: "RELEASE SCHEDULE",
    value: "4 waves · 1 → 5 Jul 2026",
    icon: <Zap className="h-5 w-5 text-blue-500" />,
  },
];

const checklistItems = [
  {
    id: "chk-1",
    status: "PASS",
    title: "Eligibility rules validated against HRIS",
    subtitle: "2,140 employees · last sync 4 min ago",
  },
  {
    id: "chk-2",
    status: "PASS",
    title: "Form template assigned to all populations",
    subtitle: "1 default + 1 probation template",
  },
  {
    id: "chk-3",
    status: "PASS",
    title: "Competency framework mapped for all grades",
    subtitle: "L1–L6 all covered",
  },
  {
    id: "chk-4",
    status: "WARN",
    title: "Workflow approvers exist in HRIS",
    subtitle: "3 employees missing skip manager — will auto-escalate",
  },
  {
    id: "chk-5",
    status: "PASS",
    title: "Letter templates linked to merge fields",
    subtitle: "All 22 merge fields resolved",
  },
  {
    id: "chk-6",
    status: "WARN",
    title: "Reviewer assignments dry-run clean",
    subtitle: "2 employees match >1 peer pool — will use BU default",
  },
  {
    id: "chk-7",
    status: "PASS",
    title: "Notifications channels authenticated",
    subtitle: "Slack, Teams, WhatsApp tokens valid",
  },
  {
    id: "chk-8",
    status: "PASS",
    title: "Re-open authority defined",
    subtitle: "HR Admin · audit to Super Admin",
  },
];

const ReviewLaunch = () => {
  const reviewLaunchData = {
    ...mockWizardData,
    activeStepId: "review-launch",
    header: {
      title: "Review & Launch",
      description: "Run a final dry-run, fix any warnings, and launch.",
    },
    validationStatus: "Validation passed",
    nextStepLabel: "Launch Cycle",
  };

  return (
    <WizardShell data={reviewLaunchData} contentClassName="flex flex-col gap-6 relative pb-32">
      {/* 3x3 Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {summaryItems.map((item) => (
          <div key={item.id} className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              {item.icon}
            </div>
            <div>
              <Typography variant="caption" className="font-bold uppercase tracking-wider text-gray-500 mb-0.5 block">
                {item.label}
              </Typography>
              <Typography variant="bodyMedium" className="font-bold text-gray-900 leading-snug">
                {item.value}
              </Typography>
            </div>
          </div>
        ))}
      </div>

      {/* Pre-launch Checklist */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Typography variant="h3" className="text-xl font-bold text-gray-900">
            Pre-launch checklist
          </Typography>
          <button className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-600">
            <Play className="h-4 w-4" fill="currentColor" />
            Run dry-run
          </button>
        </div>

        <div className="flex flex-col space-y-0">
          {checklistItems.map((item, index) => (
            <div 
              key={item.id} 
              className={`flex items-start justify-between py-4 ${
                index !== checklistItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  {item.status === "PASS" ? (
                    <CheckCircle2 className="h-6 w-6 text-white" fill="#22c55e" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-white" fill="#eab308" />
                  )}
                </div>
                <div>
                  <Typography variant="bodyMedium" className="font-bold text-gray-900">
                    {item.title}
                  </Typography>
                  <Typography variant="bodySmall" className="text-gray-500 mt-0.5 block">
                    {item.subtitle}
                  </Typography>
                </div>
              </div>
              <div className="shrink-0">
                <span className={`inline-flex items-center justify-center rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                  item.status === "PASS" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                }`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Launch Action Bar */}
      <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 sm:p-6 shadow-sm mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <Typography variant="h3" className="text-lg font-bold text-gray-900">
              Ready to launch · 6 PASS · 2 WARN · 0 FAIL
            </Typography>
            <Typography variant="bodySmall" className="text-gray-600 mt-1 block max-w-2xl">
              Launching will send <span className="font-bold">2,140</span> "Cycle opens" notifications and create review instances for all eligible employees.
            </Typography>
          </div>
          
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50">
                Schedule launch
              </button>
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600">
                <Sparkles className="h-4 w-4" fill="currentColor" />
                Launch Cycle Now
              </button>
            </div>
            <Typography variant="caption" className="text-gray-500 text-[10px]">
              Auditor will be notified - this action is logged
            </Typography>
          </div>
        </div>
      </section>
    </WizardShell>
  );
};

export default ReviewLaunch;
