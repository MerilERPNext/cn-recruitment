import { useState } from "react";
import { useNavigate } from "react-router";
import DataListView from "../../../DataListView";
import { useCurrentEmployee } from "../../../../hooks/useEmployee";
import { Loan } from "../Type/loan";
import { formatCurrency } from "../../../../utils/currencyFormatter";
import { useGlobalStore } from "../../../../hooks/useGlobalStore";
import MyApprovalActionPill from "../../../shared/atoms/MyApprovalActionPill";
import CreateLoanDialog from "./CreateLoanDailog";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { Typography } from "../../../shared/atoms/Typography";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import MobileAllocatedTo from "../../../shared/MobileAllocatedTo";

const ListViewOfLoanForMobile = () => {
  const navigate = useNavigate();
  const { data: currentEmployee } = useCurrentEmployee();
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();
  const [loanId, setLoanId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleGoToLoanDetails = (loan_application: string) => {
    navigate(`/webapp/salary-slip-app/loan/${loan_application}`);
  };

  const handleEdit = (docname: string) => {
    setLoanId(docname);
    setIsDialogOpen(true);
  };

  return (
    <>
      <DataListView
        queryKey="loan-requests"
        customAPI={{
          method:
            "cn_indian_payroll.cn_indian_payroll.overrides.loan_dashboard.print_loan_dashboard",
          params: {
            employee: currentEmployee?.name,
          },
        }}
        ItemComponent={({ item }) => (
          <LoantItem
            item={item}
            handleEdit={handleEdit}
            onClick={() => handleGoToLoanDetails(item.loan_name)}
          />
        )}
        onRefetchComplete={() => setRefetchAttendance(false)}
        refetchTrigger={refetchAttendance}
        onItemClick={(item: Loan) => handleGoToLoanDetails(item.loan_name)}
        isSearch={true}
        isFilter={false}
        pageSize={10}
        showRefreshButton={false}
        orderBy="modified desc"
        infiniteScroll={true}
        loadMorePagination={true}
        showPagination={false}
        searchFields={["employee", "status", "shift_type"]}
      />
      {isDialogOpen && (
        <CreateLoanDialog
          loanId={loanId}
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setLoanId(null);
          }}
        />
      )}
    </>
  );
};

const LoantItem: React.FC<{
  item: Loan;
  handleEdit: (docname: string) => void;
  onClick: () => void;
}> = ({ item, handleEdit, onClick }) => {
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
          users={item.allocated_to}
          roles={item.allocated_to_roles}
          allocated_to={item.allocated_to_user}
        />

        <MyApprovalActionPill
          variant="buttons"
          isPending={item.status === "Open"}
          canEdit={!!item.can_edit}
          onEdit={() => {
            handleEdit(item.name);
          }}
        />
      </div>
    </div>
  );
};

export default ListViewOfLoanForMobile;
