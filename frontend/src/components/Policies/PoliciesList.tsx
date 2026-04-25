import { Download } from "lucide-react";
import React, { useState } from "react";
import { FaRegEye } from "react-icons/fa";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useScreenSize } from "../../hooks/useScreenSize";
import HeaderBar from "../HeaderBar";
import FrappeListView from "../ListView";
import CustomDropdown from "../shared/CustomDropdown";
import { Card } from "../shared/atoms/Card";
import { PolicyCardSkeleton } from "./PolicySkeletons";

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
      },
    );

  return (
    <Card
      padding="sm"
      className="w-full flex justify-between items-center hover:shadow-md my-1"
      onClick={handleView}
    >
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-gray-900 truncate">
          {item.policy || item.name}
        </h2>
        <p className="text-sm text-gray-500 truncate">{item.status ?? "—"}</p>
      </div>
      <div className="flex items-center gap-2 ml-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (item.policy_document) {
              const link = document.createElement("a");
              link.href = `${window.location.origin}${item.policy_document}`;
              link.download = item.policy || item.name;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }}
          className="flex items-center justify-center p-2 border border-gray-300 rounded-lg text-primary hover:bg-primary/10 transition-colors duration-200 disabled:opacity-50"
          title="Download Policy Document"
          disabled={!item.policy_document}
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={handleView}
          className="flex items-center justify-center p-2 border border-gray-300 rounded-lg text-primary hover:bg-primary/10 transition-colors duration-200 disabled:opacity-50"
        >
          <FaRegEye className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
};

const PoliciesList: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDesktop } = useScreenSize();
  const { data: user } = useCurrentEmployeeAllDetails();
  const employeeId = user?.employee ?? "";
  const categoryName = (location.state as PolicyState | undefined)?.name;
  const [selectedStatus, setSelectedStatus] = useState("Acknowledged");
  const statusOptions = [
    {
      value: "Pending",
      label: "Pending",
    },
    {
      value: "Acknowledged",
      label: "Acknowledged",
    },
    {
      value: "Declined",
      label: "Declined",
    },
    {
      value: "Archived",
      label: "Archived",
    },
  ];

  if (!categoryName) {
    return <Navigate to="/webapp/policies-app/policies-categories" replace />;
  }

  const FilterDropdown: React.FC = () => {
    return (
      <div className="my-2 flex items-center justify-end gap-4">
        <CustomDropdown
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          options={statusOptions}
          position="bottom-left"
        />
      </div>
    );
  };

  return (
    <div className="w-full rounded-xl p-2">
      <div className="relative z-20">
        {isDesktop ? (
          <HeaderBar
            title="Policies List"
            onBack={() => navigate(-1)}
            rightSlot={<FilterDropdown />}
            className="md:mb-4"
            bgColor="primary/10"
          />
        ) : (
          <FilterDropdown />
        )}
      </div>
      <div className="relative z-10">
        <FrappeListView<PolicyDoc>
          doctype="Policy Details"
          defaultFilters={{
            policy_category: categoryName,
            employee_id: employeeId,
            status: selectedStatus,
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
    </div>
  );
};

export default PoliciesList;
