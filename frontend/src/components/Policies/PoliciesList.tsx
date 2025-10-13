import React, { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import FrappeListView from "../ListView";
import { PolicyCardSkeleton } from "./PolicySkeletons";
import { Download } from "lucide-react";
import { FaRegEye } from "react-icons/fa";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useScreenSize } from "../../hooks/useScreenSize";
import HeaderBar from "../HeaderBar";

type PolicyDoc = {
  name: string;
  policy?: string;
  policy_document?: string;
  status?: string;
};

type PolicyState = {
  name: string;
};

const PolicyItem: React.FC<{ item: PolicyDoc }> = ({ item }) => {
  const navigate = useNavigate();

  const handleView = () =>
    navigate(
      `/webapp/policies-app/view-policy/${encodeURIComponent(item.name)}`,
      {
        state: {
          pdfUrl: `${window.location.origin}${item.policy_document}`,
        },
      }
    );

  return (
    <div className="flex justify-between items-center border rounded-xl mt-2 shadow-sm border-gray-200 py-4 px-4 active:bg-gray-50">
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-gray-900 truncate">
          {item.policy || item.name}
        </h2>
        <p className="text-sm text-gray-500 truncate">{item.status ?? "—"}</p>
      </div>
      <div className="flex items-center gap-2 ml-3">
        <button
          onClick={() => {
            if (item.policy_document) {
              const link = document.createElement("a");
              link.href = `${window.location.origin}${item.policy_document}`;
              link.download = item.policy || item.name;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }}
          className="flex items-center justify-center p-2 border border-gray-300 rounded-lg text-blue-600 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
          title="Download Policy Document"
          disabled={!item.policy_document}
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={handleView}
          className="flex items-center justify-center p-2 border border-gray-300 rounded-lg text-blue-600 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
        >
          <FaRegEye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const PoliciesList: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const employeeId = user?.employee ?? "";
  const categoryName = (location.state as PolicyState | undefined)?.name;
  const [selectedStatus, setSelectedStatus] = useState("Acknowledged");
  const statusOptions = ["Pending", "Acknowledged", "Declined", "Archived"];

  if (!categoryName) {
    return <Navigate to="/webapp/policies-app/policies-categories" replace />;
  }

  const FilterDropdown: React.FC = () => {
    return (
      <div className="my-2 flex items-center justify-start gap-4">
        <div className="flex-1">
          <select
            id="statusFilter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="my-form-input w-full md:w-32"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-white rounded-xl md:p-4 p-2">
      {isDesktop ? (
        <HeaderBar
          title="Policies List"
          onBack={() => navigate(-1)}
          rightSlot={<FilterDropdown />}
        />
      ) : (
        <FilterDropdown />
      )}
      <FrappeListView<PolicyDoc>
        doctype="Policy Details"
        defaultFilters={{
          policy_category: categoryName,
          status: selectedStatus,
          employee_id: employeeId,
        }}
        pageSize={20}
        isSearch={true}
        showRefereshButton={true}
        searchFields={["name"]}
        defaultFields={["name", "policy", "policy_document", "status"]}
        ItemComponent={PolicyItem}
        infiniteScroll={true}
        SkeletonComponent={PolicyCardSkeleton}
      />
    </div>
  );
};

export default PoliciesList;
