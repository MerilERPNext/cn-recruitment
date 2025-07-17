"use client";

import type React from "react";
import { useMemo, useState, useCallback, useEffect } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  User,
  AlertCircle,
  RefreshCw,
  BriefcaseBusiness,
  MapPin,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useRequisitionDetails,
  isPermissionError,
} from "../hooks/useRequisition";
import type { StatusDisplay } from "../types/requisition";
import DOMPurify from "dompurify";

const RequisitionDetails: React.FC = () => {
  const navigate = useNavigate();
  const { requisitionId } = useParams<{ requisitionId: string }>();
  const [showEdit, setShowEdit] = useState(false);

  console.log(`🎯 RequisitionDetails initialized with ID: ${requisitionId}`);

  // Use React Query hook
  const {
    data: requisitionResponse,
    isLoading,
    error,
    refetch,
  } = useRequisitionDetails(
    { requisition_name: requisitionId || "" },
    { enabled: !!requisitionId }
  );

  console.log("Requisition Response:", requisitionResponse);

  // Extract job data from response
  const job = useMemo(() => {
    if (!requisitionResponse) return null;
    return requisitionResponse.job_requisition; // Map to job_requisition from the response
  }, [requisitionResponse]);

  const [sanitizedDescription, setSanitizedDescription] = useState<string>("");

  useEffect(() => {
    if (job?.description) {
      setSanitizedDescription(DOMPurify.sanitize(job.description));
    } else {
      setSanitizedDescription("");
    }
  }, [job?.description]);

  const handleBackInterview = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const getStatusDisplay = useCallback((status: string): StatusDisplay => {
    const lowerStatus = status?.toLowerCase?.() || "";
    switch (lowerStatus) {
      case "pending":
        return {
          icon: <Clock className="w-6 h-6 text-yellow-600" />,
          bgColor: "bg-yellow-100",
          textColor: "text-yellow-600",
          label: "Pending",
        };
      case "open & approved":
      case "job opening created":
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          bgColor: "bg-green-100",
          textColor: "text-green-600",
          label: "Open & Approved",
        };
      case "in-progress":
        return {
          icon: <Clock className="w-6 h-6 text-blue-600" />,
          bgColor: "bg-blue-100",
          textColor: "text-blue-600",
          label: "In-Progress",
        };
      case "rejected":
        return {
          icon: <Clock className="w-6 h-6 text-red-600" />,
          bgColor: "bg-red-100",
          textColor: "text-red-600",
          label: "Rejected",
        };
      case "filled":
        return {
          icon: <CheckCircle className="w-6 h-6 text-gray-700" />,
          bgColor: "bg-gray-200",
          textColor: "text-gray-700",
          label: "Filled",
        };
      case "on hold":
        return {
          icon: <Clock className="w-6 h-6 text-orange-600" />,
          bgColor: "bg-orange-100",
          textColor: "text-orange-600",
          label: "On Hold",
        };
      case "cancelled":
        return {
          icon: <Clock className="w-6 h-6 text-red-400" />,
          bgColor: "bg-red-100",
          textColor: "text-red-400",
          label: "Cancelled",
        };
      default:
        return {
          icon: <Clock className="w-6 h-6 text-gray-500" />,
          bgColor: "bg-gray-100",
          textColor: "text-gray-500",
          label: "Unknown",
        };
    }
  }, []);

  const getPriorityInfo = useCallback(
    (status?: string): { label: string; color: string } => {
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
    },
    []
  );

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <main>
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
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center space-x-2 text-gray-500">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="text-lg">Loading requisition details...</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main>
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
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md mx-auto text-center">
              {isPermissionError(error) ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <AlertCircle className="h-8 w-8 text-yellow-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Access Restricted
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      You don't have permission to view this requisition. Please
                      contact your administrator for access.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <button
                        onClick={handleRetry}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </button>
                      <button
                        onClick={handleBackInterview}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="p-3 bg-red-100 rounded-full">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Error Loading Requisition
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {error.message}
                    </p>
                    <button
                      onClick={handleRetry}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // No data state
  if (!job || !job.name) {
    return (
      <main>
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
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Requisition Not Found
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                The requested requisition could not be found.
              </p>
              <button
                onClick={handleBackInterview}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
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
          {/* Header Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {job.designation || "N/A"}
            </h1>
            <div className="flex flex-grow gap-2 mt-2">
              {/* First growing element */}
              <p className="flex-1 text-sm bg-gray-200 px-2 rounded text-center flex items-center gap-2 font-medium text-gray-600">
                <BriefcaseBusiness className="w-4" />
                {job.department || "N/A"}
              </p>

              {/* Second growing element */}
              <p className="flex-1 text-sm px-2 bg-gray-200 flex items-center gap-2 rounded text-center font-medium text-gray-600">
                <MapPin className="w-4" />
                {job.location || "N/A"}
              </p>

              {/* Third growing element */}
              <p className="flex-1 text-sm bg-gray-200 px-2 flex items-center gap-2 rounded text-center font-medium text-gray-600">
                <Clock className="w-4" />
                {job.employment_type || "N/A"}
              </p>
            </div>
          </div>

          {/* Job Description */}
          {job.description && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Job Description & Requirement
              </h2>
              <div className="space-y-2">
                <div
                  dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                />
              </div>
            </section>
          )}

          {/* Status Section */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Status</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div
                  className={`flex items-center justify-center w-10 h-10 ${
                    getStatusDisplay(job.status || "").bgColor
                  } rounded-full`}
                >
                  {getStatusDisplay(job.status || "").icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Current Status</p>
                  <p
                    className={`text-sm font-medium ${
                      getStatusDisplay(job.status || "").textColor
                    }`}
                  >
                    {getStatusDisplay(job.status || "").label}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Assigned Teams */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Assigned Teams
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div
                  className={`flex items-center justify-center w-12 h-12 ${
                    getStatusDisplay(job.status || "").bgColor
                  } rounded-full`}
                >
                  <div
                    className={`w-16 h-12 bg-gray-200 rounded-full flex items-center justify-center`}
                  >
                    <User className="w-6 h-6" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Assign To Recruiter
                  </p>
                  <p className="text-sm font-medium">
                    {job.custom_assign_to_recruiter || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Application Statistics */}
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
                  {requisitionResponse?.job_applicant_count || 0}
                </p>
              </div>
              <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Reviewed
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {requisitionResponse?.review_count || 0}
                </p>
              </div>
              <div className="col-span-2 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Interviewing
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {requisitionResponse?.interview_count || 0}
                </p>
              </div>
            </div>
          </section>

          {/* Details Section */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Details
            </h2>
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
              <div className="px-4 py-3 flex justify-between items-center">
                <p className="text-sm font-medium text-gray-600">
                  Requisition ID
                </p>
                <p className="text-sm font-medium text-gray-900">{job.name}</p>
              </div>
              <div className="px-4 py-3 flex justify-between items-center">
                <p className="text-sm font-medium text-gray-600">Positions</p>
                <p className="text-sm font-medium text-gray-900">
                  {job.no_of_positions || "N/A"}
                </p>
              </div>
              <div className="px-4 py-3 flex justify-between items-center">
                <p className="text-sm font-medium text-gray-600">Expected By</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(job.expected_by)}
                </p>
              </div>
              <div className="px-4 py-3 flex justify-between items-center">
                <p className="text-sm font-medium text-gray-600">Deadline</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(job.deadline)}
                </p>
              </div>
              <div className="px-4 py-3 flex justify-between items-center">
                <p className="text-sm font-medium text-gray-600">Salary</p>
                <p className="text-sm font-medium text-gray-900">
                  {job.salary_range || "N/A"}
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

        <footer className="sticky bottom-0 bg-white border-t shadow-lg">
          <div className="border-gray-200 p-4 max-w-4xl mx-auto px-6 py-4">
            <button
              className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={() => {
                console.log(`📝 Opening edit requisition for ${requisitionId}`);
                window.open(`/app/job-requisition/${requisitionId}`);
              }}
            >
              Edit Requisition
            </button>
          </div>
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
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default RequisitionDetails;
