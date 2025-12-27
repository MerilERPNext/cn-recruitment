import { IoIosArrowForward } from "react-icons/io";
import { useNavigate } from "react-router";
import DataListView from "../../../DataListView";
import { useCurrentEmployee } from "../../../../hooks/useEmployee";
import { Loan } from "../Type/loan";
import { formatCurrency } from "../../../../utils/currencyFormatter";
import { useGlobalStore } from "../../../../hooks/useGlobalStore";

const ListViewOfLoanForMobile = () => {
  const navigate = useNavigate();
  const { data: currentEmployee } = useCurrentEmployee();
  const { refetchAttendance, setRefetchAttendance } = useGlobalStore();

  const handleGoToLoanDetails = (loan_application: string) => {
    navigate(`/webapp/salary-slip-app/loan/${loan_application}`);
  };

  return (
    <DataListView
      queryKey="loan-requests"
      customAPI={{
        method:
          "cn_indian_payroll.cn_indian_payroll.overrides.loan_dashboard.print_loan_dashboard",
        params: {
          employee: currentEmployee?.name,
        },
      }}
      ItemComponent={({ item }) => <LoantItem item={item} />}
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
  );
};

const LoantItem: React.FC<{
  item: Loan;
}> = ({ item }) => {
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
        <p
          className={`inline-flex items-center px-2.5 py-0.5 rounded-2xl text-xs font-medium ml-auto ${
            item.status === "Open"
              ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
              : "bg-green-100 text-green-800 border border-green-200"
          }`}
        >
          {item.status === "Open" ? "Pending" : item.status}
        </p>
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
