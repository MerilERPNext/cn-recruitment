import { ArrowRight, ArrowUp, Check, ChevronDown } from "lucide-react";
import React from "react";
import Button from "../../../../shared/atoms/Button";
import Avatar from "../../../../shared/Avatar";
import Badge from "../../../../shared/Badge";
import { OverviewTeamMember } from "../../types";

const getProgressColor = (progress: number) => {
  if (progress >= 70) return "bg-green-500";
  if (progress >= 40) return "bg-blue-500";
  return "bg-red-500";
};

const SelfBadge = ({ status }: { status: string }) => {
  if (status === "Done")
    return (
      <Badge
        label="Done"
        variant="success"
        size="sm"
        icon={<Check className="w-3 h-3" />}
      />
    );
  if (status === "Pending")
    return <Badge label="Pending" variant="warning" size="sm" />;
  if (status === "Overdue")
    return <Badge label="Overdue" variant="danger" size="sm" />;
  return null;
};

const ReviewBadge = ({ status }: { status: string }) => {
  if (status === "Done")
    return (
      <Badge
        label="Done"
        variant="success"
        size="sm"
        icon={<Check className="w-3 h-3" />}
      />
    );
  return (
    <Badge
      label="Not started"
      backgroundColor="bg-gray-100"
      textColor="text-gray-500"
      size="sm"
    />
  );
};

interface TeamTableProps {
  isCompact: boolean;
  members: OverviewTeamMember[];
}

const TeamTable: React.FC<TeamTableProps> = ({ isCompact, members }) => {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white pt-4 shadow-sm">
      <div
        className={`flex ${isCompact ? "flex-col gap-3" : "items-center justify-between"} px-4 pb-4 sm:px-5 lg:px-6`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-600">
            8
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">Team reviews</p>
            <p className="text-xs text-slate-500">Track reportee progress and review status</p>
          </div>
        </div>
        <div className={`flex items-center gap-3 ${isCompact ? "flex-wrap w-full" : ""}`}>
          <button
            className={`flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 ${isCompact ? "flex-1 justify-center" : ""}`}
            aria-label="Filter team by status"
          >
            All status <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          <button
            className={`flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 ${isCompact ? "flex-1 justify-center" : ""}`}
            aria-label="Sort team by progress"
          >
            Sort: progress{" "}
            <ArrowUp className="h-3 w-3 rotate-180 text-slate-400" />
          </button>
          <Button
            variant="contain"
            bgColor="primary"
            className={`${isCompact ? "w-full" : "px-4 py-2"} justify-center rounded-lg bg-[#1a73e8] text-xs font-semibold hover:bg-blue-600`}
          >
            Nudge 2 overdue
          </Button>
        </div>
      </div>

      {isCompact ? (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-3 sm:p-4">
          {members.map((m) => (
            <article key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Avatar
                    name={m.name}
                    fontSize="text-xs"
                    size="h-9 w-9"
                    avatarBgColor="bg-blue-50"
                    avatarTextColor="text-blue-600"
                  />
                  <div className="min-w-0">
                    <span className="block break-words text-sm font-semibold text-slate-950">
                      {m.name}
                    </span>
                    <span className="block break-words text-xs text-slate-500">
                      {m.role} · {m.tenure}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {m.goals} goals
                </span>
              </div>

              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-500">Progress</span>
                  <span className="text-xs font-semibold text-slate-700">{m.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-md bg-slate-200">
                  <div
                    className={`h-full rounded-md ${getProgressColor(m.progress)}`}
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <p className="mb-1.5 text-[10px] font-bold uppercase text-slate-400">Self</p>
                  <SelfBadge status={m.self} />
                </div>
                <div className="min-w-0">
                  <p className="mb-1.5 text-[10px] font-bold uppercase text-slate-400">My Review</p>
                  <ReviewBadge status={m.review} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Last Rating</p>
                  {m.lastRating ? (
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${m.ratingColor}`} />
                      <span className={`text-xs font-bold ${m.ratingText}`}>
                        {m.lastRating}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>
                <div className="w-28 shrink-0">
                  {m.action === "Review" && (
                    <Button variant="contain" bgColor="primary" size="sm" fullWidth>
                      Review <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                  {m.action === "Nudge" && (
                    <Button variant="contain" bgColor="primary" size="sm" fullWidth>
                      Nudge
                    </Button>
                  )}
                  {m.action === "View" && (
                    <Button variant="outline" bgColor="primary" size="sm" fullWidth className="border-blue-200">
                      View
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-y border-gray-100">
              <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[240px]">
                Employee
              </th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[100px]">
                Goals
              </th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[160px]">
                Progress
              </th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[120px]">
                Self
              </th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[130px]">
                My Review
              </th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[100px]">
                Last Rating
              </th>
              <th className="py-3 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center w-[110px]">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-6">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={m.name}
                      fontSize="text-xs"
                      size="h-8 w-8"
                      avatarBgColor="bg-blue-50"
                      avatarTextColor="text-blue-600"
                    />
                    <div>
                      <span className="font-semibold text-[13px] text-gray-900 block">
                        {m.name}
                      </span>
                      <span className="text-[11px] text-gray-500 block">
                        {m.role} · {m.tenure}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[12px] text-gray-500">
                    <span className="font-semibold text-gray-900">{m.goals}</span>{" "}
                    goals
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[11px] text-gray-600 font-medium block mb-1">
                    {m.progress}%
                  </span>
                  <div className="flex items-center w-[130px]">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-md bg-gray-100">
                      <div
                        className={`h-full rounded-md ${getProgressColor(m.progress)}`}
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <SelfBadge status={m.self} />
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <ReviewBadge status={m.review} />
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  {m.lastRating ? (
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${m.ratingColor}`} />
                      <span className={`text-[11px] font-bold ${m.ratingText}`}>
                        {m.lastRating}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-400">—</span>
                  )}
                </td>
                <td className="py-3 px-6 whitespace-nowrap text-center">
                  <div className="mx-auto w-24">
                    {m.action === "Review" && (
                      <Button
                        variant="contain"
                        bgColor="primary"
                        size="sm"
                        fullWidth
                      >
                        Review <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                    {m.action === "Nudge" && (
                      <Button
                        variant="contain"
                        bgColor="primary"
                        size="sm"
                        fullWidth
                      >
                        Nudge
                      </Button>
                    )}
                    {m.action === "View" && (
                      <Button
                        variant="outline"
                        bgColor="primary"
                        size="sm"
                        fullWidth
                        className="border-blue-200"
                      >
                        View
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </section>
  );
};

export default TeamTable;
