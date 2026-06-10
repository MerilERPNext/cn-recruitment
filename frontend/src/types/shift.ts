import { ReactNode } from "react";
import { RoleAssignedUsersType } from "./flows";

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
  custom_status: string;
  custom_request_type: string;
  doctype?: string;
  shift_name?: string;
}

export interface ShiftRequestResponse {
  data: ShiftRequest;
}


export interface UpdateShiftRequestPayload {
  doctype: ShiftRequest['doctype'];
  name: ShiftRequest['name'];
  data: Partial<ShiftRequest>;
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
  custom_shift_name: string;
}

export interface ShiftTypeResponse {
  data: ShiftType[];
}

export type ShiftTypeTuple = [string, string, string, string, string, string];

export interface ShiftTypeTupleResponse {
  message: ShiftTypeTuple[];
}

export interface ShiftRequestFormData {
  shiftType: string;
  fromDate: string;
  toDate: string;
  reason?: string;
}

export interface ShiftRequestActionResponse {
  message: string;
}

export type FormioSubmission<T> = {
  data: T;
  metadata?: Record<string, unknown>;
  id?: string;
  form?: string;
  state?: string;
  deleted?: number;
  owner?: string;
  created?: string;
  modified?: string;
  [key: string]: unknown;
};
export interface MyShiftRequest {
  reference_document: ShiftRequest;
  reference_type: string;
  allocated_to: string[];
  role_assigned_users?: RoleAssignedUsersType[];
  allocated_roles?: string[];
  custom_allow_revoke: boolean;
  todo_id: string;
  username: string;
  reference_name: string;
  send_back_comment:string;
  can_edit: boolean;
  due_date: string;
}
export interface RequestCardProps {
  request: ShiftRequest;
  isActionedCard?: boolean;
  isSelected?: boolean;
  onAction?: () => void;
}

export type LoadingAction = {
  id: string;
  action: string;
};

export interface BulkActionProps {
  selectedIds: string[];
  pendingRequests: ShiftRequest[];
  onSelectAll: () => void;
  onBulkAction: (action: "Approve" | "Reject") => void;
  loadingAction?: {
    action: "Approve" | "Reject";
    isLoading: boolean;
  } | null;
}
