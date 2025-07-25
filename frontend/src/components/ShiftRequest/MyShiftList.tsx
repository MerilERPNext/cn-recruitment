// import { useNavigate } from "react-router-dom";
import { IoIosArrowForward } from "react-icons/io";
import { FaCheck, FaInfoCircle, FaMinusCircle } from "react-icons/fa";
import FrappeListView from "../ListView";

interface ShiftRequest {
  name: string;
  employee: string;
  department: string;
  from_date: string;
  to_date: string;
  shift_type: string;
  status: string;
  creation: string;
}

const ShiftRequestList = () => {
//   const navigate = useNavigate();

//   const handleGoToShiftRequest = (shiftId: string) => {
//     const encodedId = encodeURIComponent(shiftId);
//     navigate(`/webapp/shift-request/${encodedId}`);
//   };

  return (
    <FrappeListView
      doctype="Shift Request"
      ItemComponent={ShiftRequestItem}
    //   onItemClick={(item: ShiftRequest) => {
    //     handleGoToShiftRequest(item.name);
    //   }}
      isSearch={true}
      pageSize={10}
      defaultFields={[
        "name",
        "employee",
        "department",
        "from_date",
        "to_date",
        "shift_type",
        "status",
        "creation",
      ]}
      searchFields={["employee", "status", "shift_type"]}
      infiniteScroll={true}
    />
  );
};

const ShiftRequestItem: React.FC<{
  item: ShiftRequest;
  index?: number;
  doctype: string;
}> = ({ item }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return <FaCheck className="ml-1 text-green-600 w-3 h-3" />;
      case "draft":
        return <FaInfoCircle className="ml-1 text-yellow-600 w-3 h-3" />;
      case "rejected":
        return <FaMinusCircle className="ml-1 text-red-600 w-3 h-3" />;
      default:
        return null;
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
            {item.employee} ({item.department})
          </h3>
        </div>
        <div className="text-sm text-[var(--secondary-color)]">
          <p>
            Shift Type: <span className="font-medium">{item.shift_type}</span>
          </p>
          <p>
            From: {formatDate(item.from_date)} <br /> To:{" "}
            {formatDate(item.to_date)}
          </p>
        </div>
      </div>
      <span
        className={`flex items-center text-xs font-medium px-3 py-1 rounded-lg ${getStatusColor(item.status)}`}
      >
        {item.status}
      </span>
      <span
        className={`flex items-center justify-center text-xs font-medium px-1 py-1 rounded-full`}
      >
        {getStatusIcon(item.status)}
      </span>
      <button className="text-lg text-[var(--secondary-color)] ">
        <IoIosArrowForward />
      </button>
    </div>
  );
};

export default ShiftRequestList;
