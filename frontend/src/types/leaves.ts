export interface LeaveRequest {
  name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: "Approved" | "Open" | "Rejected" | "Cancelled" | "Pending";
  employee_name: string;
  description?: string;
  department?: string;
}

export interface TeamLeaveRequest {
  id: string;
  name: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: "Pending" | "Approved" | "Rejected" | "Open" | "Cancelled";
  description?: string;
  department?: string;
  employeeName?: string;
  employeePhoto?: string;
  leaveType?: string;
  dateRange?: string;
  reason?: string;
}

export interface LeaveBalance {
  leave_type: string;
  total_leaves: number;
  leaves_taken: number;
  remaining_leaves: number;
  allocated_leaves?: number;
  expires_on?: string;
  carry_forwarded_leaves?: number;
}

type LeaveStatus = "Open" | "Approved" | "Rejected" | "Cancelled";

export interface LeaveApplicationItem {
  name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: LeaveStatus;
  description?: string;
}

export interface LeaveApplication {
  name: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: "Open" | "Approved" | "Rejected" | "Cancelled" | string;
  description?: string;
}
