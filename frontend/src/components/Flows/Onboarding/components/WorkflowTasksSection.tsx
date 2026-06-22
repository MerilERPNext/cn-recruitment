import { memo } from "react";
import Badge from "../../../shared/Badge";
import CardTable from "../../../shared/CardTable";
import { Typography } from "../../../shared/atoms/Typography";
import SearchInput from "./SearchInput";
import { WorkflowTaskRow } from "./types";

interface WorkflowTasksSectionProps {
  tasks: WorkflowTaskRow[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isDesktop: boolean;
}

const WorkflowTasksSection = ({
  tasks,
  searchQuery,
  onSearchChange,
  isDesktop,
}: WorkflowTasksSectionProps) => (
  <div className="space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      <SearchInput value={searchQuery} onChange={onSearchChange} />

      <a href="#" className="shrink-0 text-blue-500 hover:text-blue-700 font-semibold text-sm transition-colors">
        View Detailed Task
      </a>
    </div>

    <CardTable
      titles={[
        "Task Name & Category",
        "Status",
        "Assignee",
        "Time Since Trigger",
        "Actions",
      ]}
      columnWidths={["2fr", "1fr", "1fr", "1fr", "1fr"]}
    >
      {tasks.length > 0 ? (
        tasks.map((task, idx) =>
          isDesktop ? (
            <WorkflowDesktopRow key={idx} task={task} />
          ) : (
            <WorkflowMobileRow key={idx} task={task} />
          )
        )
      ) : (
        <div className="p-8 text-center text-slate-400 text-sm">
          No tasks found
        </div>
      )}
    </CardTable>
  </div>
);

const WorkflowDesktopRow = memo(({ task }: { task: WorkflowTaskRow }) => (
  <div
    className="grid gap-4 px-6 py-4 border-b border-slate-100 items-center hover:bg-slate-50/50 transition-colors text-sm"
    style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr" }}
  >
    <div className="text-center">
      <Typography variant="bodySmall" className="font-bold text-left text-slate-800 block">
        {task.name}
      </Typography>
      <Typography variant="caption" className="text-slate-400 text-left block mt-0.5">
        {task.category}
      </Typography>
    </div>
    <div className="flex justify-center">
      <Badge
        label={task.status}
        variant={task.status === "Completed" ? "success" : "warning"}
        size="sm"
      />
    </div>
    <Typography variant="bodySmall" className="text-slate-700 text-center">
      {task.assignee}
    </Typography>
    <Typography variant="bodySmall" className="text-slate-500 text-center">
      {task.timeSinceTrigger}
    </Typography>
    <div className="text-center">-</div>
  </div>
));

const WorkflowMobileRow = memo(({ task }: { task: WorkflowTaskRow }) => (
  <div className="p-4 border-b border-slate-100 hover:bg-slate-50/50 transition-colors space-y-3">
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
        <Typography variant="body" className="font-bold text-slate-800 block break-words">
          {task.name}
        </Typography>
        <Typography variant="caption" className="text-slate-400 block mt-0.5">
          {task.category}
        </Typography>
      </div>
      <Badge
        label={task.status}
        variant={task.status === "Completed" ? "success" : "warning"}
        size="sm"
      />
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
      <div>
        <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
          Assignee
        </span>
        <span>{task.assignee}</span>
      </div>
      <div>
        <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
          Time Since Trigger
        </span>
        <span>{task.timeSinceTrigger}</span>
      </div>
    </div>
  </div>
));

export default memo(WorkflowTasksSection);
