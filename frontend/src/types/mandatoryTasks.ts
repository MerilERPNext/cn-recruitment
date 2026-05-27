export interface MandatoryTask {
  name: string;
  description: string;
  custom_subject: string | null;
  reference_type: string;
  reference_name: string;
  allocated_to: string;
  role: string | null;
  status: string;
  date: string;
  custom_mandatory_from_date: string;
  custom_funnel_task: string;
  custom_doctype_actions: string;
  creation: string;
}

export interface MandatoryTasksResponse {
  data: MandatoryTask[];
  employee: string;
}
