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
    <section className="bg-white rounded-xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden pt-4">
      <div
        className={`flex ${isCompact ? "flex-col gap-3" : "items-center justify-between"} px-6 pb-4`}
      >
        <div className="flex items-center pl-4">
          <span className="bg-gray-100 text-gray-500 text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full">
            8
          </span>
        </div>
        <div className={`flex items-center gap-3 ${isCompact ? "flex-wrap w-full" : ""}`}>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 font-medium hover:bg-gray-50 transition-colors bg-white ${isCompact ? "flex-1 justify-center" : ""}`}
            aria-label="Filter team by status"
          >
            All status <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 font-medium hover:bg-gray-50 transition-colors bg-white ${isCompact ? "flex-1 justify-center" : ""}`}
            aria-label="Sort team by progress"
          >
            Sort: progress{" "}
            <ArrowUp className="w-3 h-3 text-gray-400 rotate-180" />
          </button>
          <Button
            variant="contain"
            bgColor="primary"
            className={`${isCompact ? "w-full" : "px-4 py-1.5"} text-xs font-semibold bg-[#1a73e8] hover:bg-blue-600 rounded-lg justify-center`}
          >
            Nudge 2 overdue
          </Button>
        </div>
      </div>

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
    </section>
  );
};

export default TeamTable;
