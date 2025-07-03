import React, { useEffect, useState } from "react";
import {
  MdSearch,
  MdFilterList,
  MdWork,
  MdBusiness,
  MdLocationOn,
} from "react-icons/md";
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
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    designation: "",
    department: "",
    status: [] as string[],
    location: "",
  });

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

  const filteredRequisitions = requisitions.filter((job) => {
    const query = searchTerm.toLowerCase();
    const priority = getPriorityInfo(job.status).label.toLowerCase();

    return (
      (job.designation.toLowerCase().includes(query) ||
        job.status.toLowerCase().includes(query) ||
        job.department.toLowerCase().includes(query) ||
        job.custom_location.toLowerCase().includes(query) ||
        priority.includes(query)) &&
      (filters.designation === "" ||
        job.designation
          .toLowerCase()
          .includes(filters.designation.toLowerCase())) &&
      (filters.department === "" ||
        job.department
          .toLowerCase()
          .includes(filters.department.toLowerCase())) &&
      (filters.location === "" ||
        job.custom_location
          .toLowerCase()
          .includes(filters.location.toLowerCase())) &&
      (filters.status.length === 0 ||
        filters.status.includes(job.status.toLowerCase()))
    );
  });

  const toggleStatus = (status: string) => {
    const exists = filters.status.includes(status);
    setFilters({
      ...filters,
      status: exists
        ? filters.status.filter((s) => s !== status)
        : [...filters.status, status],
    });
  };

  const uniqueStatuses = Array.from(
    new Set(requisitions.map((job) => job.status))
  ).filter(Boolean);
  

  return (
    <div
      className="relative flex size-full min-h-screen flex-col group/design-root"
      style={{ fontFamily: "Inter, Noto Sans, sans-serif" }}
    >
      <header className="sticky top-0 z-10 bg-[var(--surface-background)] shadow-sm">
        <div className="flex justify-between items-center px-4 pb-3 pt-1">
          <div className="flex-1 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MdSearch className="text-[var(--text-secondary)] text-xl" />
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search requisitions..."
              className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--background-light)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] "
            />
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="ml-2 px-4 py-2 flex items-center gap-1 rounded-md border-[var(--border-light)] bg-[var(--background-light)] hover:[var(--background-light)]focus:ring-[var(--primary-color)]"
          >
            <MdFilterList className="text-xl" /> 
            <span className="hidden sm:inline">Filters</span>
          </button>
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

      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-xl p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">Filter Tasks</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center text-sm font-medium mb-1">
                  <MdWork className="mr-1" /> Designation
                </label>
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="Search by designation"
                  value={filters.designation}
                  onChange={(e) =>
                    setFilters({ ...filters, designation: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="flex items-center text-sm font-medium mb-1">
                  <MdBusiness className="mr-1" /> Department
                </label>
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="Search by department"
                  value={filters.department}
                  onChange={(e) =>
                    setFilters({ ...filters, department: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="flex items-center text-sm font-medium mb-1">
                  <MdLocationOn className="mr-1" /> Location
                </label>
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="Search by location"
                  value={filters.location}
                  onChange={(e) =>
                    setFilters({ ...filters, location: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1">Status</label>
                <div className="flex flex-wrap gap-2">
                  {uniqueStatuses.map((status) => (
                    <label key={status} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status.toLowerCase())}
                        onChange={() => toggleStatus(status.toLowerCase())}
                      />
                      <span className="text-sm">{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() =>
                  setFilters({
                    designation: "",
                    department: "",
                    status: [],
                    location: "",
                  })
                }
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobRequisition;
