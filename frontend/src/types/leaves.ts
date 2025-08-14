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
  type: string;
  entitled: number;
  availed: number;
  balance: number;
  carry_over: number;
}

export interface LeaveTransaction {
  type: string;
  total: number;
  monthly: number[];
}

export interface LeaveDetailsResponse {
  leave_balance: LeaveBalance[];
  leave_transactions: LeaveTransaction[];
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

export interface Holiday {
  name: string;
  date: string;
  type: string;
  holiday_name: string;
  description: string | null;
  repeat_next_year: number;
  creation: string;
  modified: string;
  owner: string;
  is_repeated: boolean;
  original_doc_name: string;
}

export interface HolidayGroup {
  type_name: string;
  holidays: Holiday[];
}

export interface HolidayApiResponse {
  message: {
    message: {
      status: string;
      data: HolidayGroup[];
    };
  };
}
