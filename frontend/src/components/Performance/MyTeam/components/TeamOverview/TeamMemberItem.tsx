import { memo } from "react";
import { Check, Eye, FileCheck, Plus } from "lucide-react";
import Avatar from "../../../../shared/Avatar";
import Badge from "../../../../shared/Badge";
import { Typography } from "../../../../shared/atoms/Typography";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import type { TeamMemberItem as TeamMemberItemType } from "../../../../../types/goal";

export const TEAM_TABLE_COLUMN_WIDTHS = [
  "minmax(260px, 2fr)",
  "minmax(110px, 0.8fr)",
  "minmax(170px, 1.2fr)",
  "minmax(130px, 1fr)",
  "minmax(140px, 1fr)",
  "minmax(140px, 1fr)",
  "minmax(130px, 0.9fr)",
];

const getProgressColor = (progress: number) => {
  if (progress >= 70) return "bg-green-500";
  if (progress >= 40) return "bg-blue-500";
  return "bg-red-500";
};

const ToneBadge = ({ label, tone }: { label: string; tone?: string }) => {
  if (!label) return <Typography variant="caption" className="text-gray-400">—</Typography>;

  let variant: "success" | "warning" | "danger" | "default" = "default";
  if (tone === "warning" || label.toLowerCase().includes("pending") || label.toLowerCase().includes("draft")) {
    variant = "warning";
  } else if (tone === "success" || label.toLowerCase().includes("approved") || label.toLowerCase().includes("done")) {
    variant = "success";
  } else if (tone === "danger" || label.toLowerCase().includes("overdue") || label.toLowerCase().includes("off")) {
    variant = "danger";
  }

  return (
    <Badge
      label={label}
      variant={variant}
      size="sm"
      pulse={{ show: false }}
      icon={variant === "success" ? <Check className="w-3 h-3" /> : undefined}
    />
  );
};

const ActionButton = ({ actions }: { actions?: string[] }) => {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-1.5">
      {actions.map((act) => {
        if (act === "approve_goals") {
          return (
            <button
              key={act}
              type="button"
              title="Review & Approve Goals"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-blue-600 text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
            >
              <FileCheck className="h-4 w-4" />
            </button>
          );
        }
      
        if (act === "create_plan" || act === "add_goals") {
          return (
            <button
              key={act}
              type="button"
              title="Create Goal Plan"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-600 text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
            </button>
          );
        }
        if (act === "view_goals") {
          return (
            <button
              key={act}
              type="button"
              title="View Goals"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
            >
              <Eye className="h-4 w-4" />
            </button>
          );
        }
        return null;
      })}
    </div>
  );
};

export const TeamMemberItem = memo(({ item: m }: { item: TeamMemberItemType }) => {
  const { isDesktop } = useScreenSize();

  const name = m.employee_name || m.employee;
  const designation = m.designation || "-";
  const tenure = `${m.tenure_years ?? 0} yrs`;
  const goalCount = m.goal_count ?? 0;
  const progress = m.progress ?? 0;
  const planStatus = m.status_label || m.plan_status;
  const reviewStatus = m.plan_status === "Approved" ? "Approved" : m.status === "pending_approval" ? "Pending" : "Not started";
  const score = m.score > 0 ? String(m.score) : null;

  if (!isDesktop) {
    return (
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar
              name={name}
              fontSize="text-xs"
              size="h-9 w-9"
              avatarBgColor="bg-blue-50"
              avatarTextColor="text-blue-600"
            />
            <div className="min-w-0">
              <Typography variant="mobileCardTitle" className="break-words">
                {name}
              </Typography>
              <Typography variant="mobileCardSubtitle" className="block">
                {designation} · {tenure}
              </Typography>
            </div>
          </div>
          <Typography
            variant="label"
            className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600"
          >
            {goalCount} goals
          </Typography>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <Typography variant="caption" className="font-medium text-slate-500">
              Progress
            </Typography>
            <Typography variant="caption" className="font-semibold text-slate-700">
              {progress}%
            </Typography>
          </div>
          <div className="h-2 overflow-hidden rounded-md bg-slate-200">
            <div
              className={`h-full rounded-md ${getProgressColor(progress)}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <Typography variant="mobileCardLabel" className="block">
              Self
            </Typography>
            <ToneBadge label={planStatus} tone={m.status_tone} />
          </div>
          <div className="min-w-0">
            <Typography variant="mobileCardLabel" className="block">
              My Review
            </Typography>
            <ToneBadge label={reviewStatus} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="min-w-0">
            <Typography variant="mobileCardLabel" className="block">
              Last Rating
            </Typography>
            {score ? (
              <Typography variant="caption" className="font-bold text-blue-600">
                {score}
              </Typography>
            ) : (
              <Typography variant="caption" className="text-slate-400">
                —
              </Typography>
            )}
          </div>
          <div className="w-28 shrink-0">
            <ActionButton actions={m.actions} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <div
      className="grid min-h-16 items-center gap-4 border-b border-gray-100 px-6 py-3 transition-colors hover:bg-primary/10"
      style={{ gridTemplateColumns: TEAM_TABLE_COLUMN_WIDTHS.join(" ") }}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            name={name}
            fontSize="text-xs"
            size="h-8 w-8"
            avatarBgColor="bg-blue-50"
            avatarTextColor="text-blue-600"
          />
          <div className="min-w-0">
            <Typography
              variant="bodySmall"
              className="block truncate font-semibold"
            >
              {name}
            </Typography>
            <Typography variant="caption" color="body2" className="block truncate">
              {designation} · {tenure}
            </Typography>
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <Typography variant="caption" color="body2">
          <span className="font-semibold">{goalCount}</span> goals
        </Typography>
      </div>
      <div className="flex flex-col items-center">
        <Typography
          variant="caption"
          color="body2"
          className="mb-1 block font-medium"
        >
          {progress}%
        </Typography>
        <div className="flex items-center w-[130px]">
          <div className="h-1.5 flex-1 overflow-hidden rounded-md bg-gray-100">
            <div
              className={`h-full rounded-md ${getProgressColor(progress)}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-center whitespace-nowrap">
        <ToneBadge label={planStatus} tone={m.status_tone} />
      </div>
      <div className="flex justify-center whitespace-nowrap">
        <ToneBadge label={reviewStatus} />
      </div>
      <div className="flex justify-center whitespace-nowrap">
        {score ? (
          <Typography variant="caption" className="font-bold text-blue-600">
            {score}
          </Typography>
        ) : (
          <Typography variant="caption" className="text-gray-400">
            —
          </Typography>
        )}
      </div>
      <div className="whitespace-nowrap text-center">
        <div className="flex justify-center">
          <ActionButton actions={m.actions} />
        </div>
      </div>
    </div>
  );
});

export default TeamMemberItem;
