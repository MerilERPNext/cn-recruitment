export interface PIPCycle {
  sequence: number;
  status: "active" | "completed_success" | "completed_unsuccessful";
  reason: string;
  startDate: string;
  endDate: string;
  initiatedBy: string;
  completedAt?: string;
  completionNotes?: string;
}

export interface PIPEmployee {
  id: string;
  name: string;
  title: string;
  department?: string;
  email?: string;
  pips: PIPCycle[];
}

export const INITIAL_PIP_EMPLOYEES: PIPEmployee[] = [
  {
    id: "e1",
    name: "Alex Johnson",
    title: "Sales Associate",
    department: "Sales & Distribution",
    email: "alex.j@company.example",
    pips: [],
  },
  {
    id: "e2",
    name: "Priya Sharma",
    title: "Software Engineer",
    department: "Engineering",
    email: "priya.s@company.example",
    pips: [
      {
        sequence: 1,
        status: "active",
        reason: "Missed sprint commitments for two consecutive cycles",
        startDate: "2026-07-01",
        endDate: "2026-08-26",
        initiatedBy: "Dana Lee (Engineering Manager)",
      },
    ],
  },
  {
    id: "e3",
    name: "Michael Chen",
    title: "Account Manager",
    department: "Key Accounts",
    email: "michael.c@company.example",
    pips: [
      {
        sequence: 1,
        status: "completed_success",
        reason: "Client renewal rate below target",
        startDate: "2026-03-01",
        endDate: "2026-04-26",
        initiatedBy: "Rita Gomez (Director of Accounts)",
        completedAt: "2026-04-27",
        completionNotes: "Renewal rate recovered to 92%. All Q1 recovery goals met.",
      },
    ],
  },
  {
    id: "e4",
    name: "Sara Ali",
    title: "Customer Support Lead",
    department: "Customer Success",
    email: "sara.a@company.example",
    pips: [
      {
        sequence: 1,
        status: "completed_unsuccessful",
        reason: "Response-time SLA breaches",
        startDate: "2026-01-05",
        endDate: "2026-03-01",
        initiatedBy: "Omar Farouk (Support Head)",
        completedAt: "2026-03-02",
        completionNotes: "SLA breaches continued at a similar rate.",
      },
      {
        sequence: 2,
        status: "active",
        reason: "SLA breaches recurred after the first PIP",
        startDate: "2026-05-01",
        endDate: "2026-06-26",
        initiatedBy: "Omar Farouk (Support Head)",
      },
    ],
  },
  {
    id: "e5",
    name: "David Kim",
    title: "Operations Analyst",
    department: "Operations & Risk",
    email: "david.k@company.example",
    pips: [
      {
        sequence: 1,
        status: "completed_unsuccessful",
        reason: "Data accuracy errors",
        startDate: "2025-09-01",
        endDate: "2025-10-26",
        initiatedBy: "Lena Novak (Operations Manager)",
        completedAt: "2025-10-27",
        completionNotes: "Error rate unchanged across sample batches.",
      },
      {
        sequence: 2,
        status: "completed_unsuccessful",
        reason: "Errors repeated after PIP 1",
        startDate: "2025-11-15",
        endDate: "2026-01-09",
        initiatedBy: "Lena Novak (Operations Manager)",
        completedAt: "2026-01-10",
        completionNotes: "No improvement observed in audit check.",
      },
      {
        sequence: 3,
        status: "completed_unsuccessful",
        reason: "Final improvement cycle",
        startDate: "2026-02-01",
        endDate: "2026-03-28",
        initiatedBy: "Lena Novak (Operations Manager)",
        completedAt: "2026-03-29",
        completionNotes: "No improvement. Escalated to HR for separation.",
      },
    ],
  },
];
