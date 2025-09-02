import React from "react";
import { useNavigate } from "react-router-dom";

export type FlowRequest = {
  id: string;
  title: string;
  triggerEvent: string;
  initiatedDate: string;
  approvalStatus: string;
  workflowStatus: string;
  customFlowStatus: string;
  lastUpdatedOn?: string;
};

interface Props {
  request: FlowRequest;
}

const FlowRequestCard: React.FC<Props> = ({ request }) => {
  const navigate = useNavigate();
  return (
    <div
      className="bg-white shadow border border-gray-100 rounded-2xl p-4 mb-4"
      onClick={() =>
        navigate(`/webapp/tracker-app/details/${request.id}`, {
          state: { request },
        })
      }
    >
      <h2 className="text-lg font-semibold mb-3">{request.title}</h2>

      <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-700">
        <p>
          <span className="font-medium">Request ID</span> <br />
          {request.id}
        </p>
        <p>
          <span className="font-medium">Trigger Event</span> <br />
          {request.triggerEvent}
        </p>

        <p>
          <span className="font-medium">Initiated Date</span> <br />
          {request.initiatedDate}
        </p>
        <p>
          <span className="font-medium">Approval Status</span> <br />
          {request.approvalStatus}
        </p>

        <p>
          <span className="font-medium">CustomFlow Status</span> <br />
          {request.customFlowStatus}
        </p>
        <p>
          <span className="font-medium">Workflow Status</span> <br />
          {request.workflowStatus}
        </p>

        {request.lastUpdatedOn && (
          <p>
            <span className="font-medium">Last Updated On</span> <br />
            {request.lastUpdatedOn}
          </p>
        )}
      </div>
    </div>
  );
};

export default FlowRequestCard;
