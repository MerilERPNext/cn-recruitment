import { Loan } from "../Type/loan";
import { formatCurrency } from "../../../../utils/currencyFormatter";
import MyApprovalActionPill from "../../../shared/atoms/MyApprovalActionPill";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { Typography } from "../../../shared/atoms/Typography";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import MobileAllocatedTo from "../../../shared/MobileAllocatedTo";
import { TodoType } from "../../../../types/todos";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useRevokeEvent } from "../../../../hooks/userApprovalList";
import { useLoadingOverlay } from "../../../../context/OverlayContext";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";
import toast from "react-hot-toast";
import { queryClient } from "../../../../providers/QueryProvider";
import { getAssignedUsersCell } from "../../../../utils/getAssignedUsersCell";


export const LoantItem: React.FC<{
  item: Loan;
  handleEdit: (docname: string) => void;
  onClick: () => void;
}> = ({ item, handleEdit, onClick }) => {
  const todo: TodoType | null = Array.isArray(item?.todo_list) && item.todo_list.length > 0
    ? item.todo_list[0]
    : null;

  const { data: currentUser } = useCurrentUser();
  const canRevoke = item.status === "Open" && todo?.custom_allow_revoke === 1;
  const canEdit = todo?.can_edit === true &&
    currentUser?.name?.toLowerCase() === todo?.send_back_user?.toLowerCase();

  const loading = useLoadingOverlay();
  const revokeEventMutation = useRevokeEvent();

  const handleRevokeClick = () => {
    if (!todo?.todo_id) return;
    loading?.show("Revoking Request...");
    revokeEventMutation.mutate(
      { docname: todo.reference_name, doctype: todo.reference_type, todo: todo.todo_id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["loan"] });
          queryClient.invalidateQueries({ queryKey: ["loan-requests"] });
          toast.success("Loan Request Revoked Successfully!");
        },
        onError: (error) => {
          toast.error(errorResponseFormater(error));
        },
        onSettled: () => loading?.hide(),
      },
    );
  };

  return (
    <div
      key={item.name}
      className="cursor-pointer border-t-4 border-x border-b mt-2
        border-x-primary/20 border-b-primary/20 
        shadow-sm border-primary bg-white rounded-xl"
      onClick={onClick}
    >
      <div className="p-4 flex flex-col gap-3 w-full">
        {/* Header: Loan Name + Status */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Loan Name</Typography>
            <Typography variant="mobileCardValue">
              {item.loan_name}
            </Typography>
          </div>
          <StatusBadge status={item.status} />
        </div>


        {/* Amount rows */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Amount</Typography>
            <Typography variant="mobileCardValue">
              {item.status === "Open"
                ? formatCurrency(item.loan_requested_amount)
                : formatCurrency(item.loan_approved_amount)}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Loan Type</Typography>
            <Typography variant="mobileCardValue">
              {item.loan_type}
            </Typography>
             <Typography variant="bodySmall" className="font-medium text-center">
                      {getAssignedUsersCell(item?.todo_list?.[0])}
                    </Typography>
                    
          </div>
        </div>

        {/* Duration + EMI Type */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">EMI Type</Typography>
            <Typography variant="mobileCardValue">
              {item.emi_type}
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Tenure</Typography>
            <Typography variant="mobileCardValue">
              {item.loan_tenure || "0"}
            </Typography>
          </div>
        </div>

        {/* Interest + Start Date */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="mobileCardLabel">Interest</Typography>
            <Typography variant="mobileCardValue">
              {item.rate_of_interest || "0"}%
            </Typography>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <Typography variant="mobileCardLabel">Start Date</Typography>
            <Typography variant="mobileCardValue">
              {formatToIndianDate(item.loan_start_date)}
            </Typography>
          </div>
        </div>

        {/* Allocated To */}
        <MobileAllocatedTo
          users={todo?.allocated_to}
          roles={todo?.allocated_roles}
          role={todo?.role ?? ""}
          allocated_to={todo?.username}
        RoleAssignedUsers={todo?.role_assigned_users}
      />

        <MyApprovalActionPill
          variant="buttons"
          isPending={item.status === "Open"}
          canRevoke={canRevoke}
          canEdit={canEdit}
          onRevoke={handleRevokeClick}
          onEdit={() => {
            handleEdit(item.name);
          }}
          isResubmit={canEdit}
        />
      </div>
    </div>
  );
};

