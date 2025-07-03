import React, { ReactElement, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, Clock, User } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import axios from "axios";
import EditRequisition from "./EditRequisition";

// Type definitions
interface ApprovalWorkflow {
  id: number;
  name: string;
  status: "approved" | "pending" | "rejected";
  approvedDate: string | null;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar: string | null;
}

interface ApplicationStats {
  totalApplications: number;
  reviewed: number;
  interviewing: number;
}

interface SalaryRange {
  min: number;
  max: number;
}

interface Details {
  budget: number;
  salaryRange: SalaryRange;
  deadline: string;
  priority: "High" | "Medium" | "Low";
}

interface StatusDisplay {
  icon: ReactElement;
  bgColor: string;
  textColor: string;
  label: string;
}

const RequisitionDetails: React.FC = () => {
  const navigate = useNavigate();
  const { requisitionId } = useParams<{ requisitionId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(
          "/api/method/recruitment.api.job_requisition.get_job_requisition_details",
          {
            params: { requisition_name: requisitionId },
          }
        );

        const resData =
          response.data.message || response.data.data || response.data;

        setData(resData);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err.message ||
            "Failed to load requisition details"
        );
      } finally {
        setLoading(false);
      }
    };
    if (requisitionId) fetchDetails();
  }, [requisitionId]);

  const handleBackInterview = () => navigate(-1);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getStatusDisplay = (status: string): StatusDisplay => {
    switch (status) {
      case "approved":
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          bgColor: "bg-green-100",
          textColor: "text-green-600",
          label: "Approved",
        };
      case "pending":
        return {
          icon: <Clock className="w-6 h-6 text-orange-500" />,
          bgColor: "bg-orange-100",
          textColor: "text-orange-500",
          label: "Pending",
        };
      default:
        return {
          icon: <Clock className="w-6 h-6 text-gray-500" />,
          bgColor: "bg-gray-100",
          textColor: "text-gray-500",
          label: "Unknown",
        };
    }
  };

  const getPriorityInfo = (
    status?: string
  ): { label: string; color: string } => {
    if (!status) {
      return { label: "Normal Priority", color: "text-yellow-600" };
    }

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

  const getCleanDescription = (html: string): string => {
    if (!html) return "";
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.querySelector(".ql-editor")?.innerHTML || html;
  };

  const fallbackApprovalWorkflow: ApprovalWorkflow[] = [
    {
      id: 1,
      name: "HR Manager",
      status: "approved",
      approvedDate: "2025-06-30",
    },
    {
      id: 2,
      name: "Finance Head",
      status: "pending",
      approvedDate: null,
    },
  ];

  const fallbackAssignedTeam: TeamMember[] = [
    {
      id: 1,
      name: "Priya Sharma",
      role: "Recruiter",
      avatar: null,
    },
    {
      id: 2,
      name: "Amit Verma",
      role: "Hiring Manager",
      avatar: null,
    },
  ];

  const job = data?.job_requisition || {};
  const salaryRange: SalaryRange = (() => {
    if (typeof job.salary_range === "string") {
      const [minStr, maxStr] = job.salary_range.split("-");
      return {
        min: parseInt(minStr) || 0,
        max: parseInt(maxStr) || 0,
      };
    }
    return { min: 0, max: 0 };
  })();

  const approvalWorkflow: ApprovalWorkflow[] =
    data?.approvalWorkflow || fallbackApprovalWorkflow;
  const assignedTeam: TeamMember[] = data?.assignedTeam || fallbackAssignedTeam;

  const applicationStats: ApplicationStats = {
    totalApplications: data?.job_applicant_count || 0,
    reviewed: data?.review_count || 0,
    interviewing: data?.interview_count || 0,
  };

  const details: Details = {
    budget: job.budget || 0,
    salaryRange,
    deadline: job.deadline || new Date().toISOString(),
    priority: job.priority || "Medium",
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={handleBackInterview}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 pr-10">
            Requisition Details
          </h2>
        </div>
      </header>
      <main className="flex-1 px-4 pt-4 pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {job.designation}
          </h1>
          <p className="text-sm font-medium text-gray-600">
            {job.department} · {"job.location"} · {job.employment_type}
          </p>
        </div>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Description & Requirements
          </h2>
          <div
            className="text-base text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: getCleanDescription(job.description),
            }}
          />
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Approval Workflow
          </h2>
          <div className="space-y-3">
            {approvalWorkflow.map((approval) => {
              const statusDisplay = getStatusDisplay(approval.status);
              return (
                <div
                  key={approval.id}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 ${statusDisplay.bgColor} rounded-full`}
                  >
                    {statusDisplay.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{approval.name}</p>
                    <p
                      className={`text-sm font-medium ${statusDisplay.textColor}`}
                    >
                      {statusDisplay.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Assigned Team
          </h2>
          <div className="space-y-3">
            {assignedTeam.map((member, index) => {
              const avatarColors = [
                "bg-blue-500",
                "bg-purple-500",
                "bg-green-500",
                "bg-red-500",
                "bg-yellow-500",
              ];
              const avatarColor = avatarColors[index % avatarColors.length];
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
                >
                  <div
                    className={`w-12 h-12 ${avatarColor} rounded-full flex items-center justify-center`}
                  >
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.role}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Application Statistics
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Total Applications
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {applicationStats.totalApplications}
              </p>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <p className="text-sm font-medium text-gray-600 mb-1">Reviewed</p>
              <p className="text-3xl font-bold text-gray-900">
                {applicationStats.reviewed}
              </p>
            </div>
            <div className="col-span-2 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Interviewing
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {applicationStats.interviewing}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Details</h2>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
            <div className="px-4 py-3 flex justify-between items-center">
              <p className="text-sm font-medium text-gray-600">Budget</p>
              <p className="text-sm font-medium text-gray-900">
                {details.budget
                  ? formatCurrency(details.budget)
                  : "details.budget"}
              </p>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <p className="text-sm font-medium text-gray-600">Salary Range</p>
              <p className="text-sm font-medium text-gray-900">
                {formatCurrency(details.salaryRange.min)} -{" "}
                {formatCurrency(details.salaryRange.max)}
              </p>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <p className="text-sm font-medium text-gray-600">Deadline</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(details.deadline)}
              </p>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <p className="text-sm font-medium text-gray-600">Priority</p>
              {(() => {
                const { label, color } = getPriorityInfo(job?.status);
                return (
                  <p className={`text-sm font-semibold ${color}`}>{label}</p>
                );
              })()}
            </div>
          </div>
        </section>
      </main>
      <footer className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition-colors duration-200"
          onClick={() => setShowEdit(true)}
        >
          Edit Requisition
        </button>
      </footer>
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-lg relative">
            <button
              onClick={() => setShowEdit(false)}
              className="absolute top-2 right-2 text-xl font-bold"
            >
              ×
            </button>
            <EditRequisition
              requisition={job}
              onClose={() => setShowEdit(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RequisitionDetails;
