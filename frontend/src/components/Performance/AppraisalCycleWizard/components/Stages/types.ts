export type StageRow = {
  id: number;
  title: string;
  sla: string;
  dueDate: string;
  visibility: string;
  formTemplate: string;
  ratingScale: string;
  managerVisible: boolean;
};

export type StageOption = {
  label: string;
  value: string;
};
