import FlowTableRow from "./FlowTableRow";
import FlowTableCard from "./FlowTableCard";
import CardTable from "../../../shared/CardTable";
import { useScreenSize } from "../../../../hooks/useScreenSize";

import {
  FlowInitiatorForm,
  FlowRequestItem,
  FlowRequestStage,
  FlowRevokeForm,
} from "../../../../types/flows";

import { StaticListView } from "../../../ListView";
import { CardSkeleton } from "../../../shared/molecules/Skeletons/TableSkeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useApprovalAction } from "../../../../hooks/userApprovalList";

const titles = [
  "Stage Name",
  "Assigned To",
  "Action Taken By",
  "Status",
  "Actual Trigger Date",
  "Due Date",
  "Completed Date",
  "Actions",
];

export interface FlowTableData {
  approval_status?: string;
  approval_stages?: FlowRequestStage[];
  initiator_forms?: FlowInitiatorForm[] | FlowRevokeForm[];
  [key: string]: unknown;
}

interface FlowTableProps {
  data: FlowRequestItem | FlowTableData;
  noPadding?: boolean;
}

const FlowTable: React.FC<FlowTableProps> = ({ data, noPadding = false }) => {
  const { isDesktop } = useScreenSize();
  const stages = data.approval_stages || [];
  const activeStageIndex =
    data.approval_status === "Pending"
      ? stages.findIndex((stage) => stage.status === "Pending")
      : -1;

  const queryClient = useQueryClient();
  const triggerRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["employee-flow-requests"] });
    queryClient.invalidateQueries({ queryKey: ["employee-flow-request-details"] });
  }, [queryClient]);

  const { handleAction } = useApprovalAction(triggerRefetch);

  return (
    <div className={noPadding ? "px-4 sm:px-0 max-sm:pb-8" : "sm:px-7 px-4 max-sm:pb-8"}>
      <CardTable
        titles={titles}
        noBorder={noPadding || !isDesktop}
        noShadow={noPadding || !isDesktop}
        noRound={noPadding || !isDesktop}
      >
        <StaticListView
          data={stages}
          ItemComponent={(index, item) =>
            isDesktop ? (
              <FlowTableRow
                stage={item}
                isActive={index === activeStageIndex}
                stages={stages}
                stageIndex={index}
                initiatorForms={data.initiator_forms as FlowInitiatorForm[]}
                handleAction={handleAction}
              />
            ) : (
              <FlowTableCard
                stage={item}
                index={index}
                stages={stages}
                isActive={index === activeStageIndex}
                initiatorForms={data.initiator_forms as FlowInitiatorForm[]}
                handleAction={handleAction}
              />
            )
          }
          getItemKey={(stage, index) => (stage?.stage_name ?? "") + index}
          pageSize={20}
          SkeletonComponent={CardSkeleton}
          loadMorePagination={true}
        />
      </CardTable>
    </div>
  );
};

export default FlowTable;
