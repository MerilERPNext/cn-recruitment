/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Copy,
  CheckCircle,
  AlertCircle,
  Upload,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useCurrentEmployeeDetails } from "../hooks/useEmployee";
import type { JobOpening } from "../types/jobOpening";
import Modal from "./shared/Modal";
import DataListView from "./DataListView";
import { compileFormioSchema, ApplicationField } from "./Recruitment/referralFormSchemas";
import toast from "react-hot-toast";
import CardTable from "./shared/CardTable";
import { Typography } from "./shared/atoms/Typography";

// ─── Status Modal ────────────────────────────────────────────────────────────

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
          style={{
            background: isSuccess
              ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
              : "linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)"
          }}
        >
          Ok
        </button>
      </div>
    </Modal>
  );
};

// ─── Validation Warning Banner ───────────────────────────────────────────────

type ValidationBannerProps = {
  fields: string[];
  onDismiss: () => void;
};

const ValidationBanner: React.FC<ValidationBannerProps> = ({ fields, onDismiss }) => {
  if (fields.length === 0) return null;
  return (
    <div className="relative flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 shadow-sm animate-shake">
      {/* left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-rose-500" />
      <div className="shrink-0 mt-0.5 text-rose-500">
        <AlertTriangle size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-rose-700 mb-1">
          Please complete all required fields before proceeding
        </p>
        <ul className="flex flex-wrap gap-1.5 mt-1.5">
          {fields.map(f => (
            <li
              key={f}
              className="inline-flex items-center text-xs font-semibold bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-200"
            >
              {f}
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 text-rose-400 hover:text-rose-600 transition-colors"
        aria-label="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const AddNewReferral: React.FC = () => {
  const navigate = useNavigate();

  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const referrerEmployee = user?.employee || "";

  const [activeView, setActiveView] = useState<"list" | "detail" | "form">("list");
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  // Ref mirrors formData synchronously so validation always reads the latest value
  // even if React hasn't flushed the setState yet (e.g. user types then immediately clicks Next)
  const formDataRef = React.useRef<Record<string, any>>({});
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Validation state
  const [stepValidationErrors, setStepValidationErrors] = useState<string[]>([]);

  // Status modals
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  // ── Fetch dynamic fields ──────────────────────────────────────────────────

  const { data: fieldsRes, isLoading: isFieldsLoading, error: fieldsError } = useQuery({
    queryKey: ["refer-application-fields", selectedJob?.name],
    queryFn: async () => {
      if (!selectedJob?.name) return null;
      const res = await fetch(
        `/api/method/recruitment.api.channels.refer.get_application_fields?opening=${selectedJob.name}`
      );
      if (!res.ok) throw new Error("Failed to fetch application fields");
      const json = await res.json();
      return (json.message || []) as ApplicationField[];
    },
    enabled: !!selectedJob?.name
  });

  const formioSchema = useMemo(() => {
    if (!fieldsRes) return null;
    return compileFormioSchema(fieldsRes);
  }, [fieldsRes]);

  const sections = useMemo(() => {
    if (!fieldsRes) return [];
    const unique = new Set<string>();
    fieldsRes.forEach(f => {
      if (f.visibility !== "None") unique.add(f.section || "Basic Details");
    });
    return Array.from(unique);
  }, [fieldsRes]);

  const activeSection = sections[activeStepIndex] || "";

  const stepSchema = useMemo(() => {
    if (!formioSchema || !activeSection) return null;
    const activePanel = formioSchema.components.find(
      (comp: any) => comp.type === "panel" && comp.title === activeSection
    );
    return activePanel ? { components: [activePanel] } : null;
  }, [formioSchema, activeSection]);

  const activeStepAttachFields = useMemo(() => {
    if (!fieldsRes || !activeSection) return [];
    return fieldsRes.filter(
      field => field.section === activeSection && field.fieldtype === "Attach"
    );
  }, [fieldsRes, activeSection]);

  // ── URL deep linking ──────────────────────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobName = params.get("job");
    if (jobName) {
      fetch(`/api/method/recruitment.api.channels.refer.list_openings`)
        .then(res => res.json())
        .then(json => {
          const list = (json.message || []) as JobOpening[];
          const match = list.find(j => j.name === jobName);
          if (match) {
            setSelectedJob(match);
            setActiveView("detail");
          }
        })
        .catch(err => console.error("Linking error", err));
    }
  }, []);

  // Clear validation errors when step changes
  useEffect(() => {
    setStepValidationErrors([]);
  }, [activeStepIndex]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Returns missing required field display names for the given section.
   */
  const getMissingRequiredInSection = (sectionName: string): string[] => {
    const missing: string[] = [];
    // Read from ref (synchronous) so we never miss a field the user just typed
    const latestData = formDataRef.current;
    fieldsRes?.forEach(field => {
      if (
        field.section === sectionName &&
        field.reqd === 1 &&
        field.visibility !== "None"
      ) {
        const val = latestData[field.reference_name];
        const isEmpty =
          val === undefined ||
          val === null ||
          val === "" ||
          (Array.isArray(val) && val.length === 0);
        if (isEmpty) missing.push(field.display_name);
      }
    });
    return missing;
  };

  const handleCopyLink = () => {
    if (!selectedJob) return;
    const referralLink = `${window.location.origin}/webapp/recruitment/refer?job=${selectedJob.name}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      setUploading(true);
      const res = await fetch("/api/method/upload_file", { method: "POST", body: fd });
      const result = await res.json();
      setUploading(false);
      return result?.message?.file_url || null;
    } catch (error) {
      setUploading(false);
      console.error("Upload error", error);
      return null;
    }
  };

  const handleChange = (changed: any) => {
    const merged = { ...formDataRef.current, ...changed.data };
    formDataRef.current = merged;            // sync update — always up to date
    setFormData(merged);
    // Clear validation banner as user fills in fields
    if (stepValidationErrors.length > 0) {
      setStepValidationErrors([]);
    }
  };

  const isSectionVisitedOrFilled = (sectionName: string) => {
    const sectionFields = fieldsRes?.filter(f => f.section === sectionName) || [];
    return sectionFields.some(
      f => formData[f.reference_name] !== undefined && formData[f.reference_name] !== ""
    );
  };

  /**
   * Validates current step; returns true if valid, false otherwise.
   */
  const validateCurrentStep = (): boolean => {
    const missing = getMissingRequiredInSection(activeSection);
    if (missing.length > 0) {
      setStepValidationErrors(missing);
      // Scroll validation banner into view
      setTimeout(() => {
        document.getElementById("validation-banner")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return false;
    }
    setStepValidationErrors([]);
    return true;
  };

  const handleNextStep = () => {
    if (!validateCurrentStep()) return;
    setActiveStepIndex(prev => Math.min(prev + 1, sections.length - 1));
  };

  const handleSubmit = async () => {
    // Validate ALL sections before final submit
    const allMissing: string[] = [];
    sections.forEach(section => {
      const missing = getMissingRequiredInSection(section);
      allMissing.push(...missing);
    });

    if (allMissing.length > 0) {
      setModalTitle("Validation Error");
      setModalMessage(`Please complete all required fields: ${allMissing.join(", ")}`);
      setShowModal(true);
      return;
    }

    const allowedFields = new Set((fieldsRes || []).map(f => f.reference_name));

    const formatPayloadDates = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (Array.isArray(obj)) return obj.map(formatPayloadDates);
      if (typeof obj === "object") {
        const clean: Record<string, any> = {};
        for (const [key, val] of Object.entries(obj)) clean[key] = formatPayloadDates(val);
        return clean;
      }
      if (
        typeof obj === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)
      ) {
        return obj.split("T")[0];
      }
      return obj;
    };

    const cleanData: Record<string, any> = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (
        allowedFields.has(key) &&
        value !== "" &&
        value !== null &&
        value !== undefined &&
        !(Array.isArray(value) && value.length === 0)
      ) {
        cleanData[key] = formatPayloadDates(value);
      }
    });
   cleanData.job_title = selectedJob?.name || ""; // HR-OPN-2025-0004
  cleanData.source = "Refer";
    try {
      setUploading(true);
      const params = new URLSearchParams();
      params.append("opening", selectedJob?.name || "");
      params.append("data", JSON.stringify(cleanData));
      params.append("referrer_employee", referrerEmployee);

      const res = await fetch("/api/method/recruitment.api.channels.refer.submit_referral", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
      });

      const result = await res.json();
      setUploading(false);

      if (res.ok && result?.message?.status === "ok") {
        setModalTitle("Success");
        setModalMessage("Referral application submitted successfully!");
        setShowModal(true);
      } else {
        setModalTitle("Submission Error");
        setModalMessage(result?.message || "Referral submission failed.");
        setShowModal(true);
      }
    } catch (err) {
      setUploading(false);
      setModalTitle("Error");
      setModalMessage("Something went wrong during submission.");
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (modalTitle === "Success") navigate("/webapp/recruitment/referrals");
  };

  // ── VIEW 1: Job listing ───────────────────────────────────────────────────
  const titles = ["Job Title", "Remote Job", "Company Name", "Location", "Department"];
  const columnWidths = ["0.5fr", "1.2fr", "1.2fr", "1fr", "1fr"];

  const renderListView = () => (
    <div className="md:p-2 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Refer</h1>
        <p className="text-xs text-gray-400 font-medium mt-1">
          Select an active job opening to submit a referral
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 mt-4">
        <div className="w-full">
          <CardTable
          titles={titles}
          columnWidths={columnWidths}

        >
          <DataListView<JobOpening>
            queryKey={["referable-openings"]}
            customAPI={{ method: "recruitment.api.channels.refer.list_openings", params: {} }}
            isSearch={true}
            isFilter={false}
            showPagination={true}
            pageSize={10}
            onItemClick={job => {
              setSelectedJob(job);
              setActiveView("detail");
            }}
            noRecordsScreen={
              <div className="py-12 text-center text-sm text-gray-400">
                No active job openings found
              </div>
            }
            renderItem={(job: JobOpening) => (
              <div
                key={job.name}
                className="grid gap-4 px-6 py-4 border-b border-gray-100 items-center hover:bg-gray-50/50 transition-colors group cursor-pointer"
                style={{ gridTemplateColumns: ".5fr 1.2fr 1.2fr 1fr 1fr" }}
              >
                <div className="flex flex-col">
             <Typography variant="bodySmall" className="font-medium text-center">                 
                    {job.job_title}
              </Typography>
                </div>
                <Typography variant="bodySmall" className="font-medium text-center">   
                  {job.location?.toLowerCase().includes("remote") ? "Yes" : "No"}
                  </Typography>
                  <Typography variant="bodySmall" className="font-medium text-center">  {job.company}</Typography>
                  <Typography variant="bodySmall" className="font-medium text-center">  
                <span className=" truncate text-center" title={job.location || "N/A"}>
                  {job.location || "Corporate Office"}
                </span>
                  </Typography>
                  <Typography variant="bodySmall" className="font-medium text-center">  
                  {job.department || "Test Department"}
                  </Typography>
              </div>
            )}
          />
          </CardTable>
        </div>
      </div>
    </div>
  );

  // ── VIEW 2: Job detail ────────────────────────────────────────────────────

  const renderDetailView = () => {
    if (!selectedJob) return null;
    return (
      <div className="space-y-2 animate-fadeIn">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
          <button
            onClick={() => setActiveView("list")}
            className="hover:text-[var(--primary-color)] transition-colors"
          >
            Refer
          </button>
          <span>/</span>
          <span className="text-gray-800">
            {selectedJob.job_title} ({selectedJob.name})
          </span>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between">
  
          <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView("list")}
            className="py-2.5 px-2.5 rounded-full border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 tracking-wide transition-all active:scale-[0.98]"
          >
            <ChevronLeft size={16} />

          </button>
           <div className="flex flex-col">
           <h2 className="font-bold text-[17px] text-text-title tracking-tight">
              {selectedJob.job_title} ({selectedJob.name})
            </h2>
            <span className="text-xs text-gray-400 font-semibold mt-1">
              Open since {selectedJob.posted_on || "N/A"}
            </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setActiveStepIndex(0); setActiveView("form"); }}
              className="py-2 px-6  bg-primary-500 rounded-lg text-sm font-bold text-white tracking-wide transition-all hover:opacity-90 active:scale-[0.98] "
            >
              REFER
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <div className="lg:col-span-1 bg-white rounded-lg border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
            {[
              { label: "Group Company", value: selectedJob.company },
              { label: "Designation", value: selectedJob.designation || selectedJob.job_title },
              { label: "Office Location", value: selectedJob.location || "Corporate Office" }
            ].map(item => (
              <div key={item.label}>
                <p className="text-sm font-bold text-gray-800 mb-1.5">{item.label}:</p>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.value}</p>
              </div>
            ))}
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1.5">Position description:</p>
              <div className="text-sm text-gray-500 font-medium leading-relaxed">
                {selectedJob.description ? (
                  <span dangerouslySetInnerHTML={{ __html: selectedJob.description }} />
                ) : (
                  "No position description provided."
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 self-start">
            {[
              { label: "Company", value: selectedJob.company },
              { label: "Department", value: selectedJob.department || "Corporate department" },
              { label: "Designation", value: selectedJob.designation || "Associate" },
              { label: "Location", value: selectedJob.location || "Corporate Office" },
              {
                label: "Remote Job",
                value: selectedJob.location?.toLowerCase().includes("remote") ? "Yes" : "No"
              }
            ].map(item => (
              <div key={item.label}>
                <p className="text-sm font-bold text-gray-800 mb-1.5">
                  {item.label}
                </p>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── VIEW 3: Referral multi-step form ──────────────────────────────────────

  const renderFormView = () => {
    if (!selectedJob) return null;

    if (isFieldsLoading) {
      return (
        <div className="py-12 text-center text-sm text-gray-400">
          Loading dynamic referral fields...
        </div>
      );
    }

    if (fieldsError) {
      return (
        <div className="py-12 text-center text-sm text-rose-500 font-bold">
          Failed to load referral application fields.
        </div>
      );
    }

    const isLastStep = activeStepIndex === sections.length - 1;

    return (
      <div className="space-y-2 animate-fadeIn">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
          <button
            onClick={() => setActiveView("list")}
            className="hover:text-[var(--primary-color)] transition-colors"
          >
            Refer
          </button>
          <span>/</span>
          <button
            onClick={() => setActiveView("detail")}
            className="hover:text-[var(--primary-color)] transition-colors"
          >
            {selectedJob.job_title} ({selectedJob.name})
          </button>
        </div>

        {/* Header card — only Cancel lives here now */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm px-4 py-5 flex items-center gap-4 justify-start">
          <button
            onClick={() => setActiveView("detail")}
            className="py-2.5 px-2.5 rounded-full border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 tracking-wide transition-all active:scale-[0.98]"
          >
            <ChevronLeft size={16} />

          </button>
          <div className="flex flex-col">
            <h2 className="font-bold text-[17px] text-text-title tracking-tight">
              {selectedJob.job_title} ({selectedJob.name})
            </h2>
            <span className="text-xs text-gray-400 font-semibold mt-1">
              Referral attribution to employee: {referrerEmployee || "Unassigned"}
            </span>
          </div>

        </div>

        {/* Copy link card */}
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6 md:p-8 space-y-2">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Refer a person using link</h3>
            <p className="text-xs text-gray-400 font-medium mt-1">
              You can copy and share this personalized deep referral link
            </p>
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

        {/* Step sidebar + Form panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 items-start">
          {/* Vertical sidebar */}
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
            {sections.map((section, index) => {
              const isActive = activeStepIndex === index;
              const isFilled = isSectionVisitedOrFilled(section);
              const hasMissing =
                isActive && stepValidationErrors.length > 0;

              return (
                <button
                  key={section}
                  onClick={() => {
                    if (index === activeStepIndex) return; // already here

                    if (index > activeStepIndex) {
                      // Moving FORWARD — validate every step between current and target
                      let canJump = true;
                      for (let s = activeStepIndex; s < index; s++) {
                        const missing = getMissingRequiredInSection(sections[s]);
                        if (missing.length > 0) {
                          setStepValidationErrors(missing);
                          setTimeout(() => {
                            document
                              .getElementById("validation-banner")
                              ?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }, 50);
                          canJump = false;
                          break;
                        }
                      }
                      if (!canJump) return;
                    } else {
                      // Moving BACKWARD — always allowed, clear any errors
                      setStepValidationErrors([]);
                    }

                    setActiveStepIndex(index);
                  }}
                  className={`w-full py-4 px-5 flex items-center gap-3 text-left transition-all duration-200 border-b border-gray-50 last:border-b-0 ${isActive
                    ? hasMissing
                      ? "bg-rose-50/60 border-l-4 border-l-rose-500"
                      : "bg-[var(--primary-color)]/5 border-l-4 border-l-[var(--primary-color)]"
                    : "hover:bg-gray-50/60 border-l-4 border-l-transparent"
                    }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black transition-all ${isActive
                      ? hasMissing
                        ? "bg-rose-500 text-white"
                        : "text-white"
                      : isFilled
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-400"
                      }`}
                    style={isActive && !hasMissing ? { background: "var(--primary-color)" } : {}}
                  >
                    {isFilled && !isActive ? (
                      <CheckCircle size={14} className="text-white" />
                    ) : isActive && hasMissing ? (
                      <AlertTriangle size={13} />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className="text-xs font-semibold leading-tight transition-colors"
                    style={{
                      color: isActive
                        ? hasMissing
                          ? "#ef4444"
                          : "var(--primary-color)"
                        : "#6b7280"
                    }}
                  >
                    {section}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Form panel */}
          <div className="lg:col-span-3  bg-white rounded-lg border border-gray-100 shadow-sm flex flex-col min-h-[480px]">
            {/* Form body — scrollable content area */}
            <div className="flex-1 p-6 md:p-8">
              <h3 className="text-base font-extrabold text-gray-800 tracking-tight mb-5">
                {activeSection}
              </h3>

              {/* ── Validation Warning Banner ── */}
              {stepValidationErrors.length > 0 && (
                <div id="validation-banner" className="mb-6">
                  <ValidationBanner
                    fields={stepValidationErrors}
                    onDismiss={() => setStepValidationErrors([])}
                  />
                </div>
              )}

              {stepSchema && (
                <Form
                  form={stepSchema}
                  submission={{ data: formData }}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                />
              )}

              {/* Dynamic attachment dropzone fields */}
              {activeStepAttachFields.map(field => {
                const isMissingAttach =
                  field.reqd === 1 &&
                  stepValidationErrors.includes(field.display_name);

                return (
                  <div
                    key={field.reference_name}
                    className={`mt-6 p-6 border rounded-2xl transition-colors ${isMissingAttach
                      ? "border-rose-300 bg-rose-50/40"
                      : "border-dashed border-gray-200 bg-gray-50/50"
                      }`}
                  >
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2"
                      style={{ color: isMissingAttach ? "#ef4444" : "#6b7280" }}
                    >
                      {field.display_name}{" "}
                      {field.reqd === 1 && (
                        <span className="text-rose-500">*</span>
                      )}
                      {isMissingAttach && (
                        <span className="ml-2 text-rose-500 normal-case font-semibold">
                          — This field is required
                        </span>
                      )}
                    </label>
                    <div
                      className={`flex flex-col items-center gap-4 rounded-2xl border px-6 py-10 bg-white transition-all ${isMissingAttach
                        ? "border-rose-300 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]"
                        : "border-gray-200 hover:border-[var(--primary-color)]"
                        }`}
                    >
                      <Upload size={40} className={isMissingAttach ? "text-rose-400" : "text-gray-400"} />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-800">
                          Drag and drop or browse
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF, DOCX, or TXT (max 5MB)</p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error("File exceeds 5MB size limit.");
                              return;
                            }
                            const url = await uploadFile(file);
                            if (url) {
                              formDataRef.current = { ...formDataRef.current, [field.reference_name]: url };
                              setFormData(prev => ({ ...prev, [field.reference_name]: url }));
                              setStepValidationErrors(prev =>
                                prev.filter(n => n !== field.display_name)
                              );
                              toast.success(`${field.display_name} uploaded successfully!`);
                            } else {
                              toast.error("Upload failed.");
                            }
                          }
                        }}
                        className="hidden"
                        id={`file_input_${field.reference_name}`}
                      />
                      <label
                        htmlFor={`file_input_${field.reference_name}`}
                        className="py-2.5 px-6 bg-white border border-gray-200 rounded-xl text-xs font-bold tracking-wider uppercase shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        {formData[field.reference_name] ? "Change File" : "Browse Files"}
                      </label>
                      {formData[field.reference_name] && (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                          <CheckCircle size={14} /> Attachment Uploaded
                        </div>
                      )}
                      {uploading && (
                        <p
                          className="text-xs font-bold animate-pulse"
                          style={{ color: "var(--primary-color)" }}
                        >
                          Uploading attachment...
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Sticky Footer Navigation ── */}
            <div className="border-t border-gray-100 px-6 md:px-8 py-5 bg-gray-50/50 rounded-b-lg flex items-center justify-between gap-3">
              {/* Left: Previous */}
              <button
                disabled={activeStepIndex === 0}
                onClick={() => setActiveStepIndex(prev => Math.max(prev - 1, 0))}
                className="flex items-center gap-2 py-2.5 px-5 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                <ChevronLeft size={14} />
                Previous Step
              </button>

              {/* Center: Step indicator */}
              <span className="text-xs text-gray-400 font-semibold hidden sm:block">
                Step {activeStepIndex + 1} of {sections.length}
              </span>

              {/* Right: Next / Submit */}
              {isLastStep ? (
                <button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="flex items-center gap-2 py-2.5 px-6 rounded-xl text-sm font-bold text-white tracking-wide transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)"
                  }}
                >
                  {uploading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      SUBMITTING...
                    </>
                  ) : (
                    <>
                      SUBMIT REFERRAL
                      <CheckCircle size={14} />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNextStep}
                  className="flex items-center gap-2 py-2.5 px-6 rounded-xl text-sm font-bold text-white tracking-wide transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)"
                  }}
                >
                  NEXT STEP
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.4s ease; }

        /* ── Required field asterisk (red) ───────────────────────── */
        /* Form.io adds class="required" to the wrapper div when validate.required=true */
        .formio-component.required > label::after,
        .formio-component.required > .col-form-label::after,
        .formio-component.required label.col-form-label::after,
        .formio-component.required label.control-label::after,
        .formio-component.required .field-required::after,
        .formio-component.required label span.required::after {
          content: " *";
          color: #ef4444;
          font-weight: 700;
          font-size: 0.875rem;
        }

        /* ── Remove double asterisk if Form.io already added a <sup> or span.required ── */
        .formio-component.required label sup.text-danger,
        .formio-component.required label .text-muted.required {
          display: none;
        }

        /* ── DataGrid add-row button ───────────────────────────────── */
        .formio-component-datagrid .datagrid-add {
          margin-top: 0.75rem;
        }
        .formio-component-datagrid .datagrid-add .btn {
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color, var(--primary-color)) 100%);
          color: #fff;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.5rem 1.25rem;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .formio-component-datagrid .datagrid-add .btn:hover { opacity: 0.88; }
      `}</style>

      <div className="w-full mx-auto space-y-6">
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