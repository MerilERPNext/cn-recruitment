import { IoIosArrowForward } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import FrappeListView from "../ListView";

interface SalarySlip {
  name: string;
  employee: string;
  start_date: string;
  end_date: string;
  gross_pay: number;
  net_pay: number;
  status: string;
  posting_date: string;
}

const SalarySlipsList = () => {
  const navigate = useNavigate();

  const handleGoToSalarySlip = (salaryId: string) => {
    const encodedId = encodeURIComponent(salaryId);

    navigate(`/webapp/salary-slip-app/salary-slip-list/${encodedId}`);
  };

  return (
    <FrappeListView
      doctype="Salary Slip"
      ItemComponent={SalarySlipItem}
      onItemClick={(item: SalarySlip) => {
        handleGoToSalarySlip(item.name);
      }}
      isSearch={true}
      pageSize={10}
      defaultFields={[
        "name",
        "employee",
        "start_date",
        "end_date",
        "gross_pay",
        "net_pay",
        "status",
        "posting_date",
      ]}
      searchFields={["employee", "status", "posting_date"]}
      infiniteScroll={true}
    />
  );
};

const SalarySlipItem: React.FC<{
  item: SalarySlip;
  index?: number;
  doctype: string;
}> = ({ item }) => {
  const salarySlip = item;
  

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "generated":
        return "bg-green-100 text-green-800";
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "draft":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div
      key={item.name}
      className="flex justify-between items-center gap-3 bg-white p-4 mt-1 rounded-xl border cursor-pointer hover:shadow-sm transition-shadow"
    >
       
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[var(--text-primary)] text-base font-semibold">
            {formatDate(salarySlip.start_date)}
          </h3>
        </div>
        <div className="text-sm text-[var(--secondary-color)] ">
          <p className="font-medium">
            Gross Pay: {formatCurrency(salarySlip.gross_pay)}
          </p>
        </div>
      </div>
      <span
        className={`flex items-center justify-center text-xs font-medium px-3 py-1 rounded-lg ${getStatusColor(salarySlip.status)}`}
      >
        {salarySlip.status}
      </span>
      <button className="text-lg text-[var(--secondary-color)] ml-3">
        <IoIosArrowForward />
      </button>
    </div>
  );
};

export default SalarySlipsList;
