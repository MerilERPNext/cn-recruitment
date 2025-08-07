import React from "react";
import { useLocation, useNavigate, Navigate } from "react-router";
import FrappeListView from "../ListView";
import { PolicyCardSkeleton } from "./PolicySkeletons";

type PolicyDoc = {
  name: string;
  comments?: string;
};

type PolicyState = {
  name: string;
};

const PolicyItem: React.FC<{ item: PolicyDoc }> = ({ item }) => {
  const navigate = useNavigate();
  return (
    <div className="flex justify-between items-center border rounded-lg p-4">
      <div className="mr-2">
        <h2 className="text-sm font-semibold text-gray-900">{item.name}</h2>
        <p className="text-xs text-gray-500">{item.comments ?? "—"}</p>
      </div>
      <div>
        <button
          className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          onClick={() => navigate("/webapp")}
        >
          View
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
    <div className="max-w-md bg-white rounded-xl shadow-md p-4 space-y-4 border border-gray-100">
      <FrappeListView<PolicyDoc>
        doctype="HR Policies"
        defaultFilters={{
          policy_category: categoryName,
          archive: "0",
        }}
        isSearch={false}
        showRefereshButton={false}
        defaultFields={["name", "comments"]}
        ItemComponent={PolicyItem}
        infiniteScroll={true}
        SkeletonComponent={PolicyCardSkeleton}
      />
    </div>
  );
};

export default PoliciesList;
