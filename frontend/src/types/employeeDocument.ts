export interface DocumentItem {
    type: string;
    name: string;
    owner: string;
    creation: string;
    modified: string;
    modified_by: string;
    docstatus: number;
    idx: number;
    employee: string;
    employee_name: string;
    file_name: string;
    status: "Approved" | "Draft" | "Acknowledgement Required" | string;
    archived: number;
    document_template: string;
    enable_mandatory_acknowledgement: number;
    tag_form_for_acknowledgement: number;
    acknowledgement_form: string;
  }
  
  export interface DocumentItem {
    status: string;
    data: DocumentItem[];
  }
  