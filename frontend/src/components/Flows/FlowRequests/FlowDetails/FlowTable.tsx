import FlowTableRow from "./FlowTableRow";
import FlowTableCard from "./FlowTableCard";
import CardTable from "../../../shared/CardTable";
import { useScreenSize } from "../../../../hooks/useScreenSize";

import { FlowRequestItem } from "../../../../types/flows";

import { StaticListView } from "../../../ListView";
import { CardSkeleton } from "../../../shared/molecules/Skeletons/TableSkeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useApprovalAction } from "../../../../hooks/userApprovalList";

const titles = [
  "Stage Name",
  "Status",
  "Due Date",
  "Completed Date",
  "Actions",
];

interface FlowTableProps {
  data: FlowRequestItem;
}

const FlowTable: React.FC<FlowTableProps> = ({ data }) => {
  const { isDesktop } = useScreenSize();
  const activeStageIndex =
    data.approval_status === "Pending"
      ? data.approval_stages.findIndex((stage) => stage.status === "Pending")
      : -1;

  const queryClient = useQueryClient();
  const triggerRefetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["employee-flow-requests"] });
    queryClient.invalidateQueries({ queryKey: ["employee-flow-request-details"] });
  }, [queryClient]);

  const { handleAction } = useApprovalAction(triggerRefetch);

  return (
    <div className="sm:px-7 px-4 max-sm:pb-8">
      <CardTable titles={titles}>
        <StaticListView
          data={data.approval_stages}
          ItemComponent={(index, item) =>
            isDesktop ? (
              <FlowTableRow
                stage={item}
                isActive={index === activeStageIndex}
                stages={data.approval_stages}
                stageIndex={index}
                initiatorForms={data.initiator_forms}
                handleAction={handleAction}
              />
            ) : (
              <FlowTableCard
                stage={item}
                index={index}
                stages={data?.approval_stages}
                isActive={index === activeStageIndex}
                initiatorForms={data.initiator_forms}
                handleAction={handleAction}
              />
            )
          }
          getItemKey={(stage, index) => stage?.stage_name + index}
          pageSize={20}
          SkeletonComponent={CardSkeleton}
          loadMorePagination={true}
        />
      </CardTable>
    </div>
  );
};


export default FlowTable;
