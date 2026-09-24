import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Lock,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink,
  Calendar,
  User,
  Hash,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  usePipFlowTriggerList,
  usePipFunnelActivities,
} from "../../../../../hooks/usePip";
import {
  useChatAssistantFlowInitiateData,
} from "../../../../../hooks/useFlows";
import type {
  PipFlowTriggerItem,
  PipFunnelActivityItem,
} from "../../../../../types/pip";

import { Typography } from "../../../../shared/atoms/Typography";
import Button from "../../../../shared/atoms/Button";
import NoDataFound from "../../../../shared/atoms/NoDataFound";
import ActionConfirmationModal from "../../../../shared/ActionConfirmationModal";
import WrapperHoverCard from "../../../../shared/WrapperHoverCard";
import formatToIndianDate from "../../../../../utils/formatToIndianDate";
import { errorResponseFormater } from "../../../../../utils/errorResponseFormater";
import { useGetUiPermission } from "../../../../../hooks/userUiPermission";
import { isActionEnabled } from "../../../../../utils/uiPermission";
import { PIPCardDetailDrawer } from "./PIPCardDetailDrawer";

interface PIPCardsSectionProps {
  employeeId: string;
  employeeName?: string;
}

/**
 * Loading skeleton for PIP cards section
 */
const PIPCardsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col justify-between min-h-[260px] space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="h-5 w-20 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-3/4 bg-gray-100 rounded" />
          <div className="h-4 w-1/2 bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-full bg-gray-200 rounded-xl" />
      </div>
    ))}
  </div>
);

/**
 * Status badge helper for overall flow status
 */
const renderOverallStatusBadge = (status?: string) => {
  const normalized = (status || "").toLowerCase();
  if (normalized.includes("completed") || normalized.includes("approved")) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <Typography variant="caption" className="font-semibold text-inherit text-xs">
          {status || "Completed"}
        </Typography>
      </span>
    );
  }
  if (normalized.includes("rejected") || normalized.includes("failed")) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/80">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        <Typography variant="caption" className="font-semibold text-inherit text-xs">
          {status || "Rejected"}
        </Typography>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80">
      <Clock className="w-3.5 h-3.5 text-amber-600" />
      <Typography variant="caption" className="font-semibold text-inherit text-xs">
        {status || "Pending"}
      </Typography>
    </span>
  );
};

export const PIPCardsSection: React.FC<PIPCardsSectionProps> = ({
  employeeId,
  employeeName,
}) => {
  const queryClient = useQueryClient();
  const [selectedTrigger, setSelectedTrigger] =
    useState<PipFlowTriggerItem | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [drillDownRequestId, setDrillDownRequestId] = useState<string | null>(null);

  // API 1: PIP flow catalogue + lock state
  const {
    data: pipTriggers,
    isLoading: isLoadingTriggers,
    isError: isTriggersError,
    error: triggersError,
    refetch: refetchTriggers,
  } = usePipFlowTriggerList(employeeId);

  // API 2: Funnel activity history (what actually happened)
  const {
    data: pipActivities,
    isLoading: isLoadingActivities,
    isError: isActivitiesError,
    error: activitiesError,
    refetch: refetchActivities,
  } = usePipFunnelActivities(employeeId);

  // UI permission check for HR Process -> Performance Improvement -> initiate_pip
  const { data: userUiPermission } = useGetUiPermission("HR Process");
  const canInitiatePipAction = isActionEnabled(
    userUiPermission,
    "initiate_pip",
    "Performance Improvement"
  );

  // Flow initiation mutation
  const { mutateAsync: initiateFlow, isPending: isInitiatingFlow } =
    useChatAssistantFlowInitiateData();

  // Step 1: Sort triggers ascending by pip_priority
  const sortedTriggers = useMemo(() => {
    if (!pipTriggers || !Array.isArray(pipTriggers)) return [];
    return [...pipTriggers].sort(
      (a, b) =>
        (a.pip_status?.pip_priority ?? 0) - (b.pip_status?.pip_priority ?? 0)
    );
  }, [pipTriggers]);

  // Step 2: Build a map keyed by flow_name from API 2
  const activityByFlowTitle = useMemo(() => {
    const map = new Map<string, PipFunnelActivityItem>();
    if (!pipActivities || !Array.isArray(pipActivities)) return map;

    for (const act of pipActivities) {
      if (act.flow_name) {
        map.set(act.flow_name, act);
        map.set(act.flow_name.trim().toLowerCase(), act);
      }
      if (act.category) {
        map.set(act.category, act);
        map.set(act.category.trim().toLowerCase(), act);
      }
    }
    return map;
  }, [pipActivities]);

  const handleInitiateClick = (trigger: PipFlowTriggerItem) => {
    setSelectedTrigger(trigger);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmInitiate = async () => {
    if (!selectedTrigger || !employeeId) return;

    try {
      const result = await initiateFlow({
        document_name: employeeId,
        definition_name: selectedTrigger.name,
      });

      setIsConfirmModalOpen(false);
      setSelectedTrigger(null);

      if (
        typeof window !== "undefined" &&
        typeof window.trigger_chatnext_assistant === "function"
      ) {
        window.trigger_chatnext_assistant(true, result?.session);
      } else {
        toast.success(
          `PIP flow initiated successfully for ${employeeName || employeeId}`
        );
      }

      // Invalidate relevant queries for the selected employee to ensure all funnel and PIP data updates
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["pip-funnel-activities", employeeId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["pip-flow-trigger-list", employeeId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["pip-flow-requests-by-employee", employeeId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["pip-flow-requests-for-employee", employeeId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["flowRequests"],
        }),
      ]);

      refetchTriggers();
      refetchActivities();
    } catch (err) {
      toast.error(
        errorResponseFormater(err, "Failed to initiate PIP flow.")
      );
      setIsConfirmModalOpen(false);
    }
  };

  const isLoading = isLoadingTriggers || isLoadingActivities;
  const isError = isTriggersError || isActivitiesError;
  const error = triggersError || activitiesError;

  if (isLoading) {
    return <PIPCardsSkeleton />;
  }

  if (isError) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <Typography variant="bodyMedium" className="text-rose-800 font-semibold">
          Failed to load PIP stages
        </Typography>
        <Typography variant="bodySmall" className="text-rose-600">
          {errorResponseFormater(error, "Could not fetch PIP status for this employee.")}
        </Typography>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchTriggers();
            refetchActivities();
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (sortedTriggers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-xs">
        <NoDataFound
          title="No PIP Flows Configured"
          subtitle="No Performance Improvement Plan flows are configured for this employee."
        />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {sortedTriggers.map((trigger, idx) => {
          const pipStatus = trigger.pip_status;
          const priority = pipStatus?.pip_priority ?? idx + 1;
          const title = `PIP ${priority}`;

          // Step 3: Per card, look up map[pip_status.flow_title] (two APIs join on flow title)
          const flowTitle =
            pipStatus?.flow_title ||
            trigger.funnel_name ||
            trigger.name_of_action ||
            "";

          const activity =
            activityByFlowTitle.get(flowTitle) ||
            activityByFlowTitle.get(flowTitle.trim().toLowerCase()) ||
            (pipStatus?.flow_config
              ? activityByFlowTitle.get(pipStatus.flow_config) ||
              activityByFlowTitle.get(pipStatus.flow_config.trim().toLowerCase())
              : undefined);

          const activityStatus = (
            activity?.overall_flow_status ||
            activity?.approval_status ||
            ""
          ).toLowerCase();

          const isActivityPending = Boolean(
            activity &&
            (activityStatus.includes("pending") ||
              activityStatus.includes("in progress") ||
              activityStatus.includes("in-progress") ||
              (!activityStatus.includes("completed") &&
                !activityStatus.includes("approved") &&
                !activityStatus.includes("rejected") &&
                !activityStatus.includes("failed") &&
                !activityStatus.includes("cancelled")))
          );

          // Card state: locked/completed from API 1, or pending from API 2, gated by initiate_pip action
          const isCompleted = Boolean(pipStatus?.completed);
          const isLocked = Boolean(pipStatus?.locked);
          const canInitiate =
            !isLocked && !isCompleted && !isActivityPending && canInitiatePipAction;

          // Unlock message if locked: previous PIP stage must be completed
          const unlockMessage =
            priority > 1
              ? `Unlocks once PIP ${priority - 1} is completed.`
              : pipStatus?.blocked_by_priority
                ? `Unlocks once PIP ${pipStatus.blocked_by_priority} is completed.`
                : pipStatus?.blocked_by
                  ? `Unlocks once ${pipStatus.blocked_by} is completed.`
                  : pipStatus?.lock_message || "This PIP cycle is currently locked.";

          return (
            <div
              key={trigger.name || `pip-${priority}-${idx}`}
              className="bg-white rounded-2xl border border-gray-200/90 p-6 flex flex-col justify-between min-h-[250px] transition-all duration-200 shadow-2xs hover:shadow-xs"
            >
              {/* Card Header & Content */}
              <div>
                {/* Top Row: Title & Status Indicator */}
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Typography variant="subheading" className="font-bold text-gray-900 text-base block">
                      {title}
                    </Typography>
                    {pipStatus?.flow_title && (
                      <Typography
                        variant="caption"
                        className="text-[11px] text-gray-400 font-normal block truncate max-w-[180px]"
                      >
                        {pipStatus.flow_title}
                      </Typography>
                    )}
                  </div>

                  {/* Status badge: API 1 lock/completion takes precedence, then API 2 activity status */}
                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <Typography variant="caption" className="font-semibold text-inherit text-xs">
                        Completed
                      </Typography>
                    </span>
                  ) : isLocked ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                      <Typography variant="caption" className="font-medium text-inherit text-xs">
                        Locked
                      </Typography>
                    </span>
                  ) : activity ? (
                    renderOverallStatusBadge(
                      activity.overall_flow_status || activity.approval_status
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                      <Plus className="w-3.5 h-3.5 text-gray-400" />
                      <Typography variant="caption" className="font-medium text-inherit text-xs">
                        Not started
                      </Typography>
                    </span>
                  )}
                </div>

                {/* Subtitle / Activity Details */}
                {isLocked ? (
                  <Typography variant="bodySmall" className="text-sm mt-4 leading-relaxed text-gray-400 block">
                    {unlockMessage}
                  </Typography>
                ) : activity ? (
                  /* Found in API 2: show overall_flow_status, initiated_on, initiated_by, request_id */
                  <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <Typography variant="caption" className="text-gray-500 inline-flex items-center gap-1 text-xs">
                        <Hash className="w-3.5 h-3.5 text-gray-400" /> Request ID:
                      </Typography>
                      <Typography
                        variant="caption"
                        className="font-mono font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200/50 text-xs"
                      >
                        #{activity.request_id}
                      </Typography>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <Typography variant="caption" className="text-gray-500 inline-flex items-center gap-1 text-xs">
                        <Clock className="w-3.5 h-3.5 text-gray-400" /> Overall Status:
                      </Typography>
                      <Typography variant="caption" className="font-semibold text-gray-800 text-xs">
                        {activity.overall_flow_status || activity.approval_status || "—"}
                      </Typography>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <Typography variant="caption" className="text-gray-500 inline-flex items-center gap-1 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" /> Initiated On:
                      </Typography>
                      <Typography variant="caption" className="font-semibold text-gray-800 text-xs">
                        {activity.initiated_on ? formatToIndianDate(activity.initiated_on) : "—"}
                      </Typography>
                    </div>

                    {(activity.initiated_by || activity.initiated_by_emp_id) && (
                      <div className="flex items-center justify-between gap-2">
                        <Typography variant="caption" className="text-gray-500 inline-flex items-center gap-1 shrink-0 text-xs">
                          <User className="w-3.5 h-3.5 text-gray-400" /> Initiated By:
                        </Typography>
                        {activity.initiated_by_emp_id ? (
                          <WrapperHoverCard employeeId={activity.initiated_by_emp_id}>
                            <Typography
                              variant="caption"
                              className="font-semibold text-gray-800 truncate max-w-[130px] cursor-pointer hover:underline hover:text-primary inline-block text-xs"
                              title={activity.initiated_by || activity.initiated_by_emp_id}
                            >
                              {activity.initiated_by || activity.initiated_by_emp_id}
                            </Typography>
                          </WrapperHoverCard>
                        ) : (
                          <Typography
                            variant="caption"
                            className="font-semibold text-gray-800 truncate max-w-[130px] text-xs"
                            title={activity.initiated_by}
                          >
                            {activity.initiated_by}
                          </Typography>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Not found: never started */
                  <Typography variant="bodySmall" className="text-sm mt-4 leading-relaxed text-gray-500 block">
                    {isCompleted
                      ? "This PIP cycle has been completed."
                      : "No PIP has been started for this employee yet."}
                  </Typography>
                )}
              </div>

              {/* Bottom Actions:
                  - Initiate button if locked=false, completed=false
                  - Drill-down view details if activity is found
              */}
              <div className="pt-5 space-y-2">
                {activity && (
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => setDrillDownRequestId(activity.request_id)}
                    className="justify-center font-semibold text-xs shadow-2xs hover:bg-gray-50"
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    View Details
                  </Button>
                )}

                {canInitiate && (
                  <Button
                    variant="contain"
                    bgColor="primary"
                    size="md"
                    fullWidth
                    onClick={() => handleInitiateClick(trigger)}
                    className="justify-center font-semibold text-sm shadow-xs"
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Initiate {title}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal for Initiating PIP */}
      <ActionConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Initiate Performance Improvement Plan"
        message={`Are you sure you want to initiate PIP ${selectedTrigger?.pip_status?.pip_priority || ""
          } for ${employeeName || employeeId}? This will start the PIP workflow.`}
        confirmLabel="Yes, Initiate PIP"
        cancelLabel="Cancel"
        confirmBgColor="primary"
        isPending={isInitiatingFlow}
        onConfirm={handleConfirmInitiate}
        onCancel={() => {
          setIsConfirmModalOpen(false);
          setSelectedTrigger(null);
        }}
      />

      {/* Step 4 Drill-down Drawer via get_funnel_activity_detail_by_id */}
      <PIPCardDetailDrawer
        requestId={drillDownRequestId}
        targetEmployeeId={employeeId}
        onClose={() => setDrillDownRequestId(null)}
      />
    </>
  );
};

export default PIPCardsSection;
