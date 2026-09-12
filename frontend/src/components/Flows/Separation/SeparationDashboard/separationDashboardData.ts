export interface SeparationDashboardData {
  employee: {
    name: string;
    initials: string;
    designation: string;
    department: string;
    company: string;
    daysRemaining: number;
    lastWorkingDay: string;
    resignationDate: string;
    noticePeriodMonths: number;
    statusDescription: string;
    currentStepIndex: number;
    steps: {
      label: string;
      description?: string;
      status: "completed" | "active" | "pending";
    }[];
  };
  clearances: {
    department: string;
    items: string;
    status: "Cleared" | "Pending" | "In Progress";
  }[];
  reportees: {
    name: string;
    designation: string;
    status: string;
  }[];
  recommendedManagerNotice: string;
  openItems: {
    count: number;
    label: string;
    sublabel: string;
    type: "tasks" | "attendance" | "expenses";
  }[];
  people: {
    name: string;
    role: string;
    description?: string;
    email?: string;
  }[];
  documents: {
    title: string;
    expectedDate: string;
    status: "available" | "upcoming" | "pending_fnf";
  }[];
  links: {
    label: string;
    action: string;
  }[];
}

export const STATIC_STEPS_FALLBACK = [
  { label: "Resignation Submitted", status: "pending" as const, description: "Approved by manager" },
  { label: "Notice Period", status: "pending" as const, description: "Serving 90 days" },
  { label: "Clearance & Handover", status: "pending" as const, description: "Starts 10 days before LWD" },
  { label: "FnF Settlement", status: "pending" as const, description: "Within 45 days post-exit" },
  { label: "Relieving & Exit", status: "pending" as const, description: "Letters issued" },
];

export const DUMMY_SEPARATION_DATA: SeparationDashboardData = {
  employee: {
    name: "Priya Sharma",
    initials: "PS",
    designation: "Senior Product Manager",
    department: "Product Management",
    company: "HomeFirst Finance Company India Limited",
    daysRemaining: 45,
    lastWorkingDay: "2026-10-16",
    resignationDate: "2026-07-16",
    noticePeriodMonths: 3,
    statusDescription: "Currently in the notice period, before clearance begins.",
    currentStepIndex: 1,
    steps: STATIC_STEPS_FALLBACK,
  },
  clearances: [
    {
      department: "IT Assets",
      items: "Laptop, docking station, monitor & peripherals",
      status: "Pending",
    },
    {
      department: "Finance & Accounts",
      items: "No outstanding corporate credit card dues or advances",
      status: "Cleared",
    },
    {
      department: "Admin and Facilities",
      items: "ID card, access card & biometric registry",
      status: "Pending",
    },
  ],
  reportees: [
    {
      name: "Ankit Verma",
      designation: "Product Analyst",
      status: "New manager pending",
    },
    {
      name: "Sneha Iyer",
      designation: "Associate PM",
      status: "New manager pending",
    },
  ],
  recommendedManagerNotice: "Recommended manager: Rohan Gupta, awaiting approval.",
  openItems: [
    {
      count: 14,
      label: "Open tasks",
      sublabel: "Across 3 systems",
      type: "tasks",
    },
    {
      count: 2,
      label: "Attendance flags",
      sublabel: "To review with HR",
      type: "attendance",
    },
    {
      count: 3,
      label: "Expenses due",
      sublabel: "Submit by 10 Oct",
      type: "expenses",
    },
  ],
  people: [
    {
      name: "Meera Nair",
      role: "HR Business Partner",
      description: "Separation Buddy & Exit Coordinator",
      email: "meera.nair@homefirstindia.com",
    },
    {
      name: "Rohan Gupta",
      role: "Reporting Manager",
      description: "Head of Product",
      email: "rohan.gupta@homefirstindia.com",
    },
    {
      name: "HR Offboarding Helpdesk",
      role: "Support Team",
      description: "For FnF, PF, gratuity and document queries after exit",
      email: "offboarding@homefirstindia.com",
    },
  ],
  documents: [
    {
      title: "Relieving Letter",
      expectedDate: "Expected 20 Oct 2026",
      status: "upcoming",
    },
    {
      title: "Experience Certificate",
      expectedDate: "Expected 20 Oct 2026",
      status: "upcoming",
    },
    {
      title: "Settlement Statement (FnF)",
      expectedDate: "After FnF is processed",
      status: "pending_fnf",
    },
  ],
  links: [
    {
      label: "View separation policy",
      action: "view_policy",
    },
    {
      label: "Download exit checklist",
      action: "download_checklist",
    },
  ],
};
