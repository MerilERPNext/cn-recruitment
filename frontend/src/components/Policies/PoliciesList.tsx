import React from "react";
import { useLocation, useNavigate, Navigate } from "react-router";
import FrappeListView from "../ListView";
import { PolicyCardSkeleton } from "./PolicySkeletons";
import { Download } from "lucide-react";
import { FaRegEye } from "react-icons/fa";

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
          // build an absolute URL the viewer can fetch
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
          className="flex items-center justify-center p-2  border border-gray-300 rounded-lg text-blue-600 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
        >
          <FaRegEye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const PoliciesList: React.FC = () => {
  const location = useLocation();
  const categoryName = (location.state as PolicyState | undefined)?.name;

  if (!categoryName) {
    return <Navigate to="/webapp/policies-app/policies-categories" replace />;
  }

  return (
    <div className="w-full bg-white rounded-xl p-4">
      <FrappeListView<PolicyDoc>
        doctype="Policy Details" // Using correct doctype name
        defaultFilters={{
          policy_category: categoryName,
        }}
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
