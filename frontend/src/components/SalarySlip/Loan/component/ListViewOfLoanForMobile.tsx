// import { useNavigate } from "react-router-dom";
import { IoIosArrowForward } from "react-icons/io";
import FrappeListView from "../../../ListView";
import { PiCurrencyInrFill } from "react-icons/pi";
import { useNavigate } from "react-router";

interface Loan {
  loan_application: string;
  applicant_name: string;
  loan_amount: number;
  total_payment: number;
  name: string;
  employee: string;
  department: string;
  from_date: string;
  to_date: string;
  shift_type: string;
  status: string;
  creation: string;
}

const ListViewOfLoanForMobile = () => {
  const navigate = useNavigate();

  const handleGoToLoanDetails = (loan_application: string) => {
    navigate(`/webapp/salary-slip-app/loan/${loan_application}`);
  };

  return (
    <FrappeListView
      doctype="Loan"
      ItemComponent={LoantItem}
      onItemClick={(item: Loan) => handleGoToLoanDetails(item.loan_application)} // ✅ Pass item.name
      isSearch={true}
      pageSize={10}
      defaultFields={["*"]}
      searchFields={["employee", "status", "shift_type"]}
      infiniteScroll={true}
    />
  );
};

const LoantItem: React.FC<{
  item: Loan;
  index?: number;
  doctype: string;
}> = ({ item }) => {
  return (
    <div
      key={item.name}
      className="flex justify-between items-center bg-white p-4 mt-2 rounded-xl border cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Left content */}
      <div className="flex flex-col flex-grow">
        <h3 className="text-[var(--text-primary)] text-base font-semibold mb-1">
          {item.applicant_name}
        </h3>
        <p className="text-sm text-[var(--secondary-color)]">
          Name: <span className="font-semibold">{item.name}</span>
        </p>
      </div>

      {/* Right content */}
      <div className="flex items-center gap-3">
        <p className="flex items-center text-sm text-[var(--text-primary)]">
          <PiCurrencyInrFill className="mr-1 text-[var(--secondary-color)]" />
          <span className="font-bold">{item.loan_amount}</span>
        </p>
        <button className="text-xl text-[var(--secondary-color)] hover:text-[var(--text-primary)] transition-colors">
          <IoIosArrowForward />
        </button>
      </div>
    </div>
  );
};

export default ListViewOfLoanForMobile;
