import React, { useCallback, useState } from 'react'
import { useScreenSize } from '../../../hooks/useScreenSize';
import Badge from '../../shared/Badge';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCurrentEmployee, useEmployee } from '../../../hooks/useEmployee';
import { useTargetUser } from '../../../context/ViewedUserContext';
import { TodoItem } from '../../../types/flows';
import DataListView from '../../DataListView';
import CardTable from '../../shared/CardTable';
import { Typography } from '../../shared/atoms/Typography';
import formatToIndianDate from '../../../utils/formatToIndianDate';
import FlowDetails from './FlowDetails';
import ApprovalTracker from '../Confirmation/Component/ApprovalTracker';
import HeaderBar from '../../HeaderBar';


const titles = [
  "Request ID",
  "Initiated On",
  "Due date",
  "Initiated By",
  "Initiated For",
  "Allocated To",
  "Approval Status"
]

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

const FlowRequests: React.FC = () => {


  const { data: currentEmployee } = useCurrentEmployee();
  const { targetEmployeeId, isViewingOtherUser } =
    useTargetUser();
  const { data: targetEmployee } = useEmployee(targetEmployeeId);

  const activeEmployee = isViewingOtherUser ? targetEmployee : currentEmployee;
  const [details, setDetails] = useState(null);
  const navigate = useNavigate();
  const handleShowDetails = (data: any) => {
    // setDetails(data);
    navigate("/webapp/flow-app/flow-request/" + data?.todo_id)
  }

  if (details) {
    return (
      <div>
        <HeaderBar onBack={() => setDetails(null)} />
        <ApprovalTracker For="Employee Separation" data={details} />
      </div>
    )
  }
  return (
    <div className=" bg-white">

      <div>
        <div className="flex flex-col mb-2 px-6 mt-4">
          <Typography variant="h4">Flows</Typography>
          <Typography variant="bodySmall" color="body2">
            Manage your Flows
          </Typography>
        </div>

        {/*Flows List*/}
        <div className='px-6 mt-4'>
          <CardTable
            titles={titles}
          >
            <DataListView
              queryKey={["employee-flows", activeEmployee?.name || ""]}
              customAPI={{
                method:
                  "cn_leave_shift_managment.api.get_open_approval_todos",
                params: {
                  doctype: "employee",
                  // status: "Open",
                },
              }}
              ItemComponent={(props: {
                item: TodoItem;
              }) => {
                return (
                  <MyFlowRequestCard handleShowDetails={handleShowDetails} request={props?.item} />
                  // <MyRequestCard
                  //   request={props?.item}
                  //   // onClick={(request: MyPlannedAttendanceRequest) =>
                  //     // handleRequestClick(request)
                  //   }
                  // />
                );
              }}
              // onRefetchComplete={handleMyRequestsRefetchComplete}
              // refetchTrigger={refetchMyRequestsList || refetchAttendance}
              isSearch={true}
              isFilter={true}
              // filterFields={[
              //   {
              //     fieldname: "status",
              //     label: "Status",
              //     fieldtype: "Select",
              //     options: ["Open", "Approved", "Rejected"],
              //   },
              // ]}
              pageSize={10}
              showRefreshButton={false}
              orderBy="modified desc"
              showPagination={true}
              infiniteScroll={true}
              loadMorePagination={false}
            />
          </CardTable>
        </div>
      </div>
    </div>
  )
}


export default FlowRequests


const MyFlowRequestCard = ({ request, handleShowDetails }: { request: TodoItem, handleShowDetails: (todoId: string) => {} }) => {
  return (
    <div
      onClick={() => handleShowDetails(request)}
      className="cursor-pointer hover:bg-blue-100 py-2 px-6 text-sm font-medium text-gray-800 grid grid-cols-7">
      <Typography variant="bodySmall" className="py-4 font-semibold tracking-tight">{request.todo_id}</Typography>
      <Typography variant="bodySmall" className="py-4 font-semibold tracking-tight">{formatToIndianDate(request?.reference_document?.creation)}</Typography>
      <Typography variant="bodySmall" className="py-4 font-semibold tracking-tight">{request.due_date.replace(/-/g, "/")}</Typography>
      <Typography variant="bodySmall" className="py-4 font-semibold tracking-tight">{request.reference_name}</Typography>
      <Typography variant="bodySmall" className="py-4 font-semibold tracking-tight">{request.username}</Typography>
      <Typography variant="bodySmall" className="py-4 font-semibold tracking-tight"> {request.allocated_to}</Typography>
      <span className="px-4 py-4 inline-block text-black"><Badge size="md" backgroundColor={getStatusTagColor(request.status)} label={request.status} /></span>
    </div>
  )
}