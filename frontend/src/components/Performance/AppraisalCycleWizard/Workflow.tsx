import clsx from "clsx";
import { Check } from "lucide-react";
import { useState } from "react";
import { Switch } from "../../shared/atoms/Switch";
import { Typography } from "../../shared/atoms/Typography";
import { mockWizardData } from "./AppraisalCycleWizard";
import WizardShell from "./WizardShell";

const approvalPatterns = [
  { id: "none", title: "None", description: "Submissions go live" },
  { id: "single", title: "Single-level", description: "Manager (L1) only" },
  {
    id: "multi-serial",
    title: "Multi-level serial",
    description: "L1 → L2 → HRBP",
  },
  {
    id: "multi-parallel",
    title: "Multi-level parallel",
    description: "L1 + L2 sign off",
  },
];

const visualWorkflowStages = [
  { id: 1, title: "Employee", subtitle: "Self-Review submit", color: "blue" },
  { id: 2, title: "Manager L1", subtitle: "Manager Review", color: "indigo" },
  { id: 3, title: "Skip L2", subtitle: "Endorse / Override", color: "purple" },
  { id: 4, title: "HRBP", subtitle: "Pre-calibration check", color: "yellow" },
  {
    id: 5,
    title: "Calibrator",
    subtitle: "Calibration meeting",
    color: "green",
  },
  { id: 6, title: "HR Admin", subtitle: "Release", color: "red" },
];

const colorMap = {
  blue: { bg: "bg-blue-500", border: "border-blue-500", text: "text-blue-500" },
  indigo: {
    bg: "bg-indigo-500",
    border: "border-indigo-500",
    text: "text-indigo-500",
  },
  purple: {
    bg: "bg-purple-500",
    border: "border-purple-500",
    text: "text-purple-500",
  },
  yellow: {
    bg: "bg-amber-500",
    border: "border-amber-500",
    text: "text-amber-500",
  },
  green: {
    bg: "bg-emerald-500",
    border: "border-emerald-500",
    text: "text-emerald-500",
  },
  red: { bg: "bg-red-500", border: "border-red-500", text: "text-red-500" },
};

const Workflow = () => {
  const [activePattern, setActivePattern] = useState("single");
  const [lockdownRules, setLockdownRules] = useState({
    lockSelfReview: true,
    lockManagerRating: true,
    allowHrReopen: true,
    auditReopen: true,
    allowRollback: false,
  });

  const workflowData = {
    ...mockWizardData,
    activeStepId: "workflow",
    header: {
      title: "Workflow",
      description: "Approvals, escalations, and lockdown rules between stages.",
    },
    validationStatus: "Validation passed",
    nextStepLabel: "Next: Notifications",
  };

  const handleRuleToggle = (key: keyof typeof lockdownRules) => {
    setLockdownRules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <WizardShell
      data={workflowData}
      contentClassName="flex flex-col gap-6 pb-8"
    >
      {/* Approval Pattern */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <Typography variant="h4" className="font-bold text-gray-900 mb-1">
          Approval Pattern
        </Typography>
        <Typography variant="bodySmall" className="text-gray-500 mb-6 block">
          Applies to all reviewer-completed stages
        </Typography>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {approvalPatterns.map((pattern) => (
            <div
              key={pattern.id}
              onClick={() => setActivePattern(pattern.id)}
              className={clsx(
                "relative flex flex-col rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm",
                activePattern === pattern.id
                  ? "border-blue-500 bg-blue-50/10 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300",
              )}
            >
              <Typography
                variant="bodyMedium"
                className="font-bold text-gray-900 mb-1"
              >
                {pattern.title}
              </Typography>
              <Typography variant="bodySmall" className="text-gray-500">
                {pattern.description}
              </Typography>
              {activePattern === pattern.id && (
                <div className="mt-4 flex items-center gap-1.5 text-blue-600">
                  <Check className="h-4 w-4" />
                  <span className="text-xs font-bold">Selected</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SLA & Escalation */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <Typography variant="h4" className="font-bold text-gray-900 mb-6">
          SLA & Escalation
        </Typography>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700">
              Auto-approve after
            </label>
            <select className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm font-medium text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option>2 days</option>
              <option>3 days</option>
              <option>5 days</option>
              <option>7 days</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700">
              First escalation
            </label>
            <select className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm font-medium text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option>To Skip (L2)</option>
              <option>To HRBP</option>
              <option>To HR Head</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700">
              Final escalation
            </label>
            <select className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm font-medium text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option>To HR Head</option>
              <option>To Skip (L2)</option>
              <option>To HRBP</option>
            </select>
          </div>
        </div>
      </section>

      {/* Visual workflow */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <Typography variant="h4" className="font-bold text-gray-900 mb-1">
          Visual workflow
        </Typography>
        <Typography variant="bodySmall" className="text-gray-500 mb-6 block">
          Sequential approvers between stages
        </Typography>

        <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar">
          {visualWorkflowStages.map((stage) => {
            const colors = colorMap[stage.color as keyof typeof colorMap];
            return (
              <div
                key={stage.id}
                className={clsx(
                  "flex flex-col rounded-xl border bg-white p-4 min-w-[160px] flex-shrink-0 relative",
                  colors.border,
                )}
              >
                <div
                  className={clsx(
                    "flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-bold mb-4",
                    colors.bg,
                  )}
                >
                  {stage.id}
                </div>
                <Typography
                  variant="bodyMedium"
                  className="font-bold text-gray-900 mb-1"
                >
                  {stage.title}
                </Typography>
                <Typography variant="caption" className="text-gray-500">
                  {stage.subtitle}
                </Typography>
              </div>
            );
          })}
        </div>
      </section>

      {/* Lockdown rules */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <Typography variant="h4" className="font-bold text-gray-900 mb-1">
          Lockdown rules
        </Typography>
        <Typography variant="bodySmall" className="text-gray-500 mb-6 block">
          After a stage closes, what's editable?
        </Typography>

        <div className="flex flex-col divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
            <Typography variant="bodyMedium" className="text-gray-700">
              Lock self-review on submit
            </Typography>
            <Switch
              checked={lockdownRules.lockSelfReview}
              onCheckedChange={() => handleRuleToggle("lockSelfReview")}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
            <Typography variant="bodyMedium" className="text-gray-700">
              Lock manager rating on calibration submit
            </Typography>
            <Switch
              checked={lockdownRules.lockManagerRating}
              onCheckedChange={() => handleRuleToggle("lockManagerRating")}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
            <Typography variant="bodyMedium" className="text-gray-700">
              Allow HR Admin to re-open any stage (with reason)
            </Typography>
            <Switch
              checked={lockdownRules.allowHrReopen}
              onCheckedChange={() => handleRuleToggle("allowHrReopen")}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
            <Typography variant="bodyMedium" className="text-gray-700">
              Audit re-open events to Super Admin
            </Typography>
            <Switch
              checked={lockdownRules.auditReopen}
              onCheckedChange={() => handleRuleToggle("auditReopen")}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
            <Typography variant="bodyMedium" className="text-gray-700">
              Allow rollback to previous rating
            </Typography>
            <Switch
              checked={lockdownRules.allowRollback}
              onCheckedChange={() => handleRuleToggle("allowRollback")}
            />
          </div>
        </div>
      </section>
    </WizardShell>
  );
};

export default Workflow;
