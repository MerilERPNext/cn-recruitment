import { useState } from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import CommonSearchAndActions from "../CommonSearchAndActions";
import HeaderBar from "../../HeaderBar";
import RequestTimeline from "./RequestDetailsCard";
import CardTable from "../../shared/CardTable";
import { FlowRequestItem } from "../../../types/flows";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import StatusBadge from "../../shared/atoms/statusBadge";
import { Typography } from "../../shared/atoms/Typography";

const titles = [
  "Stage Name",
  "Assigned To",
  "Action Taken By",
  "Status",
  "Trigger Date",
  "Due Date",
  "Completed Date",
  "Actions",
];



type FlowStatusType = "Approval Flow Status" | "Workflow Status";

interface RequestDetailsProps {
  data: FlowRequestItem,
  handleNavigateBack: () => void
}
const RequestDetails: React.FC<RequestDetailsProps> = ({ data, handleNavigateBack }) => {
  const [FlowStatusType, setFlowStatusType] = useState<FlowStatusType>(
    "Approval Flow Status",
  );

  const { isDesktop } = useScreenSize();

  return (
    <div className="min-h-screen bg-white">
      <div className="top-0 sticky z-10 bg-white">
        <div className="sm:px-4">
          <HeaderBar
            title={data.flow_name}
            onBack={handleNavigateBack}
          />
        </div>
        <div className="px-8  flex items-center justify-between mb-4 flex-wrap gap-4">
          <div className="flex w-full sm:w-fit border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {[
              { label: "Approval Flow Status", value: "Approval Flow Status" },
              { label: "Workflow Status", value: "Workflow Status" },
            ].map((btn, index) => {
              const isActive = FlowStatusType === btn.value;
              return (
                <button
                  key={btn.value}
                  onClick={() => setFlowStatusType(btn.value as FlowStatusType)}
                  disabled={isActive}
                  className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 
          ${isActive
                      ? "bg-blue-600 text-white font-semibold shadow-inner"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                    }
          ${index === 0 ? "rounded-l-2xl" : "rounded-r-2xl"}`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          <div className="text-sm flex sm:flex-col justify-between sm:w-fit w-full">
            <div>
              <span className="font-medium text-gray-500 ">Initiated By :</span>{" "}
              <span className="text-gray-900"> {data.initiated_by} </span>
            </div>
            <div>
              {" "}
              <span className="font-medium text-gray-500 ">
                Initiated On :
              </span>{" "}
              <span className="text-gray-900">{formatToIndianDate(data.initiated_on)}</span>{" "}
            </div>
          </div>
        </div>
        <div className="px-8 ">
          <CommonSearchAndActions hideEyeIcon={true} />
        </div>
      </div>

      <div className="sm:px-7 px-4">
        <CardTable titles={titles}>
          {isDesktop ? (
            <div className="w-full overflow-x-auto rounded-lg  border border-gray-200 bg-white shadow-sm">
              <div className="w-full">
                {data.approval_stages.length > 0 ? (
                  data.approval_stages.map((stage) => (
                    <div
                      key={stage.stage_name}
                      className="hover:bg-gray-100 py-4 text-center grid grid-cols-8 cursor-pointer text-xs w-full border-b"
                    >
                      <div>  <Typography variant="bodySmall" className="font-medium text-center">
                        {stage.stage_name}
                      </Typography></div>
                      <div>  <Typography variant="bodySmall" className="font-medium text-center">
                        {stage.role || stage.user || "-"}
                      </Typography></div>
                      <div>  <Typography variant="bodySmall" className="font-medium text-center">
                        {stage.approval_time || "-"}
                      </Typography></div>
                      <div>  <Typography variant="bodySmall" className="font-medium text-center">
                        <StatusBadge
                          status={stage.status || "-"}
                        />
                      </Typography></div>
                      <div>  <Typography variant="bodySmall" className="font-medium text-center">
                        {stage.approval_time || "-"}
                      </Typography></div>
                      <div>  <Typography variant="bodySmall" className="font-medium text-center">
                        {stage.approval_time || "-"}
                      </Typography></div>
                      <div>  <Typography variant="bodySmall" className="font-medium text-center">
                        {stage.approval_time || "-"}
                      </Typography></div>
                      <div>  <Typography variant="bodySmall" className="font-medium text-center">
                        {stage.approval_time || "-"}
                      </Typography></div>
                    </div>
                  ))
                ) : (
                  <EmptyState />
                )}
              </div>
            </div>
          ) : (
            <div>
              {data.approval_stages && data.approval_stages.length > 0 ? (
                <RequestTimeline stages={data.approval_stages} />
              ) : (
                <EmptyState />
              )}
            </div>
          )}
        </CardTable>
      </div>
    </div>
  );
};

const EmptyState = () => {
  return (
    <div className="py-14 text-center text-sm font-medium text-gray-500">
      No Records Found
    </div>
  );
};

export default RequestDetails;
