import { useState } from 'react'
import { useScreenSize } from '../../../hooks/useScreenSize';
import CommonSearchAndActions from '../CommonSearchAndActions';
import HeaderBar from '../../HeaderBar';
import { useNavigate, useParams } from 'react-router-dom';
import Badge from '../../shared/Badge';
import RequestTimeline from './RequestDetailsCard';
import CardTable from '../../shared/CardTable';

const titles = ["Stage Number",
  "Stage Name",
  "Assigned To",
  "Action Taken By",
  "Status",
  "Trigger Date",
  "Due Date",
  "Completed Date",
  "Actions"
]

const stages = [
  {
    stageNumber: 1,
    stageName: "Initiation",
    assignedTo: "John Doe",
    actionTakenBy: "John Doe",
    status: "Completed",
    triggerDate: "2025-10-01",
    dueDate: "2025-10-03",
    completedDate: "2025-10-02",
    actions: "View Details",
  },
  {
    stageNumber: 2,
    stageName: "Manager Approval",
    assignedTo: "Jane Smith",
    actionTakenBy: "Jane Smith",
    status: "Completed",
    triggerDate: "2025-10-03",
    dueDate: "2025-10-05",
    completedDate: "2025-10-04",
    actions: "View Details",
  },
  {
    stageNumber: 3,
    stageName: "Finance Review",
    assignedTo: "Robert Lee",
    actionTakenBy: "Robert Lee",
    status: "In Progress",
    triggerDate: "2025-10-05",
    dueDate: "2025-10-07",
    completedDate: "-",
    actions: "Approve / Reject",
  },
  {
    stageNumber: 4,
    stageName: "Compliance Check",
    assignedTo: "Emily Davis",
    actionTakenBy: "-",
    status: "Pending",
    triggerDate: "2025-10-07",
    dueDate: "2025-10-09",
    completedDate: "-",
    actions: "Start Review",
  },
  {
    stageNumber: 5,
    stageName: "HR Verification",
    assignedTo: "Michael Brown",
    actionTakenBy: "Michael Brown",
    status: "Pending",
    triggerDate: "2025-10-09",
    dueDate: "2025-10-11",
    completedDate: "2025-10-10",
    actions: "View Record",
  }
];


type FlowStatusType = 'Approval Flow Status' | 'Workflow Status';

const RequestDetails: React.FC = () => {
  const [FlowStatusType, setFlowStatusType] = useState<FlowStatusType>('Approval Flow Status');
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const { id } = useParams();

  const handleNavigateBack = () => {
    navigate(-1);
  }

  const getBadgeColor = (status: string) => {
    if (!status) return "text-gray-600 bg-gray-100";

    switch (status.toLowerCase()) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "in progress":
        return "text-yellow-600 bg-yellow-100";
      case "pending":
        return "text-gray-600 bg-gray-100";
      case "rejected":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  }
  return (
    <div className="min-h-screen bg-white">
      <div className="top-0 sticky z-20 bg-white">
        <div className="sm:px-4">
          <HeaderBar title={'Flow Request Details : ' + id} onBack={handleNavigateBack} />
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
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"}
          ${index === 0 ? "rounded-l-2xl" : "rounded-r-2xl"}`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          <div className="text-sm flex sm:flex-col justify-between sm:w-fit w-full">
            <div ><span className="font-medium text-gray-500 ">Initiated By :</span> <span className="text-gray-900">Yojesh Jain </span></div>
            <div> <span className="font-medium text-gray-500 ">Initiated On :</span> <span className="text-gray-900">17-10-2025</span> </div>
          </div>
        </div>
        <div className="px-8 "><CommonSearchAndActions hideEyeIcon={true} /></div>
      </div>

      <div className="sm:px-8 px-4">
        <CardTable titles={titles}>
          {isDesktop ?
            (<div className="w-full overflow-x-auto rounded-lg  border border-gray-200 bg-white shadow-sm">
              <div className="w-full">
                {stages.length > 0 ?
                  stages.map((stage) => (
                    <div key={stage.triggerDate} className="hover:bg-gray-100 grid grid-cols-9 cursor-pointer text-xs w-full border-b">
                      <span className="px-4 py-4 inline-block text-sm">{stage.stageNumber}</span>
                      <span className="px-4 py-4 inline-block text-sm ">{stage.stageName}</span>
                      <span className="px-4 py-4 inline-block text-sm ">{stage.assignedTo}</span>
                      <span className="px-4 py-4 inline-block text-sm ">{stage.actionTakenBy}</span>
                      <span className="px-4 py-4 inline-block text-sm "><Badge label={stage.status} textColor={getBadgeColor(stage.status)} size="sm" /></span>
                      <span className="px-4 py-4 inline-block text-sm ">{stage.triggerDate}</span>
                      <span className="px-4 py-4 inline-block text-sm ">{stage.dueDate}</span>
                      <span className="px-4 py-4 inline-block text-sm ">{stage.completedDate}</span>
                      <span className="px-4 py-4 inline-block text-sm ">{stage.actions}</span>
                    </div>
                  )) : <EmptyState />
                }
              </div>
            </div>)
            :
            (<div>
              {true ?
                <RequestTimeline stages={stages} /> : <EmptyState />
              }
            </div>)
          }

        </CardTable>


      </div>
    </div>
  )
}


const EmptyState = () => {
  return (
    <div className="py-14 text-center text-sm font-medium text-gray-500">
      No Records Found
    </div>
  )
}

export default RequestDetails