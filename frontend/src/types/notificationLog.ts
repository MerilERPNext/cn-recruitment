export interface NotificationLog {
  email_content: string;
  name: string;
  subject: string;
  for_user: string;
  type: string;
  read: number;
  from_user: string;
  creation: string;
  url: string | null;
  link: string | null;
  document_type: string | null;
  document_name: string | null;
  todo: string | null;
}