import React from "react";
import { useNavigate } from "react-router";
import FrappeListView from "./ListView";

interface APIRequisition {
  name: string;
  designation: string;
  status: string;
  requested_by: string;
  department: string;
  custom_location: string;
}

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "open & approved":
    case "job opening created":
      return "bg-green-100 text-green-800";
    case "in-progress":
      return "bg-blue-100 text-blue-800";
    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "filled":
      return "bg-gray-200 text-gray-700";
    case "on hold":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getPriorityInfo = (status: string): { label: string; color: string } => {
  switch (status.toLowerCase()) {
    case "pending":
    case "open & approved":
    case "job opening created":
      return { label: "Urgent", color: "text-red-500" };
    case "in-progress":
    case "on hold":
    case "filled":
      return { label: "Normal Priority", color: "text-yellow-600" };
    case "rejected":
    case "cancelled":
      return { label: "Low Priority", color: "text-gray-500" };
    default:
      return { label: "Normal Priority", color: "text-yellow-600" };
  }
};

const JobRequisitionItem: React.FC<{
  item: APIRequisition;
  index?: number;
  doctype: string;
}> = ({ item }) => {
  const job = item;
  const priority = getPriorityInfo(job.status);
  const statusColor = getStatusColor(job.status);

  return (
    <div className="rounded-xl border border-slate-200 bg-[var(--surface-background)] p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {job.designation}
          </h3>
          <p className={`text-xs font-medium ${priority.color} mt-0.5`}>
            {priority.label}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
        >
          {job.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {job.department}
      </p>
      <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
        {job.custom_location}
      </p>
    </div>
  );
};

const JobRequisition: React.FC = () => {
  const navigate = useNavigate();

  const handleGoToRequisition = (id: string) => {
    navigate(`/webapp/recruitment-app/requisitions/${id}`);
  };

  return (
    <div
      className="relative flex size-full min-h-screen flex-col group/design-root"
      style={{ fontFamily: "Inter, Noto Sans, sans-serif" }}
    >
      <FrappeListView
        doctype="Job Requisition"
        onItemClick={(job: APIRequisition) => handleGoToRequisition(job.name)}
        ItemComponent={JobRequisitionItem}
        isSearch={true}
        pageSize={10}
        defaultFields={[
          "name",
          "designation",
          "status",
          "requested_by",
          "department",
          "custom_location",
        ]}
        searchFields={[
          "designation",
          "status",
          "requested_by",
          "department",
          "custom_location",
        ]}
        infiniteScroll={true}
      />
    </div>
  );
};

export default JobRequisition;
