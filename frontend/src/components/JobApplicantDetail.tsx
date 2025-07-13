"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Phone,
  MessageCircle,
  Mail,
  ChevronDown,
  FileText,
  Download,
  Building,
  GraduationCap,
  Plus,
  Edit,
  Share,
  X,
  Paperclip,
  AtSign,
  ChevronLeft,
  AlertCircle,
  RefreshCw, 
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom"; 
import {
  useJobApplicantDetails,
  useJobApplicantDropdownOptions, 
  isPermissionError,
} from "../hooks/useJobApplicant"; 
import type {
  JobApplicantBasicDetails,
  EmploymentEntry,
  EducationEntry,
  ApplicantNote,
  ApplicantTimelineEvent,
  CommunicationEvent,
} from "../types/jobApplicant"; 


const Header = ({ onBack }: { onBack: () => void }) => {
  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm">
      <div className="flex items-center p-4">
        <button onClick={onBack} className="text-slate-900 p-2 -ml-2">
          <ChevronLeft className="h-8 w-8" />
        </button>
        <h1 className="text-slate-900 text-xl font-bold text-center flex-1 pr-8">
          Applicant Details
        </h1>
      </div>
    </header>
  );
};

const ApplicantProfile = ({
  applicant,
}: {
  applicant: JobApplicantBasicDetails;
}) => {
  const [status, setStatus] = useState(applicant.status);
  const [subStatus, setSubStatus] = useState(applicant.sub_status); 

  // Fetch dropdown options dynamically
  const {
    data: optionsData,
    isLoading: isLoadingOptions,
    error: optionsError,
  } = useJobApplicantDropdownOptions();

  // Memoize options to prevent re-renders if the data object itself changes but content doesn't
  const statusOptions = useMemo(
    () => optionsData?.status_options || [],
    [optionsData],
  );
  const subStatusOptions = useMemo(
    () => optionsData?.sub_status_options || [],
    [optionsData],
  );

  // Handlers for contact buttons
  const handleCall = () =>
    console.log("Call clicked for", applicant.phone_number);
  const handleWhatsApp = () =>
    console.log("WhatsApp clicked for", applicant.phone_number);
  const handleEmail = () =>
    console.log("Email clicked for", applicant.email_id);

  // Determine avatar source: profile_image from API or initials fallback
  const avatarSrc = applicant.profile_image || undefined;
  const initials = applicant.applicant_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4 mb-4">
        {avatarSrc ? (
          <img
            alt="Applicant Avatar"
            className="w-16 h-16 rounded-full object-cover"
            src={avatarSrc}
          />
        ) : (
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-200 text-gray-600 font-bold text-lg uppercase">
            {initials}
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {applicant.applicant_name}
          </h2>
          <p className="text-sm text-slate-500">{applicant.designation}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="relative flex-1">
          {isLoadingOptions ? (
            <div className="w-full h-10 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center text-sm text-gray-500">
              Loading Statuses...
            </div>
          ) : optionsError ? (
            <div className="w-full h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-sm">
              Error loading statuses
            </div>
          ) : (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full appearance-none bg-gray-100 border border-gray-300 text-slate-900 text-sm font-semibold rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>

        <div className="relative flex-1">
          {isLoadingOptions ? (
            <div className="w-full h-10 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center text-sm text-gray-500">
              Loading Sub-statuses...
            </div>
          ) : optionsError ? (
            <div className="w-full h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-sm">
              Error loading sub-statuses
            </div>
          ) : (
            <select
              value={subStatus}
              onChange={(e) => setSubStatus(e.target.value)}
              className="w-full appearance-none bg-gray-100 border border-gray-300 text-slate-900 text-sm font-semibold rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              {subStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center gap-2">
        <button
          onClick={handleCall}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!applicant.phone_number || applicant.phone_number === "N/A"}
        >
          <Phone className="h-4 w-4" />
          Call
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-500 text-white rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!applicant.phone_number || applicant.phone_number === "N/A"}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </button>
        <button
          onClick={handleEmail}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-200 text-slate-900 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!applicant.email_id || applicant.email_id === "N/A"}
        >
          <Mail className="h-4 w-4" />
          Email
        </button>
      </div>
    </div>
  );
};

const TabContent = ({
  activeTab,
  applicant,
  employmentHistory,
  educationHistory,
  notes,
  applicantTimelineEvents, 
  communicationHistory, 
}: {
  activeTab: string;
  applicant: JobApplicantBasicDetails;
  employmentHistory: EmploymentEntry[];
  educationHistory: EducationEntry[];
  notes: ApplicantNote[];
  applicantTimelineEvents: ApplicantTimelineEvent[]; 
  communicationHistory: CommunicationEvent[]; 
}) => {
  const [noteText, setNoteText] = useState("");

  const handlePostNote = () => {
    if (noteText.trim()) {
      console.log("Note posted:", noteText);
      // TODO: Implement API call to save the note (e.g., using FrappeAPI.callMethod to create a new CRM Note)
      setNoteText("");
    }
  };


  // Helper to format date and time for timeline/notes
  const formatDateTime = useCallback((dateTimeString: string | null) => {
    if (!dateTimeString || dateTimeString === "N/A") return "N/A";
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return dateTimeString;
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateTimeString;
    }
  }, []);

  // Helper to get Lucide icon based on icon string
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "chat":
        return <MessageCircle className="h-5 w-5 text-green-500" />;
      case "call":
        return <Phone className="h-5 w-5 text-blue-600" />;
      case "mail":
        return <Mail className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };


  if (activeTab === "details") {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">Basic Information</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div>
              <p className="text-slate-500">Email</p>
              <p className="font-medium">{applicant.email_id || "N/A"}</p>
            </div>
            <div>
              <p className="text-slate-500">Phone</p>
              <p className="font-medium">{applicant.phone_number || "N/A"}</p>
            </div>
            <div>
              <p className="text-slate-500">Location</p>
              <p className="font-medium">{applicant.location || "N/A"}</p>
            </div>
            <div>
              <p className="text-slate-500">Experience</p>
              <p className="font-medium">{applicant.experience || "N/A"}</p>
            </div>
            <div>
              <p className="text-slate-500">Expected CTC</p>
              <p className="font-medium">{applicant.expected_ctc || "N/A"}</p>
            </div>
            <div>
              <p className="text-slate-500">Notice Period</p>
              <p className="font-medium">{applicant.notice_period || "N/A"}</p>
            </div>
          </div>
          {applicant.resume_attachment && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-slate-500 mb-2">
                Resume
              </h4>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-sm">
                      {applicant.resume_attachment.split("/").pop() || "Resume"}
                    </p>
                    {/* File size is not directly available from API, can be estimated or hardcoded */}
                    {/* <p className="text-xs text-slate-500">1.2 MB</p> */}
                  </div>
                </div>
                {/* Assuming resume_attachment is a direct URL to the file */}
                <a
                  href={applicant.resume_attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                >
                  <Download className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">Employment History</h3>
          <div className="space-y-4">
            {employmentHistory.length > 0 ? (
              employmentHistory.map((entry, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">
                      {entry.designation || "N/A"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {entry.company_name || "N/A"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {entry.start_date || "N/A"} - {entry.end_date || "N/A"}{" "}
                      {entry.duration && `• ${entry.duration}`}
                    </p>
                    {entry.address && (
                      <p className="text-xs text-slate-400">
                        Location: {entry.address}
                      </p>
                    )}{" "}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No employment history available.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">Education History</h3>
          <div className="space-y-4">
            {educationHistory.length > 0 ? (
              educationHistory.map((entry, index) => (
                <div key={index} className="flex items-start gap-3">
                  <GraduationCap className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">
                      {entry.university || "N/A"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {entry.degree || "N/A"}{" "}
                      {entry.field_of_study && `• ${entry.field_of_study}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {entry.start_year || "N/A"} - {entry.end_year || "N/A"}
                    </p>{" "}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No education history available.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">Next Steps</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50">
              <Plus className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Create Interview</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50">
              <Edit className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Update Status</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50">
              <Share className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Share Profile</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 text-red-600">
              <X className="h-5 w-5" />
              <span className="font-medium">Reject Applicant</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "timeline") {
    return (
      <div className="p-4 space-y-4">
        {/* Applicant Timeline Section */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">Applicant Timeline</h3>
          <div className="relative pl-6 space-y-6 border-l-2 border-gray-200">
            {applicantTimelineEvents.length > 0 ? (
              applicantTimelineEvents.map((event, index) => (
                <div key={event.id || index} className="relative">
                  <div
                    className={`absolute -left-[11px] top-1.5 w-5 h-5 ${
                      index === 0 ? "bg-blue-600" : "bg-gray-300"
                    } rounded-full border-4 border-white`}
                  ></div>
                  <div className="flex items-start gap-4 ml-4 mt-1">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {event.type}
                      </p>
                      <p className="text-sm text-slate-500">
                        {event.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(event.timestamp)}
                        {event.by_user && ` by ${event.by_user}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No applicant timeline events available.
              </p>
            )}
          </div>
        </div>

        {/* Communication History Section */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">Communication History</h3>
          <div className="space-y-4">
            {communicationHistory.length > 0 ? (
              communicationHistory.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  {getIcon(event.icon)} {/* Render icon dynamically */}
                  <div>
                    <p className="font-medium text-sm">{event.type}</p>
                    <p className="text-xs text-slate-500">
                      {event.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(event.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No communication history available.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "notes") {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">Internal Notes</h3>
          <div className="space-y-4">
            {notes.length > 0 ? (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-sm">
                      {note.author || "N/A"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(note.timestamp)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">
                    <span className="font-medium text-black">{note.type}:</span>{" "}
                    {note.content || "N/A"}
                  </p>{" "}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No notes available.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-2">Add a Note</h3>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full h-24 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none"
            placeholder="Add internal comments, interview summaries, etc."
          />
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-500 hover:bg-gray-100 rounded-full">
                <Paperclip className="h-5 w-5" />
              </button>
              <button className="p-2 text-slate-500 hover:bg-gray-100 rounded-full">
                <AtSign className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={handlePostNote}
              className="py-2 px-5 bg-blue-600 text-white rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!noteText.trim()} // Disable if note is empty
            >
              Post Note
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Main JobApplicantDetail Component
export default function JobApplicantDetail() {
  const navigate = useNavigate();
  const { applicantId } = useParams<{ applicantId: string }>(); // Get applicant ID from URL (e.g., "shiv@gamil.com")

  console.log(`🎯 JobApplicantDetail initialized with ID: ${applicantId}`);

  // Use the custom React Query hook to fetch data
  const {
    data: applicantResponse,
    isLoading,
    error,
    refetch,
  } = useJobApplicantDetails(
    { applicant_name: applicantId || "" },
    { enabled: !!applicantId }
  );

  console.log("Job Applicant Response:", applicantResponse);

  // Use useMemo to extract and memoize data for child components
  const applicant = useMemo(
    () => applicantResponse?.job_applicant || null,
    [applicantResponse]
  );
  const employmentHistory = useMemo(
    () => applicantResponse?.employment_history || [],
    [applicantResponse]
  );
  const educationHistory = useMemo(
    () => applicantResponse?.education_history || [],
    [applicantResponse]
  );
  const notes = useMemo(
    () => applicantResponse?.notes || [],
    [applicantResponse]
  );
  const applicantTimelineEvents = useMemo( // Updated to new field name
    () => applicantResponse?.applicant_timeline_events || [],
    [applicantResponse]
  );
  const communicationHistory = useMemo( // New memoized field
    () => applicantResponse?.communication_history || [],
    [applicantResponse]
  );


  // State for active tab
  const [activeTab, setActiveTab] = useState("timeline"); // Changed initial state to "timeline" for demonstration

  // Callback for back button
  const handleBack = useCallback(() => {
    console.log("Back button clicked");
    navigate(-1); // Go back to the previous page in history
  }, [navigate]);

  // Callback for retry button on error
  const handleRetry = useCallback(() => {
    refetch(); // Re-fetch the data
  }, [refetch]);

  // Conditional rendering for Loading state
  if (isLoading) {
    return (
      <main>
        <div className="min-h-screen bg-white flex flex-col">
          <Header onBack={handleBack} /> {/* Keep header for consistent UX */}
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center space-x-2 text-gray-500">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="text-lg">Loading applicant details...</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Conditional rendering for Error state
  if (error) {
    return (
      <main>
        <div className="min-h-screen bg-white flex flex-col">
          <Header onBack={handleBack} /> {/* Keep header for consistent UX */}
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
                      You don't have permission to view this applicant. Please
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
                        onClick={handleBack}
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
                      Error Loading Applicant
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

  // Conditional rendering for No Data state (e.g., applicantId provided but no data returned)
  if (!applicant || !applicant.name) {
    return (
      <main>
        <div className="min-h-screen bg-white flex flex-col">
          <Header onBack={handleBack} /> {/* Keep header for consistent UX */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Applicant Not Found
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                The requested applicant could not be found.
              </p>
              <button
                onClick={handleBack}
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

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    console.log("Tab changed to:", tab);
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col justify-between bg-slate-50">
      <main className="flex-grow">
        <Header onBack={handleBack} />
        {/* Pass the fetched applicant data to ApplicantProfile */}
        <ApplicantProfile applicant={applicant} />

        <div className="bg-white">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleTabChange("details")}
              className={`flex-1 py-3 px-2 text-sm font-medium text-center border-b-2 transition-colors duration-300 ${
                activeTab === "details"
                  ? "text-blue-600 border-blue-600"
                  : "text-slate-500 border-transparent hover:text-blue-600 hover:border-gray-300"
              }`}
            >
              Details
            </button>
            <button
              onClick={() => handleTabChange("timeline")}
              className={`flex-1 py-3 px-2 text-sm font-medium text-center border-b-2 transition-colors duration-300 ${
                activeTab === "timeline"
                  ? "text-blue-600 border-blue-600"
                  : "text-slate-500 border-transparent hover:text-blue-600 hover:border-gray-300"
              }`}
            >
              Timeline ({applicantTimelineEvents.length + communicationHistory.length}) {/* Display combined count */}
            </button>
            <button
              onClick={() => handleTabChange("notes")}
              className={`flex-1 py-3 px-2 text-sm font-medium text-center border-b-2 transition-colors duration-300 ${
                activeTab === "notes"
                  ? "text-blue-600 border-blue-600"
                  : "text-slate-500 border-transparent hover:text-blue-600 hover:border-gray-300"
              }`}
            >
              Notes ({notes.length}) {/* Display count */}
            </button>
          </div>
        </div>

        {/* Pass all relevant data to TabContent */}
        <TabContent
          activeTab={activeTab}
          applicant={applicant}
          employmentHistory={employmentHistory}
          educationHistory={educationHistory}
          notes={notes}
          applicantTimelineEvents={applicantTimelineEvents}
          communicationHistory={communicationHistory}
        />
      </main>
    </div>
  );
}