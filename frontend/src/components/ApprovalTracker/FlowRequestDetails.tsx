import React from "react";
import { useLocation, useParams } from "react-router-dom";

interface Stage {
  stageNumber: number;
  stageName: string;
  assignedTo: string[];
  actionTakenBy?: string;
  status: string;
  triggerDate: string;
  dueDate: string;
  completedDate?: string;
}

const mockStages: Stage[] = [
  {
    stageNumber: 1,
    stageName: "Manager approval",
    assignedTo: ["Rahul Agrawal (PW16256)"],
    actionTakenBy: "Rahul Agrawal (PW16256)",
    status: "Rejected",
    triggerDate: "28-11-2024",
    dueDate: "13-12-2024",
    completedDate: "28-11-2024",
  },
  {
    stageNumber: 2,
    stageName: "HRBP approval",
    assignedTo: ["Vikash Kumar (PW3872)"],
    status: "Pending",
    triggerDate: "-",
    dueDate: "-",
  },
];

const FlowRequestDetails: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request = (location.state as any)?.request;

  return (
    <div className="space-y-6">
      <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded">
        Flow was rejected by Rahul Agrawal (PW16256) on 28-11-2024
      </div>

      <h2 className="text-xl font-semibold">
        {request?.title || `Request ${id}`}
      </h2>
      <p className="text-gray-600 text-sm">
        Request ID: {request?.id} | Trigger: {request?.triggerEvent}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border text-sm text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Stage Number</th>
              <th className="p-2 border">Stage Name</th>
              <th className="p-2 border">Assigned To</th>
              <th className="p-2 border">Action Taken By</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Trigger Date</th>
              <th className="p-2 border">Due Date</th>
              <th className="p-2 border">Completed Date</th>
            </tr>
          </thead>
          <tbody>
            {mockStages.map((stage) => (
              <tr key={stage.stageNumber}>
                <td className="p-2 border">{stage.stageNumber}</td>
                <td className="p-2 border">{stage.stageName}</td>
                <td className="p-2 border">{stage.assignedTo.join(", ")}</td>
                <td className="p-2 border">{stage.actionTakenBy || "-"}</td>
                <td className="p-2 border">{stage.status}</td>
                <td className="p-2 border">{stage.triggerDate}</td>
                <td className="p-2 border">{stage.dueDate}</td>
                <td className="p-2 border">{stage.completedDate || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FlowRequestDetails;
