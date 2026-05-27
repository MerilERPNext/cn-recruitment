import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  ChevronRight,
  Clock,
  Phone,
  Mail,
  Award,
  Calendar,
  AlertCircle,
  X,
  RefreshCw,
  Video,
  FileText,
  Copy
} from "lucide-react";
import { useFrappeDocuments } from "../hooks/useFrappeQuery";
import { useInterviewAndRounds } from "../hooks/useInterview";

interface Interview {
  name: string;
  job_applicant: string;
  designation?: string;
  scheduled_on?: string;
  from_time: string;
  to_time: string;
  status: string;
  interview_round?: string;
}

// -------------------------------------------------------------
// Beautiful Vector SVG Illustrations for Empty States
// -------------------------------------------------------------

const RelaxingIllustration = () => (
  <svg
    viewBox="0 0 400 280"
    className="w-72 h-52 mx-auto"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Soft blob background */}
    <path
      d="M120 70C220 50 320 90 350 150C380 210 320 270 220 270C120 270 60 210 50 150C40 90 70 80 120 70Z"
      fill="#eff6ff"
    />

    {/* Office Desk */}
    <rect x="90" y="170" width="220" height="6" rx="3" fill="#475569" />
    <line x1="110" y1="176" x2="110" y2="235" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
    <line x1="290" y1="176" x2="290" y2="235" stroke="#475569" strokeWidth="4" strokeLinecap="round" />

    {/* Office Chair */}
    <path d="M180 195 L220 195 L228 220 L172 220 Z" fill="#0f172a" />
    <line x1="200" y1="220" x2="200" y2="250" stroke="#0f172a" strokeWidth="6" />
    <line x1="175" y1="250" x2="225" y2="250" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
    <circle cx="178" cy="253" r="3.5" fill="#475569" />
    <circle cx="222" cy="253" r="3.5" fill="#475569" />

    {/* Laptop */}
    <path d="M120 152 L152 152 L158 170 L114 170 Z" fill="#94a3b8" />
    <line x1="114" y1="170" x2="158" y2="170" stroke="#64748b" strokeWidth="2.5" />

    {/* Relaxing Person */}
    {/* Legs resting on the table */}
    <path d="M215 162 L132 148" stroke="var(--primary-color)" strokeWidth="12" strokeLinecap="round" />
    <path d="M215 168 L138 154" stroke="var(--secondary-color)" strokeWidth="10" strokeLinecap="round" />
    {/* Shoes */}
    <path d="M130 138 C118 138 114 148 124 154 L134 151 Z" fill="#0f172a" />

    {/* Body resting back */}
    <path d="M205 180 C235 180 250 155 260 135 C265 125 272 120 288 120" stroke="#fbcfe8" strokeWidth="14" strokeLinecap="round" fill="none" />
    <path d="M212 182 L262 138" stroke="var(--primary-color)" strokeWidth="18" strokeLinecap="round" />

    {/* Head & Hair */}
    <circle cx="276" cy="108" r="14" fill="#fed7aa" />
    <path d="M266 98 C266 92 282 90 286 98 C292 106 286 114 280 114 Z" fill="#7c2d12" />

    {/* Hand holding coffee */}
    <path d="M232 155 Q212 135 182 140" stroke="#fed7aa" strokeWidth="8" strokeLinecap="round" fill="none" />
    {/* Coffee Cup */}
    <rect x="172" y="132" width="13" height="15" rx="2" fill="#0284c7" />
    <path d="M185 136 C188 136 188 144 185 144" stroke="#0284c7" strokeWidth="2" fill="none" />
  </svg>
);

const SofaIllustration = () => (
  <svg
    viewBox="0 0 350 200"
    className="w-full h-full max-h-40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Soft blob background */}
    <path
      d="M30 40C110 20 240 10 290 60C340 110 300 170 220 180C140 190 50 160 30 110C10 60 30 40 30 40Z"
      fill="#eff6ff"
    />

    {/* Document / Card Floating */}
    <g filter="drop-shadow(0px 4px 12px rgba(37, 99, 235, 0.12))">
      <rect x="250" y="30" width="55" height="75" rx="6" fill="white" />
    </g>
    <rect x="260" y="42" width="20" height="4" rx="2" fill="#94a3b8" />
    <rect x="260" y="52" width="35" height="3" rx="1.5" fill="#cbd5e1" />
    <rect x="260" y="60" width="28" height="3" rx="1.5" fill="#cbd5e1" />
    {/* Blue Send Icon inside Card */}
    <rect x="272" y="72" width="22" height="22" rx="4" fill="var(--primary-color)" />
    <path d="M277 82.5 L288 78 L284 87.5 L281 83.5 Z" fill="white" />

    {/* Blue Modern Sofa */}
    {/* Base cushion */}
    <rect x="60" y="115" width="165" height="32" rx="8" fill="var(--secondary-color)" />
    {/* Armrest / Backrest */}
    <path d="M60 80 C60 72 72 68 80 72 L80 115 L60 115 Z" fill="var(--primary-color)" />
    <rect x="70" y="110" width="145" height="12" rx="4" fill="var(--primary-color)" />
    {/* Legs */}
    <rect x="76" y="147" width="6" height="10" fill="#475569" />
    <rect x="195" y="147" width="6" height="10" fill="#475569" />

    {/* Person Sitting typing */}
    <path d="M120 110 L160 110 L182 138 L198 136" stroke="var(--primary-color)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M112 105 C112 88 128 82 138 82 L156 102" stroke="var(--secondary-color)" strokeWidth="15" strokeLinecap="round" fill="none" />
    {/* Head */}
    <circle cx="122" cy="65" r="9" fill="#fdb374" />
    {/* Hair */}
    <path d="M114 63 C112 55 125 53 129 59 C132 65 128 69 124 69 Z" fill="#1e293b" />
    {/* Small Laptop on lap */}
    <path d="M148 95 L170 95 L178 84" stroke="#64748b" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const BinocularsIllustration = () => (
  <svg
    viewBox="0 0 350 200"
    className="w-60 h-40 mx-auto"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Ground support line */}
    <line x1="40" y1="160" x2="310" y2="160" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />

    {/* Small decorative plant */}
    <rect x="65" y="140" width="12" height="20" rx="2" fill="#d97706" />
    <path d="M71 140 C67 130 62 125 67 115 C72 125 72 130 71 140Z" fill="#10b981" />
    <path d="M71 140 C75 130 80 125 75 115 C70 125 70 130 71 140Z" fill="#059669" />

    {/* Searching Person with Binoculars */}
    {/* Torso */}
    <path d="M135 160 C135 125 165 120 185 120 C205 120 235 125 235 160" fill="var(--secondary-color)" />
    {/* Head */}
    <circle cx="185" cy="95" r="15" fill="#fed7aa" />
    {/* Cap / Hair */}
    <path d="M170 95 C170 85 190 82 196 90 C202 98 196 107 190 107 Z" fill="#1e293b" />
    {/* Binoculars */}
    <rect x="195" y="87" width="20" height="9" rx="2" fill="#475569" />
    <circle cx="215" cy="87" r="5" fill="#0f172a" />
    <circle cx="215" cy="96" r="5" fill="#0f172a" />
    {/* Arms holding it up */}
    <path d="M178 120 Q198 110 203 98" stroke="#fed7aa" strokeWidth="7" strokeLinecap="round" fill="none" />
  </svg>
);

// -------------------------------------------------------------
// Component Implementation
// -------------------------------------------------------------

const InterviewPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">("upcoming");
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);

  // Fetch interviews from Frappe Backend
  const { data: interviewData } = useFrappeDocuments(
    {
      doctype: "Interview",
      fields: [
        "name",
        "job_applicant",
        "designation",
        "scheduled_on",
        "from_time",
        "to_time",
        "interview_round",
        "status"
      ],
      pageSize: 100,
      orderBy: "scheduled_on desc, from_time desc",
      searchFields: ["job_applicant", "status"],
    }
  );

  // Helper to generate dynamic 7 days starting from today (2026-05-27 simulation matching the local time)
  const getUpcomingDays = () => {
    const days = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
      "Jan",
      "Feb",
      "Mar",
      "Apr"
    ];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      // Set to May 27, 2026 (simulation of current local time)
      d.setFullYear(2026, 4, 27);
      d.setDate(d.getDate() + i);

      days.push({
        dateStr: `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`,
        dayName: weekdays[d.getDay()],
        formattedISO: d.toISOString().split("T")[0]
      });
    }
    return days;
  };

  const days = getUpcomingDays();

  const handleGoToInterview = (interviewId: string) => {
    navigate(`/webapp/recruitment-app/interviews/${interviewId}`);
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedHours = h % 12 || 12;
    return `${String(formattedHours).padStart(2, "0")}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric"
    });
  };

  // Filter logic for upcoming interviews matching the selected date card
  const selectedDateISO = days[selectedDateIndex].formattedISO;
  const rawList = (interviewData?.data || []) as unknown as Interview[];

  const upcomingInterviewsForDay = rawList.filter((item) => {
    const itemDate = item.scheduled_on;
    return (
      itemDate === selectedDateISO &&
      item.status !== "Completed" &&
      item.status !== "Rejected" &&
      item.status !== "Cleared"
    );
  });

  // Filter history interviews by search query
  const historyInterviews = rawList.filter((item) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.job_applicant?.toLowerCase().includes(term) ||
      item.designation?.toLowerCase().includes(term) ||
      item.status?.toLowerCase().includes(term) ||
      item.interview_round?.toLowerCase().includes(term);
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* Dynamic Header Banner using CSS theme variables */}
      {/* ------------------------------------------------------------- */}
      <div
        className="relative pt-8 pb-14 px-6 md:px-12 text-white overflow-hidden"
        style={{
          background: `linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)`
        }}
      >
        {/* Abstract wavy lines background to match the screenshots */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M-100 80 Q100 180 300 80 T700 80 T1100 80 T1500 80"
              fill="none"
              stroke="white"
              strokeWidth="6"
            />
            <path
              d="M-100 120 Q100 220 300 120 T700 120 T1100 120 T1500 120"
              fill="none"
              stroke="white"
              strokeWidth="4"
            />
            <path
              d="M-100 40 Q100 140 300 40 T700 40 T1100 40 T1500 40"
              fill="none"
              stroke="white"
              strokeWidth="3"
            />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            My Interviews
          </h1>

          {/* Banner Tabs */}
          <div className="flex gap-8 mt-6 border-b border-white/20">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`relative pb-3 text-sm font-semibold tracking-wide transition-all ${activeTab === "upcoming" ? "text-white" : "text-white/70 hover:text-white"
                }`}
            >
              Upcoming Interviews
              {activeTab === "upcoming" && (
                <span className="absolute bottom-0 left-0 right-0 h-[3.5px] bg-white rounded-lg"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`relative pb-3 text-sm font-semibold tracking-wide transition-all ${activeTab === "history" ? "text-white" : "text-white/70 hover:text-white"
                }`}
            >
              History
              {activeTab === "history" && (
                <span className="absolute bottom-0 left-0 right-0 h-[3.5px] bg-white rounded-lg"></span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Main Content Area */}
      {/* ------------------------------------------------------------- */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-8 relative z-20">
        {activeTab === "upcoming" ? (
          /* ========================================== */
          /* UPCOMING INTERVIEWS TAB                     */
          /* ========================================== */
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Left Column (70% - 7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-[500px]">
              {/* Date picker Carousel */}
              <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
                <div className="flex gap-2 flex-grow">
                  {days.map((day, idx) => {
                    const isActive = selectedDateIndex === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDateIndex(idx)}
                        className={`flex flex-col justify-between items-center rounded-xl p-3 min-w-[92px] h-[115px] border cursor-pointer transition-all duration-200 ${isActive
                          ? "text-white border-transparent shadow-md scale-102"
                          : "bg-white text-gray-800 border-gray-200/80 hover:border-gray-300"
                          }`}
                        style={
                          isActive
                            ? {
                              backgroundColor: "var(--primary-color)",
                              boxShadow: "0 4px 12px rgba(90, 75, 218, 0.15)"
                            }
                            : {}
                        }
                      >
                        <span
                          className={`text-sm font-bold tracking-tight ${isActive ? "text-white" : "text-gray-900"
                            }`}
                        >
                          {day.dateStr}
                        </span>
                        <span
                          className={`text-[11px] uppercase tracking-wider font-semibold ${isActive ? "text-white/90" : "text-gray-400"
                            }`}
                        >
                          {day.dayName}
                        </span>
                        {/* 6 small circular dots pattern */}
                        <div className="flex gap-[3.5px] mt-1 justify-center">
                          {Array.from({ length: 6 }).map((_, dIdx) => (
                            <span
                              key={dIdx}
                              className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white/40" : "bg-[var(--primary-color)]/10"
                                }`}
                            ></span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Carousel arrow scroll indicator */}
                <button className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors shadow-sm shrink-0">
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Dynamic Interview List or Empty State */}
              <div className="flex-grow flex flex-col justify-center items-center py-8">
                {upcomingInterviewsForDay.length > 0 ? (
                  <div className="w-full space-y-4">
                    {upcomingInterviewsForDay.map((interview) => (
                      <div
                        key={interview.name}
                        onClick={() => handleGoToInterview(interview.name)}
                        className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white hover:bg-gray-50/50 rounded-xl border border-gray-200/80 transition-all cursor-pointer shadow-sm group"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: "var(--primary-color)15",
                              color: "var(--primary-color)"
                            }}
                          >
                            <Clock size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-gray-900 text-base">
                                {interview.job_applicant}
                              </h4>
                              <span
                                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg ${interview.status === "Cleared"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : interview.status === "Rejected"
                                    ? "bg-rose-50 text-rose-700 border border-rose-100"
                                    : "bg-amber-50 text-amber-700 border border-amber-100"
                                  }`}
                              >
                                {interview.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 font-medium mt-1">
                              {interview.designation || "Job Candidate"}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                              <span className="flex items-center gap-1">
                                <Calendar size={13} />
                                {formatDate(interview.scheduled_on)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={13} />
                                {formatTime(interview.from_time)} - {formatTime(interview.to_time)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end mt-4 md:mt-0">
                          <ChevronRight
                            size={18}
                            className="text-gray-400 group-hover:text-gray-600 transition-colors"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center max-w-md mx-auto">
                    <RelaxingIllustration />
                    <h3 className="text-lg font-bold text-gray-900 mt-6 tracking-tight">
                      Take a break! No interviews scheduled for you.
                    </h3>
                    <p className="text-sm text-gray-500 font-medium mt-2 leading-relaxed whitespace-pre-line">
                      You don't have any upcoming interviews.
                      {"\n"}You can check past Interview feedback from below 'Interview History' link.
                    </p>
                    <button
                      onClick={() => setActiveTab("history")}
                      className="text-xs md:text-sm font-bold tracking-wider transition-all mt-6 inline-block uppercase hover:opacity-80"
                      style={{ color: "var(--primary-color)" }}
                    >
                      INTERVIEW HISTORY
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (30% - 3 cols) */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              {/* Onboarding illustration card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col justify-center items-center min-h-[220px]">
                <SofaIllustration />
              </div>

              {/* Pending Feedback card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800 text-base">
                    Pending Feedback (0)
                  </h3>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Filter size={16} />
                  </button>
                </div>
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-3">
                    <AlertCircle size={22} />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">
                    No pending feedback to submit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================== */
          /* HISTORY TAB                                */
          /* ========================================== */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[500px] flex flex-col">
            {/* Search & Filter row */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="relative flex-grow max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    "--tw-ring-color": "var(--primary-color)20"
                  } as React.CSSProperties}
                />
              </div>

              {/* Filter button */}
              <button className="flex items-center justify-center p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors shadow-sm shrink-0">
                <Filter size={18} />
              </button>
            </div>

            {/* Table or Empty State */}
            <div className="flex-grow overflow-x-auto">
              {historyInterviews.length > 0 ? (
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Candidate Name
                      </th>
                      <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Job Title
                      </th>
                      <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Contact Details
                      </th>
                      <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-gray-700">
                        Interview Date & Time
                        <span className="text-[10px]">↓</span>
                      </th>
                      <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Interview Stage
                      </th>
                      <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                        Feedback
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyInterviews.map((item) => (
                      <tr
                        key={item.name}
                        onClick={() => handleGoToInterview(item.name)}
                        className="hover:bg-gray-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-sm uppercase">
                              {item.job_applicant.charAt(0)}
                            </div>
                            <span className="font-semibold text-gray-900 text-sm">
                              {item.job_applicant}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600 font-medium">
                          {item.designation || "—"}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5 text-xs text-gray-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Phone size={12} />
                              +91 XXXXX XXXXX
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail size={12} />
                              candidate@company.com
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5 text-sm text-gray-800">
                            <span className="font-semibold text-gray-900 text-sm">
                              {formatDate(item.scheduled_on)}
                            </span>
                            <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                              <Clock size={12} />
                              {formatTime(item.from_time)} - {formatTime(item.to_time)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                            <Award size={13} />
                            {item.interview_round || "Round 1"}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-lg ${item.status === "Cleared"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : item.status === "Rejected"
                                ? "bg-rose-50 text-rose-700 border border-rose-100"
                                : "bg-blue-50 text-blue-700 border border-blue-100"
                              }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            className="text-xs font-bold uppercase tracking-wide group-hover:underline"
                            style={{ color: "var(--primary-color)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInterviewId(item.name);
                            }}
                          >
                            View Feedback
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-16 flex flex-col justify-center items-center">
                  <BinocularsIllustration />
                  <h4 className="text-sm text-gray-500 font-semibold mt-4">
                    There are no records to display
                  </h4>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Interview Detail Modal */}
      {selectedInterviewId && (
        <InterviewDetailModal
          interviewId={selectedInterviewId}
          onClose={() => setSelectedInterviewId(null)}
          onGoToFeedback={(id) => navigate(`/webapp/recruitment-app/interviews/interview-feedback/${id}`)}
        />
      )}
    </div>
  );
};

// -----------------------------------------------------------------------
// Interview Detail Modal
// -----------------------------------------------------------------------
interface InterviewDetailModalProps {
  interviewId: string;
  onClose: () => void;
  onGoToFeedback: (id: string) => void;
}

const InterviewDetailModal: React.FC<InterviewDetailModalProps> = ({
  interviewId,
  onClose,
  onGoToFeedback,
}) => {
  const { data, isLoading, error, refetch } = useInterviewAndRounds(
    { interview_id: interviewId },
    { enabled: !!interviewId },
  );

  const interview = data?.interview;
  const rounds = data?.rounds || [];

  const getVal = (v?: string) => v || "NA";

  const getDuration = (from?: string, to?: string) => {
    if (!from || !to) return "NA";
    const [fh, fm] = from.split(":").map(Number);
    const [th, tm] = to.split(":").map(Number);
    const diff = (th * 60 + tm) - (fh * 60 + fm);
    const h = Math.floor(Math.abs(diff) / 60);
    const m = Math.abs(diff) % 60;
    return `${h}h ${m}m`;
  };

  const formatTime = (t?: string) => {
    if (!t) return "NA";
    const [hours, minutes] = t.split(":");
    const h = parseInt(hours);
    return `${String(h % 12 || 12).padStart(2, "0")}:${minutes} ${h >= 12 ? "PM" : "AM"}`;
  };

  const modal = (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] z-10 animate-slideUp">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-gray-100 rounded-t-2xl"
          style={{ background: `linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)` }}
        >
          <h2 className="text-base font-bold text-white tracking-tight">Interview Details</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw size={28} className="animate-spin" style={{ color: "var(--primary-color)" }} />
              <p className="text-sm text-gray-500 font-medium">Loading details…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
              <AlertCircle size={32} className="text-rose-500" />
              <p className="text-sm font-semibold text-gray-700">Failed to load interview details.</p>
              <button
                onClick={() => refetch()}
                className="text-xs font-bold uppercase tracking-wider mt-1"
                style={{ color: "var(--primary-color)" }}
              >
                Retry
              </button>
            </div>
          ) : !interview ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
              <p className="text-sm font-semibold text-gray-600">Interview not found.</p>
            </div>
          ) : (
            <div>
              {/* Candidate */}
              <section className="px-5 pt-5 pb-4 border-b border-gray-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Candidate</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-bold uppercase"
                    style={{ background: `var(--primary-color)` }}
                  >
                    {getVal(interview?.job_applicant).charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{getVal(interview?.job_applicant)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{getVal(interview?.designation)}</p>
                  </div>
                </div>
              </section>

              {/* Schedule */}
              <section className="px-5 pt-4 pb-4 border-b border-gray-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Schedule</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{getVal(interview?.scheduled_on)}</p>
                      <p className="text-[11px] text-gray-400">
                        {formatTime(interview?.from_time)} – {formatTime(interview?.to_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Duration</p>
                      <p className="text-[11px] text-gray-400">{getDuration(interview?.from_time, interview?.to_time)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                      <Video size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Type</p>
                      <p className="text-[11px] text-gray-400">{getVal(interview?.custom_interview_type) || "Video Call"}</p>
                    </div>
                  </div>
                  {interview?.custom_zoom_link && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                        <Copy size={16} />
                      </div>
                      <a
                        href={interview.custom_zoom_link as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium truncate max-w-[260px] underline"
                        style={{ color: "var(--secondary-color)" }}
                      >
                        {interview.custom_zoom_link as string}
                      </a>
                    </div>
                  )}
                </div>
              </section>

              {/* Interview Round */}
              <section className="px-5 pt-4 pb-4 border-b border-gray-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Interview Round</p>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: "var(--primary-color)15", color: "var(--primary-color)" }}
                >
                  <Award size={13} />
                  {getVal(interview?.interview_round)}
                </span>
              </section>

              {/* Interviewers */}
              {(interview?.interview_details as unknown[])?.length > 0 && (
                <section className="px-5 pt-4 pb-4 border-b border-gray-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Interviewers</p>
                  <div className="space-y-2">
                    {(interview.interview_details as { custom_full_name: string }[]).map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold uppercase">
                          {d.custom_full_name?.charAt(0) || "?"}
                        </div>
                        <p className="text-sm font-medium text-gray-800">{d.custom_full_name || "NA"}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Resume */}
              {interview?.custom_resume_attachment && (
                <section className="px-5 pt-4 pb-4 border-b border-gray-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Resume</p>
                  <button
                    onClick={() =>
                      window.open(window.location.origin + (interview.custom_resume_attachment as string), "_blank")
                    }
                    className="flex items-center gap-2 text-xs font-medium"
                    style={{ color: "var(--primary-color)" }}
                  >
                    <FileText size={15} /> Open Resume
                  </button>
                </section>
              )}

              {/* Rounds */}
              {rounds.length > 0 && (
                <section className="px-5 pt-4 pb-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Rounds</p>
                  <div className="space-y-2">
                    {rounds.map((r, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">{r.round_name || "—"}</p>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${r.status === "Cleared"
                            ? "bg-emerald-50 text-emerald-700"
                            : r.status === "Rejected"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                            }`}
                        >
                          {r.status || "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {!isLoading && !error && interview && (
          <div className="px-5 py-4 border-t border-gray-100 bg-white rounded-b-2xl">
            <button
              onClick={() => onGoToFeedback(interviewId)}
              className="w-full py-3 rounded-xl text-sm font-bold text-white tracking-wide transition-opacity hover:opacity-90 active:opacity-80"
              style={{ background: `linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)` }}
            >
              Go to Feedback
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default InterviewPage;