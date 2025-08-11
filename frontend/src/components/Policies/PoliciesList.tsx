import React from "react";
import { useLocation, useNavigate, Navigate } from "react-router";
import FrappeListView from "../ListView";
import { PolicyCardSkeleton } from "./PolicySkeletons";

type PolicyDoc = {
  name: string;
  comments?: string;
  add_policy_document?: string;
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
          pdfUrl: `${window.location.origin}${item.add_policy_document}`,
        },
      }
    );

  return (
    <div className="flex justify-between items-center border rounded-xl mt-2 shadow-sm border-gray-200 py-4 px-4 active:bg-gray-50">
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold text-gray-900 truncate">
          {item.name}
        </h2>
        <p className="text-sm text-gray-500 truncate">{item.comments ?? "—"}</p>
      </div>
      <button
        onClick={handleView}
        className="ml-3 text-sm px-3 py-2 bg-blue-600 text-white rounded-md active:bg-blue-700"
      >
        View
      </button>
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
    <div className="max-w-md bg-white rounded-xl">
      <FrappeListView<PolicyDoc>
        doctype="HR Policies"
        defaultFilters={{
          policy_category: categoryName,
          archive: "0",
        }}
        isSearch={true}
        showRefereshButton={true}
        searchFields={["name"]}
        defaultFields={["name", "comments", "add_policy_document"]}
        ItemComponent={PolicyItem}
        infiniteScroll={true}
        SkeletonComponent={PolicyCardSkeleton}
      />
    </div>
  );
};

export default PoliciesList;
