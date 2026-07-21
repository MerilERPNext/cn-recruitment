import { RoleAssignedUsersType } from "./flows";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FileType {
    label: string;
    value: string;
}

export interface Widget {
    type: string;
    displayInTimezone?: string;
    locale?: string;
    useLocaleSettings?: boolean;
    allowInput?: boolean;
    mode?: string;
    enableTime?: boolean;
    noCalendar?: boolean;
    format?: string;
    hourIncrement?: number;
    minuteIncrement?: number;
    time_24hr?: boolean;
    minDate?: null;
    disabledDates?: string;
    disableWeekends?: boolean;
    disableWeekdays?: boolean;
    disableFunction?: string;
    maxDate?: null;
}

export interface Validation {
    required: boolean;
    customMessage: string;
    custom: string;
    customPrivate: boolean;
    json: string;
    strictDateValidation?: boolean;
    multiple: boolean;
    unique: boolean;
    pattern?: string;
    minLength?: string;
    maxLength?: string;
}

export interface Conditional {
    show: null;
    when: null;
    eq: string;
    json: string;
}

export interface Overlay {
    style: string;
    page: string;
    left: string;
    top: string;
    width: string;
    height: string;
}

export interface FormComponent {
    label: string;
    labelPosition: string;
    type: string;
    key: string;
    id: string;
    input: boolean;
    disabled: boolean;
    hidden: boolean;
    placeholder?: string;
    description?: string;
    validate: Validation;
    conditional: Conditional;
    [key: string]: any;
}

export interface FormJson {
    components: FormComponent[];
}

export interface ApprovalStage {
    stage_name: null | string;
    user_id: null | string;
    user: null | string;
    role: null | string;
    status: string;
    form_json?: FormJson;
    approval_response_data: string;
    approval_time: string;
}

export interface ReferenceDocument {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    modified_by: string;
    docstatus: number;
    initiator_form: string;
    [key: string]: any;
}

export interface TodoType {
    allocated_roles: string[];
    allocated_to: string[];
    role_assigned_users: RoleAssignedUsersType[];
    todo_id: string;
    custom_approval_type: "Approval Matrix" | "Multi Actions";
    allocated_to_emp_id: string;
    role: null | string;
    username: string;
    reference_type: string;
    reference_name: string;
    custom_doctype_actions: string;
    custom_allow_revoke: number;
    status: string;
    due_date: string;
    description: string;
    custom_doctype_actions_with_form: string;
    is_allocated_todo: boolean;
    send_back_user: string | null;
    can_edit: boolean;
    todo_status: string;
    reference_document: ReferenceDocument;
    approval_stages_status: ApprovalStage[];
    attachments: any[];
}

export interface TodoCategory {
    name: string;
    count: number;
}


