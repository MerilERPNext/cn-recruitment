import { useState } from "react";
import { IoIosArrowForward } from "react-icons/io";
import { useNavigate } from "react-router";
import DataListView from "../../../DataListView";
import { useCurrentEmployee } from "../../../../hooks/useEmployee";
import { Loan } from "../Type/loan";
import { formatCurrency } from "../../../../utils/currencyFormatter";
import { useGlobalStore } from "../../../../hooks/useGlobalStore";
import MyApprovalActionPill from "../../../shared/atoms/MyApprovalActionPill";
import CreateLoanDialog from "./CreateLoanDailog";
import StatusBadge from "../../../shared/atoms/statusBadge";

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
        ItemComponent={({ item }) => <LoantItem item={item} handleEdit={handleEdit} />}
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
}> = ({ item, handleEdit }) => {
  return (
    <div
      key={item.name}
      className="flex justify-between items-center bg-white p-4 mt-2 rounded-xl border cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Left content */}
      <div className="flex flex-col flex-grow">
        <h3 className="text-[var(--text-primary)] text-base font-semibold mb-1">
          {item.loan_name}
        </h3>
        <p className="text-sm text-[var(--secondary-color)]">
          <span className="font-semibold">{item.emi_type}</span>
        </p>
      </div>

      {/* Right content */}
      <div className="flex items-center gap-3 flex-col">
        <div className="flex items-center gap-2">
           <StatusBadge status={item.status} />
          <MyApprovalActionPill
            isPending={true}
            canEdit={!!item.can_edit}
            onEdit={() => handleEdit(item.name)}
          />   
        </div>
        <div className="flex gap-2">
          <p className="flex items-center text-sm text-[var(--text-primary)]">
            <span className="font-bold">
              {item.status === "Open"
                ? formatCurrency(item.loan_requested_amount)
                : formatCurrency(item.loan_approved_amount)}
            </span>
          </p>
          <button className="text-xl text-[var(--secondary-color)] hover:text-[var(--text-primary)] transition-colors">
            <IoIosArrowForward />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListViewOfLoanForMobile;
