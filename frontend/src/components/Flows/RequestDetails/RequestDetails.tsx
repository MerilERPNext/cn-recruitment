import { useState } from "react";
import CommonSearchAndActions from "../CommonSearchAndActions";
import HeaderBar from "../../HeaderBar";
import { FlowRequestItem } from "../../../types/flows";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import FlowTable from "./FlowTable";
import WorkflowTable from "./WorkflowTable";

type FlowStatusType = "Approval Flow Status" | "Workflow Status";

interface RequestDetailsProps {
  data: FlowRequestItem,
  handleNavigateBack: () => void
}
const RequestDetails: React.FC<RequestDetailsProps> = ({ data, handleNavigateBack }) => {
  const [FlowStatusType, setFlowStatusType] = useState<FlowStatusType>(
    "Approval Flow Status",
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white">
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

      {FlowStatusType === "Approval Flow Status" ? (
        <FlowTable data={data} />
      ) : (
        <WorkflowTable data={data} />
      )}
    </div>
  );
};

export default RequestDetails;
