import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Copy,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  Eye,
  Settings
} from "lucide-react";
import { useFrappeDocuments } from "../hooks/useFrappeQuery";
import type { JobOpening } from "../types/jobOpening";
import Modal from "./shared/Modal";

type ModalProps = {
  show: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

const StatusModal: React.FC<ModalProps> = ({ show, title, message, onClose }) => {
  const isSuccess = title.toLowerCase() === "success";

  return (
    <Modal isOpen={show} onClose={onClose} size="sm">
      <div className="p-8 text-center bg-white rounded-2xl shadow-xl">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isSuccess ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
            }`}
        >
          {isSuccess ? <CheckCircle size={32} /> : <AlertCircle size={32} />}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="w-full text-white py-3 px-6 rounded-xl font-bold text-sm transition-all tracking-wide active:scale-[0.98]"
          style={{ background: isSuccess ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)" }}
        >
          Ok
        </button>
      </div>
    </Modal>
  );
};

const AddNewReferral: React.FC = () => {
  const navigate = useNavigate();

  // Dynamic Multi-View States: 'list' | 'detail' | 'form'
  const [activeView, setActiveView] = useState<"list" | "detail" | "form">("list");
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);

  // Multi-step Vertical Form Navigation
  const [activeStep, setActiveStep] = useState<
    "biographical" | "contact" | "address" | "work_experience" | "education"
  >("biographical");

  // Education child table rows
  const [educationRows, setEducationRows] = useState([
    { id: Date.now(), degree: "", specialization: "", institution: "", year: "", percentage: "" }
  ]);

  const addEducationRow = () =>
    setEducationRows((prev) => [
      ...prev,
      { id: Date.now(), degree: "", specialization: "", institution: "", year: "", percentage: "" }
    ]);

  const removeEducationRow = (id: number) =>
    setEducationRows((prev) => prev.filter((r) => r.id !== id));

  const updateEducationRow = (id: number, field: string, value: string) =>
    setEducationRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );

  // Form Fields
  const [candidateName, setCandidateName] = useState("");
  const [candidateLastName, setCandidateLastName] = useState("");
  const [nationality, setNationality] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");
  const [notes, setNotes] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pagination & Filtering States for Jobs Table
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal notification States
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  // Query Open Job Openings from Backend
  const { data: jobOpeningsRes, isLoading: isListLoading, } = useFrappeDocuments({
    doctype: "Job Opening",
    fields: [
      "name",
      "job_title",
      "designation",
      "closes_on",
      "publish_applications_received",
      "status",
      "company",
      "location",
      "department",
      "employment_type",
      "description"
    ],
    pageSize: 150,
    orderBy: "creation desc"
  } as any);

  const jobOpeningsList = useMemo(() => {
    return (jobOpeningsRes?.data || []) as unknown as JobOpening[];
  }, [jobOpeningsRes]);

  // Read URL search params on mount for deep linking (e.g. ?job=REC_0057)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobName = params.get("job");
    if (jobName && jobOpeningsList.length > 0) {
      const match = jobOpeningsList.find((j) => j.name === jobName);
      if (match) {
        setSelectedJob(match);
        setActiveView("detail");
      }
    }
  }, [jobOpeningsList]);

  // Filtered Job Openings
  const filteredJobs = useMemo(() => {
    return jobOpeningsList.filter((job) => {
      const title = (job.job_title || "").toLowerCase();
      const code = (job.name || "").toLowerCase();
      const company = (job.company || "").toLowerCase();
      const location = (job.location || "").toLowerCase();
      const q = searchTerm.toLowerCase();
      return title.includes(q) || code.includes(q) || company.includes(q) || location.includes(q);
    });
  }, [jobOpeningsList, searchTerm]);

  // Paginated Job Openings
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredJobs.slice(startIndex, startIndex + pageSize);
  }, [filteredJobs, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredJobs.length / pageSize) || 1;

  // Handle Clipboard Copy
  const handleCopyLink = () => {
    if (!selectedJob) return;
    const referralLink = `${window.location.origin}/webapp/recruitment/refer?job=${selectedJob.name}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size <= 5 * 1024 * 1024) {
        setResumeFile(file);
      } else {
        setModalTitle("Error");
        setModalMessage("File too large. Max size 5MB");
        setShowModal(true);
      }
    }
  };

  const uploadResume = async (): Promise<string | null> => {
    if (!resumeFile) return null;

    const formData = new FormData();
    formData.append("file", resumeFile);

    try {
      setUploading(true);
      const res = await fetch("/api/method/upload_file", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      setUploading(false);
      return result?.message?.file_url || null;
    } catch (error) {
      setUploading(false);
      console.error("Upload error", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!candidateName.trim() || !candidateLastName.trim() || !email.trim() || !phone.trim() || !resumeFile) {
      setModalTitle("Validation Error");
      setModalMessage("First Name, Last Name, Email, Phone, and Resume are required fields.");
      setShowModal(true);
      return;
    }

    const file_url = await uploadResume();
    if (!file_url) {
      setModalTitle("Upload Error");
      setModalMessage("Resume upload failed. Please try again.");
      setShowModal(true);
      return;
    }

    const payload = {
      candidate_name: candidateName.trim(),
      last_name: candidateLastName.trim(),
      email: email.trim(),
      contact_no: phone.trim(),
      for_designation: selectedJob?.designation || selectedJob?.job_title || "",
      resume: file_url,
      docstatus: 1,
    };

    try {
      const res = await fetch(
        "/api/method/recruitment.api.employee_referral.submit_employee_referral",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: payload,
          }),
        }
      );

      const result = await res.json();

      if (res.ok) {
        setModalTitle("Success");
        setModalMessage("Candidate referral submitted successfully!");
        setShowModal(true);
      } else {
        setModalTitle("Submission Error");
        setModalMessage(result?.message || "Something went wrong during referral submission.");
        setShowModal(true);
      }
    } catch (err) {
      console.error("Submit error", err);
      setModalTitle("Error");
      setModalMessage("Error submitting referral.");
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (modalTitle === "Success") {
      navigate("/webapp/recruitment/referrals");
    }
  };

  // ---------------------------------------------------------------
  // VIEW 1: Job listings table ("Refer")
  // ---------------------------------------------------------------
  const renderListView = () => {
    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 md:p-8 animate-fadeIn">
        {/* Header Title & Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Refer</h1>
            <p className="text-xs text-gray-400 font-medium mt-1">Select an active job opening to submit a referral</p>
          </div>
        </div>

        {/* Search bar & utility icons */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl py-3 pl-11 pr-4 text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all duration-300"
            />
          </div>
          <div className="flex gap-2">
            <button className="p-3 rounded-2xl border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
              <Settings size={18} />
            </button>
            <button className="p-3 rounded-2xl border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">
              <Eye size={18} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="py-4 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Job Title & Job Code</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Remote Job</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Company Name</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Department And Business Unit</th>
                <th className="py-4 px-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Employee Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isListLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    Loading job openings...
                  </td>
                </tr>
              ) : paginatedJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    No active job openings found
                  </td>
                </tr>
              ) : (
                paginatedJobs.map((job) => (
                  <tr key={job.name} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-4.5 px-5">
                      <div className="flex flex-col">
                        <button
                          onClick={() => {
                            setSelectedJob(job);
                            setActiveView("detail");
                          }}
                          className="font-extrabold text-sm hover:underline text-left"
                          style={{ color: "var(--primary-color)" }}
                        >
                          {job.job_title}
                        </button>
                        <span className="text-xs text-gray-400 mt-0.5">{job.name}</span>
                      </div>
                    </td>
                    <td className="py-4.5 px-5 text-sm text-gray-600 font-medium">
                      {job.location?.toLowerCase().includes("remote") ? "Yes" : "No"}
                    </td>
                    <td className="py-4.5 px-5 text-sm text-gray-600 font-medium">{job.company}</td>
                    <td className="py-4.5 px-5 text-sm text-gray-600 font-medium leading-relaxed truncate max-w-[200px]" title={job.location || "N/A"}>
                      {job.location || "Corporate Office"}
                    </td>
                    <td className="py-4.5 px-5 text-sm text-gray-800 font-bold">{job.department || "Test Department"}</td>
                    <td className="py-4.5 px-5 text-sm text-gray-600 font-medium">{job.employment_type || "Member"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Custom Pagination Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
          <p className="text-xs text-gray-500 font-medium">
            Showing {filteredJobs.length ? (currentPage - 1) * pageSize + 1 : 0} –{" "}
            {Math.min(currentPage * pageSize, filteredJobs.length)} of {filteredJobs.length} Records
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => c - 1)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-800">
                {currentPage}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => c + 1)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-gray-200 text-xs font-bold text-gray-700 py-1.5 px-2.5 rounded-lg outline-none cursor-pointer focus:border-indigo-500 transition-colors"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-400 font-medium">per page</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------
  // VIEW 2: Job Description details view
  // ---------------------------------------------------------------
  const renderDetailView = () => {
    if (!selectedJob) return null;

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
          <button onClick={() => setActiveView("list")} className="hover:text-[var(--primary-color)] transition-colors">
            Refer
          </button>
          <span>/</span>
          <span className="text-gray-800">{selectedJob.job_title} ({selectedJob.name})</span>
        </div>

        {/* Action Header Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-5 flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{selectedJob.job_title} ({selectedJob.name})</h2>
            <span className="text-xs text-gray-400 font-semibold mt-1">Open since {selectedJob.closes_on ? "23-04-2026" : "N/A"}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView("list")}
              className="py-2.5 px-6 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 tracking-wide transition-all active:scale-[0.98]"
            >
              BACK
            </button>
            <button
              onClick={() => setActiveView("form")}
              className="py-2.5 px-6 rounded-xl text-sm font-bold text-white tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)" }}
            >
              REFER
            </button>
          </div>
        </div>

        {/* Detailed Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Detailed Job overview (70%) */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1.5">Group Company:</p>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">{selectedJob.company}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1.5">Designation:</p>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">{selectedJob.designation || selectedJob.job_title}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1.5">Office Location:</p>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">{selectedJob.custom_location || selectedJob.location || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1.5">Position description:</p>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                {selectedJob.description ? (
                  <span dangerouslySetInnerHTML={{ __html: selectedJob.description }} />
                ) : (
                  "No position description provided."
                )}
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1.5">Primary Responsibilities:</p>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                Will be responsible for supporting corporate initiatives, organizing workflows, and driving team success in alignment with corporate goals.
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1.5">Additional Responsibilities:</p>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                Participate in departmental standups, perform documentation audits, and collaborate cross-functionally.
              </p>
            </div>
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <p className="text-sm font-bold text-gray-800">Reporting Team</p>
              <ul className="list-disc pl-5 text-sm text-gray-500 font-medium space-y-1.5">
                <li>Reporting Designation: Manager</li>
                <li>Reporting Department: {selectedJob.department || "Corporate department"}</li>
              </ul>
            </div>
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <p className="text-sm font-bold text-gray-800">Educational qualifications preferred</p>
              <ul className="list-disc pl-5 text-sm text-gray-500 font-medium space-y-1.5">
                <li>Category: Engineering / General Administration</li>
                <li>Field specialization: Any Graduate / PG</li>
                <li>Degree: B.Tech / MBA / B.Sc</li>
                <li>Academic score: 60% or above</li>
                <li>Institution tier: Tier 1 & Tier 2 preferred</li>
              </ul>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm font-bold text-gray-800 mb-1.5">Required Certification/s:</p>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">N/A</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1.5">Required Training/s:</p>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">N/A</p>
            </div>
          </div>

          {/* Quick Stats Panel (30%) */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 self-start">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Company</p>
              <p className="text-sm font-semibold text-gray-800">{selectedJob.company}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Department</p>
              <p className="text-sm font-semibold text-gray-800">{selectedJob.department || "Test Department"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Experience</p>
              <p className="text-sm font-semibold text-gray-800">{selectedJob.custom_work_experience || "1 - 4 Years"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Employee Type</p>
              <p className="text-sm font-semibold text-gray-800">{selectedJob.custom__employee_type || selectedJob.employment_type || "TESTING"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Salary</p>
              <p className="text-sm font-semibold text-gray-800">{selectedJob.custom_salary || "INR 3 - 5 (Annual)"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Location</p>
              <p className="text-sm font-semibold text-gray-800">{selectedJob.custom_location || selectedJob.location || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Remote Job</p>
              <p className="text-sm font-semibold text-gray-800">{selectedJob.custom_location?.toLowerCase().includes("remote") ? "Yes" : "No"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------
  // VIEW 3: Referral Multi-Step Form
  // ---------------------------------------------------------------
  const renderFormView = () => {
    if (!selectedJob) return null;

    const steps = [
      { id: "biographical", label: "Biographical" },
      { id: "contact", label: "Contact Information" },
      { id: "address", label: "Address Details" },
      { id: "work_experience", label: "Work Experience & Resume" },
      { id: "education", label: "Education" },
    ] as const;

    const isStepVisitedOrFilled = (stepId: typeof steps[number]["id"]) => {
      if (stepId === "biographical") return candidateName !== "" && candidateLastName !== "";
      if (stepId === "contact") return email !== "" && phone !== "";
      if (stepId === "address") return address !== "" && city !== "";
      if (stepId === "work_experience") return resumeFile !== null;
      if (stepId === "education") return educationRows.some(r => r.degree !== "");
      return false;
    };

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
          <button onClick={() => setActiveView("list")} className="hover:text-[var(--primary-color)] transition-colors">
            Refer
          </button>
          <span>/</span>
          <button onClick={() => setActiveView("detail")} className="hover:text-[var(--primary-color)] transition-colors">
            {selectedJob.job_title} ({selectedJob.name})
          </button>
        </div>

        {/* Action Header Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-5 flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{selectedJob.job_title} ({selectedJob.name})</h2>
            <span className="text-xs text-gray-400 font-semibold mt-1">Open since {selectedJob.closes_on ? "23-04-2026" : "N/A"}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView("detail")}
              className="py-2.5 px-6 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 tracking-wide transition-all active:scale-[0.98]"
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="py-2.5 px-6 rounded-xl text-sm font-bold text-white tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)" }}
            >
              {uploading ? "SUBMITTING..." : "REFER"}
            </button>
          </div>
        </div>

        {/* Refer a person using link */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Refer a person using link</h3>
            <p className="text-xs text-gray-400 font-medium mt-1">You can use this referral link to share it to anyone</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 max-w-2xl">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/webapp/recruitment/refer?job=${selectedJob.name}`}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-medium text-gray-500 select-all outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="w-full sm:w-auto py-3 px-6 rounded-xl text-xs font-bold uppercase transition-all tracking-wider shrink-0 flex items-center justify-center gap-2 active:scale-[0.98]"
              style={{ color: "var(--primary-color)", border: "1.5px solid var(--primary-color)" }}
            >
              <Copy size={13} /> {copied ? "COPIED" : "COPY LINK"}
            </button>
          </div>
        </div>

        {/* Tabbed Steps Side Panel Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Vertical step sidebar Navigation */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {steps.map((step, index) => {
              const isActive = activeStep === step.id;
              const isFilled = isStepVisitedOrFilled(step.id);

              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`w-full py-4 px-5 flex items-center gap-3 text-left transition-all duration-200 border-b border-gray-50 last:border-b-0 ${isActive
                    ? "bg-[var(--primary-color)]/5 border-l-4 border-l-[var(--primary-color)]"
                    : "hover:bg-gray-50/60 border-l-4 border-l-transparent"
                    }`}
                >
                  {/* Step number circle */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black transition-all ${isActive
                      ? "text-white"
                      : isFilled
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-400"
                      }`}
                    style={isActive ? { background: "var(--primary-color)" } : {}}
                  >
                    {isFilled && !isActive ? <CheckCircle size={14} className="text-white" /> : index + 1}
                  </div>
                  <span
                    className="text-xs font-semibold leading-tight transition-colors"
                    style={{ color: isActive ? "var(--primary-color)" : "#6b7280" }}
                  >
                    {step.label}
                  </span>
                  {isActive && (
                    <ChevronRight size={14} className="ml-auto shrink-0" style={{ color: "var(--primary-color)" }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Form Step Components Box */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 min-h-[400px]">
            {activeStep === "biographical" && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-base font-extrabold text-gray-800 tracking-tight">Biographical</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">First Name *</label>
                    <input
                      type="text"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="Candidate's first name"
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Last Name *</label>
                    <input
                      type="text"
                      value={candidateLastName}
                      onChange={(e) => setCandidateLastName(e.target.value)}
                      placeholder="Candidate's last name"
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      type="text"
                      disabled
                      value={`${candidateName} ${candidateLastName}`.trim()}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nationality (Naukri)</label>
                    <input
                      type="text"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      placeholder="E.g. Indian"
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep === "contact" && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-base font-extrabold text-gray-800 tracking-tight">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="E.g. candidate@example.com"
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="E.g. +91 99999 99999"
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep === "address" && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-base font-extrabold text-gray-800 tracking-tight">Address Details</h3>
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Address Line</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street name, Appt number"
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all duration-200"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="E.g. Pune"
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">State</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="E.g. Maharashtra"
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Country</label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="E.g. India"
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeStep === "work_experience" && (
              <div className="space-y-6 animate-fadeIn">
                <h3 className="text-base font-extrabold text-gray-800 tracking-tight">Work Experience & Resume</h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Upload Resume *</label>
                    <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 px-6 py-10 bg-gray-50 hover:bg-gray-50/80 hover:border-[var(--primary-color)] transition-all">
                      <Upload size={40} className="text-gray-400" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-800">Drag and drop or browse</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, DOCX, or TXT (max 5MB)</p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileChange}
                        className="hidden"
                        id="resume_file_ref"
                      />
                      <label
                        htmlFor="resume_file_ref"
                        className="py-2.5 px-6 bg-white border border-gray-200 rounded-xl text-xs font-bold tracking-wider uppercase shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        {resumeFile ? "Change File" : "Browse Files"}
                      </label>
                      {resumeFile && (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                          <CheckCircle size={14} /> {resumeFile.name}
                        </div>
                      )}
                      {uploading && <p className="text-xs font-bold animate-pulse" style={{ color: "var(--primary-color)" }}>Uploading attachment...</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Additional Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any additional details or background information about the referral..."
                      className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] min-h-[120px] transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep === "education" && (
              <div className="space-y-5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-gray-800 tracking-tight">Education</h3>
                  <button
                    type="button"
                    onClick={addEducationRow}
                    className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.98] shadow-sm"
                    style={{ background: "linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)" }}
                  >
                    <span className="text-base leading-none">+</span> Add Row
                  </button>
                </div>

                {/* Child Table */}
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {["Degree / Qualification", "Specialization", "Institution", "Year", "Score %", ""].map((col) => (
                          <th key={col} className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {educationRows.map((row) => (
                        <tr key={row.id} className="group hover:bg-gray-50/40 transition-colors">
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={row.degree}
                              onChange={(e) => updateEducationRow(row.id, "degree", e.target.value)}
                              placeholder="B.Tech, MBA…"
                              className="w-full min-w-[120px] bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={row.specialization}
                              onChange={(e) => updateEducationRow(row.id, "specialization", e.target.value)}
                              placeholder="Computer Science…"
                              className="w-full min-w-[130px] bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={row.institution}
                              onChange={(e) => updateEducationRow(row.id, "institution", e.target.value)}
                              placeholder="University / College"
                              className="w-full min-w-[140px] bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={row.year}
                              onChange={(e) => updateEducationRow(row.id, "year", e.target.value)}
                              placeholder="2023"
                              className="w-full min-w-[72px] bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={row.percentage}
                              onChange={(e) => updateEducationRow(row.id, "percentage", e.target.value)}
                              placeholder="75%"
                              className="w-full min-w-[72px] bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeEducationRow(row.id)}
                              disabled={educationRows.length === 1}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Remove row"
                            >
                              <span className="text-base font-bold leading-none">×</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-gray-400 font-medium">
                  Add multiple education records using the <strong>+ Add Row</strong> button.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen py-6 px-4 md:px-8 bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-6">
        {activeView === "list" && renderListView()}
        {activeView === "detail" && renderDetailView()}
        {activeView === "form" && renderFormView()}
      </div>

      <StatusModal
        show={showModal}
        title={modalTitle}
        message={modalMessage}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default AddNewReferral;
