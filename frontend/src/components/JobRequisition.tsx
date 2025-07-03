import React, { useEffect, useState } from "react";
import { MdSearch, MdExpandMore } from "react-icons/md";
import { useNavigate } from "react-router";
import axios from "axios";

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

const JobRequisition: React.FC = () => {
  const navigate = useNavigate();
  const [requisitions, setRequisitions] = useState<APIRequisition[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequisitions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(
          "/api/method/recruitment.api.job_requisition.get_my_job_requisitions"
        );
        const data =
          response.data.message || response.data.data || response.data;
        setRequisitions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err.message ||
            "Failed to load requisitions"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchRequisitions();
  }, []);

  const handleGoToRequisition = (id: string) => {
    navigate(`/webapp/requisitions/${id}`);
  };

  // const filteredRequisitions = requisitions.filter((job) => {
  //   const query = searchTerm.toLowerCase();
  //   return (
  //     job.designation.toLowerCase().includes(query) ||
  //     job.status.toLowerCase().includes(query) ||
  //     job.department.toLowerCase().includes(query) ||
  //     job.custom_location.toLowerCase().includes(query)
  //   );
  // });

  const filteredRequisitions = requisitions.filter((job) => {
    const query = searchTerm.toLowerCase();
    const priority = getPriorityInfo(job.status).label.toLowerCase(); // derived priority

    return (
      job.designation.toLowerCase().includes(query) ||
      job.status.toLowerCase().includes(query) ||
      job.department.toLowerCase().includes(query) ||
      job.custom_location.toLowerCase().includes(query) ||
      priority.includes(query) // ✅ this line makes priority searchable
    );
  });

  return (
    <div
      className="relative flex size-full min-h-screen flex-col group/design-root"
      style={{ fontFamily: "Inter, Noto Sans, sans-serif" }}
    >
      <header className="sticky top-0 z-10 bg-[var(--surface-background)] shadow-sm">
        <div className="px-4 pb-3 pt-1">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MdSearch className="text-[var(--text-secondary)] text-xl" />
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search requisitions..."
              className="form-input block w-full rounded-lg border-none bg-gray-200 py-3 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-opacity-50"
            />
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {["Status", "Department", "Location"].map((filter) => (
            <button
              key={filter}
              className="flex h-9 shrink-0 items-center justify-center gap-x-1.5 rounded-full bg-gray-200 px-4 text-sm font-medium text-[var(--text-primary)] hover:bg-slate-300"
            >
              <span>{filter}</span>
              <MdExpandMore className="text-lg" />
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-2 pb-20">
        <div className="space-y-3 py-3">
          {loading && (
            <p className="text-center text-sm text-gray-500">
              Loading requisitions...
            </p>
          )}
          {error && <p className="text-center text-sm text-red-500">{error}</p>}
          {!loading && !error && filteredRequisitions.length === 0 && (
            <p className="text-center text-sm text-gray-500">
              No requisitions found.
            </p>
          )}
          {filteredRequisitions.map((job) => {
            const priority = getPriorityInfo(job.status);
            const statusColor = getStatusColor(job.status);

            return (
              <div
                key={job.name}
                onClick={() => handleGoToRequisition(job.name)}
                className="rounded-xl border border-slate-200 bg-[var(--surface-background)] p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      {job.designation}
                    </h3>
                    <p
                      className={`text-xs font-medium ${priority.color} mt-0.5`}
                    >
                      {priority.label}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
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
          })}
        </div>
      </main>
    </div>
  );
};

export default JobRequisition;
