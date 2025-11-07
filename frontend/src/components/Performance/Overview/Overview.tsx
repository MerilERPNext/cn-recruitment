import { CheckCircle, Hourglass, PauseCircle, AlertCircle, AlertTriangle, MinusCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const Overview: React.FC = () => {

  const [isMobile, setIsMobile] = useState(false);
  const [selected, setSelected] = useState("ALL - 2");
  const filters = ["ALL - 2", "OVERDUE - 0", "DUE THIS WEEK - 1"];

  useEffect(() => {
    // Function to check screen width
    const checkScreenSize = () => setIsMobile(window.innerWidth < 900);
    checkScreenSize();

    // Add event listener
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);
// Dummy data for tasks
const openTasks = [
  {
    id: 1,
    title: "Add Goals Key Result Areas to New Goal Plan",
    assignee: "Yogesh Jain",
    id_code: "PW1100",
    time: "21 hours ago",
    role: "Employee",
  },
  {
    id: 2,
    title: "Review Q3 Performance Metrics",
    assignee: "Jane Doe",
    id_code: "PW1203",
    time: "2 days ago",
    role: "Manager",
  },
]

// Dummy data for goal statuses
const goalStatuses = [
  { icon: <CheckCircle className="w-6 h-6" />, count: 2, label: "Completed", color: "#86efac" }, // light green
  { icon: <Hourglass className="w-6 h-6" />, count: 1, label: "In Progress", color: "#93c5fd" }, // light blue
  { icon: <PauseCircle className="w-6 h-6" />, count: 0, label: "On Hold", color: "#c4b5fd" }, // light purple
  { icon: <AlertCircle className="w-6 h-6"/>, count: 0, label: "At Risk", color: "#fca5a5" }, // light red
  { icon: <AlertTriangle className="w-6 h-6" />, count: 1, label: "Delayed", color: "#fde68a" }, // light yellow
  { icon: <MinusCircle className="w-6 h-6" />, count: 3, label: "Not Started", color: "#d1d5db" }, // light gray
]

// Dummy data for notes
const notes = [
  {
    id: 1,
    content:
      "Meeting with the design team was productive. We've finalized the user flow for the new checkout process.",
    author: "Sarah Jenkins",
    time: "3 hours ago",
  },
  {
    id: 2,
    content:
      "Follow up with the marketing team on the Q4 campaign creatives. Need to get their feedback by EOD Friday.",
    author: "Alex Ray",
    time: "1 day ago",
  },
  {
    id: 3,
    content: "The staging server is experiencing some latency issues. Engineering team has been notified.",
    author: "Tech Team",
    time: "2 days ago",
  },
]


  return (
    <div className="min-h-full bg-gray-50 overflow-y-scroll pb-12">
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
      {/* Left Section - Open Tasks */}
      <div className="lg:col-span-2 space-y-6">
        {/* Open Tasks Header */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 w-full flex-wrap">
{/* 🔹 Left Side - Logo & Title */}
<div className="flex items-center gap-2">
  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
    <svg
      className="w-5 h-5 text-blue-600"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9 2a1 1 0 0 0-.894.553L7.382 4H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.382l-.724-1.447A1 1 0 0 0 11 2H9zM7 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0z" />
    </svg>
  </div>
  <h2 className="text-xl font-semibold text-gray-900">Open Tasks</h2>
</div>

{/* 🔹 Right Side - Filters */}
<div className="flex items-center gap-3 mt-3 md:mt-0">
  {/* 💻 Desktop Buttons (>=900px) */}
  {!isMobile && (
    <div className="flex items-center gap-3">
      {filters.map((label) => (
        <button
          key={label}
          onClick={() => setSelected(label)}
          className={`px-3 py-1 text-sm font-medium rounded-lg border ${
            selected === label
              ? "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {label}
        </button>
      ))}
      <button className="p-2 text-gray-400 hover:text-gray-600">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
      </button>
    </div>
  )}

  {/* 📱 Mobile Dropdown (<900px) */}
  {isMobile && (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {filters.map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>
      <button className="p-2 text-gray-400 hover:text-gray-600">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
      </button>
    </div>
  )}
</div>
</div>


          {/* Task Cards */}
          <div className="space-y-4">
            {openTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{task.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {task.assignee} ({task.id_code}) | {task.time} | {task.role}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-green-500 hover:bg-gray-100 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Goals Overview Section */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM2 10a8 8 0 1116 0 8 8 0 01-16 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Goals / Key Result Areas Overview</h2>
          </div>

          {/* Status Grid */}
          <div className="grid grid-cols-3 gap-4">
            {goalStatuses.map((status, index) => (
              <div
                key={index}
                className="flex flex-col items-center py-4 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl mb-3"
                  style={{ backgroundColor: status.color }}
                >
                  {status.icon}
                </div>
                <p className="text-2xl font-bold text-gray-900">{status.count}</p>
                <p className="text-sm text-gray-600 mt-1">{status.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="lg:col-span-2 space-y-6">
        {/* New Goal Plan */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM15.657 14.243a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM11 17a1 1 0 102 0v-1a1 1 0 10-2 0v1zM5.757 15.657a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM2 10a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zM5.757 4.343a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">New Goal Plan</h2>
          </div>

          {/* Circular Progress */}
          <div className="flex justify-center mb-6">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                {/* Background circle */}
                <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                {/* Progress circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="12"
                  strokeDasharray={`${(36 * 2 * Math.PI * 54) / 100} ${2 * Math.PI * 54}`}
                  strokeLinecap="round"
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold text-gray-900">36%</p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
            </div>
          </div>

          {/* Progress text */}
          <p className="text-center text-gray-600">
            You completed <strong>4 of 11 tasks</strong>. Keep up the good work!
          </p>
        </div>

        {/* Latest Notes */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Latest Notes</h2>
          </div>

          {/* Notes List */}
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="pb-4 border-b border-gray-200 last:border-b-0">
                <p className="text-gray-700 text-sm leading-relaxed">{note.content}</p>
                <p className="text-gray-500 text-xs mt-2">
                  {note.author} - {note.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Overview;