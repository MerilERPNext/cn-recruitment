import React, { useState } from 'react'
import { useScreenSize } from '../../../hooks/useScreenSize';
import CommonSearchAndActions from '../CommonSearchAndActions';
import FlowRequestCard from '../FlowRequestCard';
import Badge from '../../shared/Badge';
import { useNavigate } from 'react-router-dom';

const subtabs = [
  { name: "Active", count: 1 },
  { name: "Drafts", count: 0 },
  { name: "Completed", count: 0 },
  { name: "Revoked", count: 0 },
  { name: "All Workflows", count: 1 }
];

const requests = [
  {
    requestId: "REQ-1001",
    flowName: "Leave Approval Flow",
    category: "HR",
    approvalStatus: "Approved",
    workflowStatus: "Completed",
    overallFlowStatus: "Success",
    initiatedOn: "2025-10-10",
    initiatedBy: "Amit Sharma",
    initiatedFor: "Riya Patel",
    lastTriggeredOn: "2025-10-11",
    triggeringEvent: "Leave Request Submitted",
  },
  {
    requestId: "REQ-1002",
    flowName: "Expense Reimbursement",
    category: "Finance",
    approvalStatus: "Pending",
    workflowStatus: "In Progress",
    overallFlowStatus: "Ongoing",
    initiatedOn: "2025-10-09",
    initiatedBy: "Priya Mehta",
    initiatedFor: "Priya Mehta",
    lastTriggeredOn: "2025-10-10",
    triggeringEvent: "Expense Form Submitted",
  },
  {
    requestId: "REQ-1003",
    flowName: "Travel Authorization",
    category: "Operations",
    approvalStatus: "Rejected",
    workflowStatus: "Terminated",
    overallFlowStatus: "Failed",
    initiatedOn: "2025-09-28",
    initiatedBy: "Karan Singh",
    initiatedFor: "Karan Singh",
    lastTriggeredOn: "2025-09-29",
    triggeringEvent: "Manager Review Completed",
  },
  {
    requestId: "REQ-1004",
    flowName: "IT Asset Allocation",
    category: "IT",
    approvalStatus: "Approved",
    workflowStatus: "Completed",
    overallFlowStatus: "Success",
    initiatedOn: "2025-10-05",
    initiatedBy: "Neha Gupta",
    initiatedFor: "Rahul Verma",
    lastTriggeredOn: "2025-10-06",
    triggeringEvent: "Final Approval Received",
  },
  {
    requestId: "REQ-1005",
    flowName: "Vendor Payment",
    category: "Finance",
    approvalStatus: "Pending",
    workflowStatus: "Awaiting Review",
    overallFlowStatus: "Ongoing",
    initiatedOn: "2025-10-12",
    initiatedBy: "Anil Kumar",
    initiatedFor: "Vendor: TechServe Ltd.",
    lastTriggeredOn: "2025-10-13",
    triggeringEvent: "Invoice Submitted",
  },
  {
    requestId: "REQ-1006",
    flowName: "Shift Change Request",
    category: "HR",
    approvalStatus: "Approved",
    workflowStatus: "Completed",
    overallFlowStatus: "Success",
    initiatedOn: "2025-10-03",
    initiatedBy: "Sonal Jain",
    initiatedFor: "Sonal Jain",
    lastTriggeredOn: "2025-10-04",
    triggeringEvent: "Shift Manager Approval",
  },
  {
    requestId: "REQ-1007",
    flowName: "Budget Revision",
    category: "Finance",
    approvalStatus: "Rejected",
    workflowStatus: "Terminated",
    overallFlowStatus: "Failed",
    initiatedOn: "2025-09-25",
    initiatedBy: "Rohit Yadav",
    initiatedFor: "Rohit Yadav",
    lastTriggeredOn: "2025-09-26",
    triggeringEvent: "Finance Review Completed",
  },
  {
    requestId: "REQ-1008",
    flowName: "New Hire Onboarding",
    category: "HR",
    approvalStatus: "Approved",
    workflowStatus: "Completed",
    overallFlowStatus: "Success",
    initiatedOn: "2025-10-07",
    initiatedBy: "Deepika Joshi",
    initiatedFor: "Aakash Rana",
    lastTriggeredOn: "2025-10-08",
    triggeringEvent: "Document Verification Completed",
  },
  {
    requestId: "REQ-1009",
    flowName: "System Access Request",
    category: "IT",
    approvalStatus: "Pending",
    workflowStatus: "In Progress",
    overallFlowStatus: "Ongoing",
    initiatedOn: "2025-10-15",
    initiatedBy: "Manoj Tiwari",
    initiatedFor: "Manoj Tiwari",
    lastTriggeredOn: "2025-10-15",
    triggeringEvent: "Security Review Started",
  },
  {
    requestId: "REQ-1010",
    flowName: "Policy Update Approval",
    category: "Administration",
    approvalStatus: "Approved",
    workflowStatus: "Completed",
    overallFlowStatus: "Success",
    initiatedOn: "2025-10-01",
    initiatedBy: "Nisha Agarwal",
    initiatedFor: "HR Policy Revision Team",
    lastTriggeredOn: "2025-10-02",
    triggeringEvent: "Final Approval Granted",
  },
];

const titles =  ["Request ID",
              "Flow Name",
              "Category",
              "Initiated On",
              "Initiated By",
              "Initiated For",
              "Last Triggered On",
              "Triggering Event",
              "Approval Status",
              "Workflow Status",
              "Overall Flow Status",
            ]

const FlowRequests : React.FC = () => {
  const [filter, setFilter] = useState({ currentTab: subtabs[0].name });
  const {isDesktop} = useScreenSize();
  const navigate = useNavigate();
  
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

  const handleNavigate = (requestId: string)=>{
    navigate("/webapp/flow-app/flow-request/" + requestId);
  }
  
  return (
    <div className="p-4 bg-white">
      <div className=' p-2 '>
        <div className='w-full overflow-x-auto text-nowrap scrollbar-hide'>
        <div className="rounded-lg border border-gray-300 bg-white flex space-x-1 w-fit p-1 ">
          {subtabs.map((tab) =>(
            <button
                key={tab.name}
                className={`text-sm ${filter.currentTab === tab.name
                  ? "bg-blue-500 text-white rounded-lg"
                  : "text-gray-500 hover:bg-gray-200 rounded-lg"
                  }  px-4 py-2 font-medium`}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  setFilter({ ...filter, currentTab: tab.name });
                  event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }}
              >
                {tab.name} {tab.count}
              </button>
          ))}
        </div>
        </div>

      <CommonSearchAndActions />
     { isDesktop ?
        (<div className="w-full overflow-x-auto rounded-lg  border border-gray-200 bg-white shadow-sm">
            <div className='min-h-12 bg-gray-50 border-b border-gray-200 grid grid-cols-11 items-center'>
              {titles.map((title) => (
                <span
                  key={title}
                  className="px-4 py-2 inline-block text-left text-xs font-semibold text-gray-500 "
                >
                  {title}
                </span>
              ))}
            </div>
            <div className="w-full">
            {requests.length > 0 ?
          requests.map((request) => (
          <div key={request.requestId} className="hover:bg-gray-100 grid grid-cols-11 cursor-pointer text-sm w-full border-b">
            <span className="px-4 py-4 inline-block cursor-pointer text-blue-700 hover:text-blue-800 hover:underline" onClick={()=> handleNavigate(request.requestId)}>{request.requestId}</span>
            <span className="px-4 py-4 inline-block cursor-pointer text-blue-700 hover:text-blue-800 hover:underline" onClick={()=> handleNavigate(request.requestId)}>{request.flowName}</span>
            <span className="px-4 py-4 inline-block ">{request.category}</span>
            <span className="px-4 py-4 inline-block ">{request.initiatedOn}</span>
            <span className="px-4 py-4 inline-block ">{request.initiatedBy}</span>
            <span className="px-4 py-4 inline-block ">{request.initiatedFor}</span>
            <span className="px-4 py-4 inline-block ">{request.lastTriggeredOn}</span>
            <span className="px-4 py-4 inline-block ">{request.triggeringEvent}</span>
            <span className="px-4 py-4 inline-block "><Badge backgroundColor={getStatusTagColor(request.approvalStatus)} label={request.approvalStatus} size="sm" /></span>
            <span className="px-4 py-4 inline-block "><Badge backgroundColor={getStatusTagColor(request.workflowStatus)} label={request.workflowStatus} size="sm" /></span>
            <span className="px-4 py-4 inline-block "><Badge backgroundColor={getStatusTagColor(request.overallFlowStatus)} label={request.overallFlowStatus} size="sm" /></span>
          </div>
        )):     <EmptyState />
    }
        </div>
        </div>)
        :
        (
          <div>
           { requests.map((request) => (<FlowRequestCard data={request} />))}
          </div>
        )
        }
      </div>
    </div>
  )
}


const EmptyState = ()=>{
  return (
    <div className="py-14 text-center text-sm font-medium text-gray-500">
      No Records Found
    </div>
  )
}

export default FlowRequests