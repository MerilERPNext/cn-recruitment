import { ArrowRight, Check } from "lucide-react";
import React from "react";
import Button from "../../../../shared/atoms/Button";
import Avatar from "../../../../shared/Avatar";
import Badge from "../../../../shared/Badge";
import CardTable from "../../../../shared/CardTable";
import CustomDropdown from "../../../../shared/CustomDropdown";
import DataListView from "../../../../DataListView";
import { Typography } from "../../../../shared/atoms/Typography";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import { OverviewTeamMember } from "../../types";
import type { FrappePageResponse } from "../../../../../types/frappe";

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
        pulse={{ show: false }}
        icon={<Check className="w-3 h-3" />}
      />
    );
  if (status === "Pending")
    return (
      <Badge
        label="Pending"
        variant="warning"
        size="sm"
        pulse={{ show: false }}
      />
    );
  if (status === "Overdue")
    return (
      <Badge
        label="Overdue"
        variant="danger"
        size="sm"
        pulse={{ show: false }}
      />
    );
  return null;
};

const ReviewBadge = ({ status }: { status: string }) => {
  if (status === "Done")
    return (
      <Badge
        label="Done"
        variant="success"
        size="sm"
        pulse={{ show: false }}
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

const TEAM_TABLE_TITLES = [
  "Employee",
  "Goals",
  "Progress",
  "Self",
  "My Review",
  "Last Rating",
  "Action",
];

const TEAM_TABLE_COLUMN_WIDTHS = [
  "minmax(260px, 2fr)",
  "minmax(110px, 0.8fr)",
  "minmax(170px, 1.2fr)",
  "minmax(130px, 1fr)",
  "minmax(140px, 1fr)",
  "minmax(140px, 1fr)",
  "minmax(130px, 0.9fr)",
];

const STATUS_OPTIONS = [
  { label: "All status", value: "all" },
  { label: "Done", value: "done" },
  { label: "Pending", value: "pending" },
  { label: "Overdue", value: "overdue" },
];

const SORT_OPTIONS = [
  { label: "Sort: progress", value: "progress" },
  { label: "Sort: name", value: "name" },
  { label: "Sort: rating", value: "rating" },
];

interface TeamTableProps {
  isCompact: boolean;
  members: OverviewTeamMember[];
}

const TeamMemberAction = ({ action }: { action: string }) => {
  if (action === "Review") {
    return (
      <Button variant="contain" bgColor="primary" size="sm" fullWidth>
        Review <ArrowRight className="w-3 h-3 ml-1" />
      </Button>
    );
  }

  if (action === "Nudge") {
    return (
      <Button variant="contain" bgColor="primary" size="sm" fullWidth>
        Nudge
      </Button>
    );
  }

  if (action === "View") {
    return (
      <Button
        variant="outline"
        bgColor="primary"
        size="sm"
        fullWidth
        className="border-blue-200"
      >
        View
      </Button>
    );
  }

  return null;
};

const TeamMemberItem = ({ item: m }: { item: OverviewTeamMember }) => {
  const { isDesktop } = useScreenSize();

  if (!isDesktop) {
    return (
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
              <Typography variant="mobileCardTitle" className="break-words">
                {m.name}
              </Typography>
              <Typography variant="mobileCardSubtitle" className="block">
                {m.role} · {m.tenure}
              </Typography>
            </div>
          </div>
          <Typography
            variant="label"
            className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600"
          >
            {m.goals} goals
          </Typography>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <Typography variant="caption" className="font-medium text-slate-500">
              Progress
            </Typography>
            <Typography variant="caption" className="font-semibold text-slate-700">
              {m.progress}%
            </Typography>
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
            <Typography variant="mobileCardLabel" className="block">
              Self
            </Typography>
            <SelfBadge status={m.self} />
          </div>
          <div className="min-w-0">
            <Typography variant="mobileCardLabel" className="block">
              My Review
            </Typography>
            <ReviewBadge status={m.review} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="min-w-0">
            <Typography variant="mobileCardLabel" className="block">
              Last Rating
            </Typography>
            {m.lastRating ? (
              <Typography variant="caption" className={`font-bold ${m.ratingText}`}>
                {m.lastRating}
              </Typography>
            ) : (
              <Typography variant="caption" className="text-slate-400">
                —
              </Typography>
            )}
          </div>
          <div className="w-28 shrink-0">
            <TeamMemberAction action={m.action} />
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
            name={m.name}
            fontSize="text-xs"
            size="h-8 w-8"
            avatarBgColor="bg-blue-50"
            avatarTextColor="text-blue-600"
          />
          <div className="min-w-0">
            <Typography
              variant="bodySmall"
              className="block truncate font-semibold text-gray-900"
            >
              {m.name}
            </Typography>
            <Typography variant="caption" className="block truncate text-gray-500">
              {m.role} · {m.tenure}
            </Typography>
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <Typography variant="caption" className="text-gray-500">
          <span className="font-semibold text-gray-900">{m.goals}</span> goals
        </Typography>
      </div>
      <div className="flex flex-col items-center">
        <Typography
          variant="caption"
          className="mb-1 block font-medium text-gray-600"
        >
          {m.progress}%
        </Typography>
        <div className="flex items-center w-[130px]">
          <div className="h-1.5 flex-1 overflow-hidden rounded-md bg-gray-100">
            <div
              className={`h-full rounded-md ${getProgressColor(m.progress)}`}
              style={{ width: `${m.progress}%` }}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-center whitespace-nowrap">
        <SelfBadge status={m.self} />
      </div>
      <div className="flex justify-center whitespace-nowrap">
        <ReviewBadge status={m.review} />
      </div>
      <div className="flex justify-center whitespace-nowrap">
        {m.lastRating ? (
          <Typography variant="caption" className={`font-bold ${m.ratingText}`}>
            {m.lastRating}
          </Typography>
        ) : (
          <Typography variant="caption" className="text-gray-400">
            —
          </Typography>
        )}
      </div>
      <div className="whitespace-nowrap text-center">
        <div className="mx-auto w-24">
          <TeamMemberAction action={m.action} />
        </div>
      </div>
    </div>
  );
};

const TeamTable: React.FC<TeamTableProps> = ({ isCompact, members }) => {
  const [selectedStatus, setSelectedStatus] = React.useState("all");
  const [selectedSort, setSelectedSort] = React.useState("progress");
  const fetchMembers = React.useCallback(async (): Promise<FrappePageResponse> => {
    return {
      data: members as unknown as FrappePageResponse["data"],
      totalCount: members.length,
      hasNextPage: false,
      pages: [],
    };
  }, [members]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white pt-4 shadow-sm">
      <div
        className={`flex ${isCompact ? "flex-col gap-3" : "items-center justify-between"} px-4 pb-4 sm:px-5 lg:px-6`}
      >
        <div className="flex items-center gap-3">
          <Typography
            variant="label"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-600"
          >
            8
          </Typography>
          <div className="min-w-0">
            <Typography variant="bodySmall" className="font-semibold text-slate-950">
              Team reviews
            </Typography>
            <Typography variant="caption" className="text-slate-500">
              Track reportee progress and review status
            </Typography>
          </div>
        </div>
        <div className={`flex items-center gap-3 ${isCompact ? "flex-wrap w-full" : ""}`}>
          <CustomDropdown
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            options={STATUS_OPTIONS}
            position="bottom-right"
            className={isCompact ? "flex-1" : ""}
          />
          <CustomDropdown
            value={selectedSort}
            onChange={(event) => setSelectedSort(event.target.value)}
            options={SORT_OPTIONS}
            position="bottom-right"
            className={isCompact ? "flex-1" : ""}
          />
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
          <DataListView<OverviewTeamMember>
            queryKey="team-overview-members-mobile"
            fetchFunction={fetchMembers}
            isSearch={false}
            showPagination={false}
            showRefreshButton={false}
            pageSize={members.length}
            infiniteScroll={false}
            loadMorePagination={false}
            enableUrlParams={false}
            getItemKey={(item) => item.id}
            ItemComponent={({ item }) => <TeamMemberItem item={item} />}
          />
        </div>
      ) : (
        <CardTable
          titles={TEAM_TABLE_TITLES}
          columnWidths={TEAM_TABLE_COLUMN_WIDTHS}
          noBorder
          noShadow
          noRound
        >
          <div className="w-full min-w-[1080px]">
            <DataListView<OverviewTeamMember>
              queryKey="team-overview-members"
              fetchFunction={fetchMembers}
              isSearch={false}
              showPagination={false}
              showRefreshButton={false}
              pageSize={members.length}
              infiniteScroll={false}
              loadMorePagination={false}
              enableUrlParams={false}
              getItemKey={(item) => item.id}
              ItemComponent={({ item }) => <TeamMemberItem item={item} />}
            />
          </div>
        </CardTable>
      )}
    </section>
  );
};

export default TeamTable;
