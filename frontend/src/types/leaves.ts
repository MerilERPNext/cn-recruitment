export interface LeaveRequest {
  name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  status: "Approved" | "Open" | "Rejected" | "Cancelled";
  employee_name: string;
  description?: string;
}

export interface TeamLeaveRequest {
  id: string;
  employeeName: string;
  employeePhoto: string;
  leaveType: string;
  dateRange: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
}
