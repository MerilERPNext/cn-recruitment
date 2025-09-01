import React from "react";
import FlowRequestCard, { FlowRequest } from "./FlowRequestCard";
import { useNavigate } from "react-router-dom";

const mockData: FlowRequest[] = [
  {
    id: "CF_REQ_83",
    title: "Test_Com",
    triggerEvent: "Business Flow",
    initiatedDate: "26-12-2024",
    approvalStatus: "-",
    workflowStatus: "In Progress",
    customFlowStatus: "ACTIVE",
  },
  {
    id: "CF_REQ_77",
    title: "Marriage flow",
    triggerEvent: "Business Flow",
    initiatedDate: "02-08-2024",
    approvalStatus: "Completed",
    workflowStatus: "Completed",
    customFlowStatus: "COMPLETED",
    lastUpdatedOn: "02-08-2024",
  },
  {
    id: "CF_REQ_75",
    title: "Marriage flow",
    triggerEvent: "Business Flow",
    initiatedDate: "02-08-2024",
    approvalStatus: "Completed",
    workflowStatus: "Completed",
    customFlowStatus: "COMPLETED",
    lastUpdatedOn: "02-08-2024",
  },
  {
    id: "CF_REQ_87",
    title: "Marriage flow",
    triggerEvent: "Business Flow",
    initiatedDate: "02-08-2024",
    approvalStatus: "Completed",
    workflowStatus: "Completed",
    customFlowStatus: "COMPLETED",
    lastUpdatedOn: "02-08-2024",
  },
  {
    id: "CF_REQ_88",
    title: "Marriage flow",
    triggerEvent: "Business Flow",
    initiatedDate: "02-08-2024",
    approvalStatus: "Completed",
    workflowStatus: "Completed",
    customFlowStatus: "COMPLETED",
    lastUpdatedOn: "02-08-2024",
  },
];

const FlowRequests: React.FC = () => {
  const navigate = useNavigate();
  return (
    <>
      <div className="pb-10">
        {mockData.map((req) => (
          <FlowRequestCard key={req.id} request={req} />
        ))}
      </div>
      <div className="w-full fixed bottom-0 left-0 bg-white p-2">
        <button
          onClick={() => navigate("/webapp/tracker-app/initiate")}
          className=" bg-black rounded-lg text-white px-4 py-3 w-full shadow-lg"
        >
          + INITIATE
        </button>
      </div>
    </>
  );
};

export default FlowRequests;
