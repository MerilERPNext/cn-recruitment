import React from 'react'
import Badge from '../shared/Badge';
import { useNavigate } from 'react-router-dom';

type FlowRequestType = {
  requestId: string;
  flowName: string;
  category: string;
  approvalStatus: string;
  workflowStatus: string;
  overallFlowStatus: string;
  initiatedOn: string;
  initiatedBy: string;
  initiatedFor: string;
  lastTriggeredOn: string;
  triggeringEvent: string;
}

interface FlowRequestCardProps {
  data: FlowRequestType
}


const FlowRequestCard: React.FC<FlowRequestCardProps> = (
  { data }
) => {
  const navigate = useNavigate();
  const handleNavigate = (requestId: string) => {
    navigate("/webapp/flow-app/flow-request/" + requestId);
  }
  const getStatusTagColor = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Completed':
      case 'Success':
        return 'bg-green-100 text-green-800';
      case 'Pending':
      case 'In Progress':
      case 'Ongoing':
        return 'bg-yellow-100 text-yellow-800';
      case 'Rejected':
      case 'Terminated':
      case 'Failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex border border-gray-200 rounded-lg mb-4 p-4 bg-white shadow-sm gap-x-4">
      <div className="grid min-w-[870px]:grid-cols-2 grid-cols-1 gap-x-2 justify-between w-full">
        <div className="flex flex-col gap-y-2">
          <button type="button" className="text-xs text-blue-600 text-left hover:underline" onClick={() => handleNavigate(data.requestId)}># {data.requestId}</button>
          <button type="button" className="text-blue-600 font-medium text-left hover:underline" onClick={() => handleNavigate(data.requestId)}>{data.flowName}</button>
        </div>

        <div className=" mt-4 grid grid-cols-3 justify-between">
          <div className="flex flex-col gap-y-1 text-sm items-start">
            <label className="leading-1  text-gray-500 text-xs">Approval Status</label>
            <Badge backgroundColor={getStatusTagColor(data.approvalStatus)} label={data.approvalStatus} size="sm" />
          </div>
          <div className="flex flex-col gap-y-1 text-sm justify-left">
            <label className="leading-1  text-gray-500 text-xs">Workflow Status</label>
            <Badge backgroundColor={getStatusTagColor(data.workflowStatus)} label={data.workflowStatus} size="sm" />
          </div>
          <div className="flex flex-col gap-y-1 text-sm">
            <label className="leading-1  text-gray-500 text-xs">Overal Workflow Status</label>
            <Badge backgroundColor={getStatusTagColor(data.overallFlowStatus)} label={data.overallFlowStatus} size="sm" />
          </div>
        </div>

        <div className=" mt-4 grid grid-cols-3 justify-between">
          <div className="flex flex-col gap-y-1 text-sm items-start">
            <label className="leading-1  text-gray-500 text-xs">Initialized On</label>
            <span>{data.initiatedOn}</span>
          </div>
          <div className="flex flex-col gap-y-1 text-sm justify-left">
            <label className="leading-1  text-gray-500 text-xs">Initialized By</label>
            <span>{data.initiatedBy}</span>
          </div>
          <div className="flex flex-col gap-y-1 text-sm">
            <label className="leading-1  text-gray-500 text-xs">Initialized For</label>
            <span>{data.initiatedFor}</span>
          </div>
        </div>

        <div className=" mt-4 grid grid-cols-3 justify-between">
          <div className="flex flex-col gap-y-1 text-sm items-start">
            <label className="leading-1  text-gray-500 text-xs">Latest Triggered On</label>
            <span>{data.lastTriggeredOn}</span>
          </div>
          <div className="flex flex-col gap-y-1 text-sm justify-left">
            <label className="leading-1  text-gray-500 text-xs">Triggered On</label>
            <span>{data.triggeringEvent}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FlowRequestCard