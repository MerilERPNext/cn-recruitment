import FrappeAPI from "../utils/frappeAPI";
import type {
  JobApplicantDetailsResponse,
  GetJobApplicantParams,
  JobApplicantFieldOptionsResponse,
  JobApplicantBasicDetails,
  EmploymentEntry,
  EducationEntry,
  ApplicantNote,
  ApplicantTimelineEvent, // Keep if mock data stays in client
  CommunicationEvent,     // Keep if mock data stays in client
} from "../types/jobApplicant";

export const jobApplicantService = {
  /**
   * Fetches comprehensive details for a specific Job Applicant using Frappe's resource API.
   * @param {GetJobApplicantParams} { applicant_name } - The name (ID) of the job applicant.
   * @returns {Promise<JobApplicantDetailsResponse>} A promise that resolves to the applicant's details.
   */
  getJobApplicantDetails: async ({
    applicant_name,
  }: GetJobApplicantParams): Promise<JobApplicantDetailsResponse> => {
    try {
      console.log(`🎯 Fetching job applicant details for: ${applicant_name}`);

      // Use FrappeAPI.getDocument to fetch the Job Applicant DocType
      const applicantDoc = (await FrappeAPI.getDocument(
        "Job Applicant",
        applicant_name
      )) as any; // Using 'any' for now, will map to proper types

      // Map the raw Frappe document data to your desired JobApplicantDetailsResponse structure
      // This mapping is crucial because Frappe's resource API returns fields as they are named in the DocType
      // while your current types expect specific transformed names (e.g., custom_applicant_last_name_ combined).
      // Also, child table data will be directly nested arrays.

      const job_applicant_data: JobApplicantBasicDetails = {
        name: applicantDoc.name,
        applicant_name: `${applicantDoc.applicant_name || ''} ${applicantDoc.custom_applicant_last_name_ || ''}`.trim(),
        email_id: applicantDoc.email_id || "N/A",
        phone_number: applicantDoc.phone_number || "N/A",
        job_title: applicantDoc.job_title || "N/A",
        designation: applicantDoc.designation || "N/A",
        status: applicantDoc.status || "N/A",
        sub_status: applicantDoc.custom_substatus || "N/A",
        location: `${applicantDoc.custom_location || ''}${applicantDoc.custom_location && applicantDoc.country ? ', ' : ''}${applicantDoc.country || ''}`.trim(),
        experience: applicantDoc.custom_total_experience || "N/A",
        expected_ctc: `${applicantDoc.currency || ''} ${applicantDoc.custom_expected_ctc || applicantDoc.lower_range || 0} / Annum`.trim(),
        notice_period: applicantDoc.custom_bond_if_any || "N/A",
        profile_image: applicantDoc.profile_image || null,
        resume_attachment: applicantDoc.resume_attachment || null,
        creation: applicantDoc.creation,
        custom_recruiter_name: applicantDoc.custom_recruiter_name || "N/A",
        custom_current_designation: applicantDoc.custom_current_designation || "N/A",
        custom_current_company_name: applicantDoc.custom_current_company_name || "N/A",
        custom_linkedin_url: applicantDoc.custom_linkedin_url || "N/A",
        custom_permanent_address: applicantDoc.custom_permanent_address || "N/A",
        custom_current_address: applicantDoc.custom_current_address || "N/A",
        custom_expected_doj: applicantDoc.custom_expected_doj || null,
        source: applicantDoc.source || "N/A",
        applicant_rating: applicantDoc.applicant_rating || 0,
        custom_home_town: applicantDoc.custom_home_town || "N/A",
        custom_recruiter_remark: applicantDoc.custom_recruiter_remark || "N/A",
      };

      // Employment History
      const employment_history: EmploymentEntry[] = (applicantDoc.custom_previous_work_experience || []).map((entry: any) => {
        // Frappe doesn't calculate duration automatically via resource API,
        // so you'll need to replicate the duration calculation logic on the client side
        // or have a separate custom method just for utility calculations if allowed.
        // For now, let's assume raw dates and leave duration as a client-side concern or 'N/A'
        const startDate = entry.custom_from_datee;
        const endDate = entry.custom_to_datee;
        let duration = "";
        // You would typically calculate duration here if not coming from backend,
        // but for a pure resource API approach, it might be simplified or calculated in UI.
        // For demonstration, leaving it basic.
        return {
          company_name: entry.company_name || "N/A",
          designation: entry.designation || "N/A",
          start_date: startDate || "N/A",
          end_date: endDate || "Present",
          duration: duration, // Will be empty unless calculated here or in UI
          address: entry.address || "N/A",
          salary: entry.salary || 0,
        };
      });

      // Education History
      const education_history: EducationEntry[] = (applicantDoc.custom_educational_qualification || []).map((entry: any) => ({
        university: entry.school_univ || "N/A",
        degree: entry.qualification || "N/A",
        field_of_study: entry.custom_educational_details || "N/A",
        level: entry.level || "N/A",
        start_year: entry.custom_passing_year || (entry.year_of_passing !== 0 ? String(entry.year_of_passing) : "N/A"),
        end_year: entry.custom_passing_year || (entry.year_of_passing !== 0 ? String(entry.year_of_passing) : "N/A"),
      }));

      // Notes
      const notes: ApplicantNote[] = (applicantDoc.custom_crm_note || []).map((note_entry: any) => ({
        id: note_entry.name,
        timestamp: note_entry.added_on,
        author: note_entry.added_by,
        content: note_entry.note,
        type: note_entry.custom_comment_type,
      }));

      // Applicant Timeline and Communication History will NOT come from resource API directly
      // if they are not stored in Frappe DocTypes.
      // If they are static mock data, they should be defined in the frontend component.
      // If they are to be actual data, you would need to define DocTypes for them in Frappe
      // and fetch them separately using FrappeAPI.getDocumentList or include them as child tables.
      // For now, assuming they are client-side mock data as per your job_applicant.py's current structure.
      const applicant_timeline_events: ApplicantTimelineEvent[] = [
        {
            "id": "app_submitted",
            "type": "Application Submitted",
            "timestamp": "2025-07-10T11:00:00Z",
            "description": "Applied for Senior Frontend Developer role.",
            "by_user": "Applicant"
        },
        {
            "id": "status_changed_screening",
            "type": "Status Changed",
            "timestamp": "2025-07-11T16:15:00Z",
            "description": "Status changed: Sourced → Screening. Sub-status changed to HR Round.",
            "by_user": "Sarah Wilson"
        },
        {
            "id": "interview_scheduled_tech",
            "type": "Interview Scheduled",
            "timestamp": "2025-07-12T10:30:00Z",
            "description": "Technical Round with John Smith.",
            "by_user": "Recruiter"
        }
      ];

      const communication_history: CommunicationEvent[] = [
        {
            "id": "whatsapp_confirm",
            "type": "WhatsApp Message",
            "timestamp": "2025-07-12T10:35:00Z",
            "description": "Confirming interview schedule.",
            "icon": "chat"
        },
        {
            "id": "outgoing_call_expectations",
            "type": "Outgoing Call",
            "timestamp": "2025-07-11T16:00:00Z",
            "description": "Duration: 5m 32s. Spoke about role expectations.",
            "icon": "call"
        },
        {
            "id": "email_screening_invite",
            "type": "Email Sent",
            "timestamp": "2025-07-10T14:00:00Z",
            "description": "Invitation for initial screening call.",
            "icon": "mail"
        }
      ];


      const result: JobApplicantDetailsResponse = {
        job_applicant: job_applicant_data,
        employment_history: employment_history,
        education_history: education_history,
        notes: notes,
        applicant_timeline_events: applicant_timeline_events,
        communication_history: communication_history,
      };

      console.log(`✅ Job Applicant details fetched successfully:`, result);

      return result;
    } catch (error) {
      console.error(
        `❌ Failed to fetch job applicant details for ${applicant_name}:`,
        error
      );
      throw error;
    }
  },

  /**
   * Fetches dropdown options for Job Applicant status and sub-status fields using Frappe's DocType metadata API.
   * @returns {Promise<JobApplicantFieldOptionsResponse>} A promise that resolves to the available options.
   */
  getJobApplicantDropdownOptions:
    async (): Promise<JobApplicantFieldOptionsResponse> => {
      try {
        console.log(`🎯 Fetching job applicant dropdown options.`);

        // Use FrappeAPI.getDocMeta to get the DocType's metadata
        const meta = (await FrappeAPI.getDocMeta("Job Applicant")) as any;

        let status_options: string[] = [];
        let sub_status_options: string[] = [];

        // Find the 'status' field and extract its options
        const statusField = meta.fields.find((f: any) => f.fieldname === "status");
        if (statusField && statusField.options) {
          status_options = statusField.options.split('\n').map((s: string) => s.trim()).filter((s: string) => s);
        }

        // Find the 'custom_substatus' field and extract its options
        const subStatusField = meta.fields.find((f: any) => f.fieldname === "custom_substatus");
        if (subStatusField && subStatusField.options) {
          sub_status_options = subStatusField.options.split('\n').map((s: string) => s.trim()).filter((s: string) => s);
        }

        const result: JobApplicantFieldOptionsResponse = {
          status_options: status_options,
          sub_status_options: sub_status_options,
        };

        console.log(`✅ Dropdown options fetched successfully:`, result);

        return result;
      } catch (error) {
        console.error(`❌ Failed to fetch job applicant dropdown options:`, error);
        throw error;
      }
    },
};