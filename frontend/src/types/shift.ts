import {ReactNode} from "react";

export interface ShiftRequest {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    modified_by: string;
    docstatus: number;
    idx: number;
    shift_type: string;
    employee: string;
    employee_name: string;
    department: string;
    status: string;
    company: string;
    approver: string;
    from_date: string;
    to_date: string | null;
    amended_from: string | null;
  }
  export interface ShiftType {
    status: string;
    shift_type: ReactNode;
    start_date: ReactNode;
    end_date: ReactNode;
    employee_name: ReactNode;
    company: ReactNode;
    to: ReactNode;
    from: ReactNode;
    title: ReactNode;
    name: string;
    start_time: string;
    end_time: string;
  }

  export interface ShiftTypeResponse {
    data: ShiftType[];
  }