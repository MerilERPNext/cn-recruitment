import FrappeAPI from "../utils/frappeAPI";
import type {
  JobApplicantDetailsResponse,
  GetJobApplicantParams,
  JobApplicantBasicDetails,
  EmploymentEntry,
  EducationEntry,
  ApplicantNote,
  ApplicantTimelineEvent,
  CommunicationEvent,
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

      const applicantDoc = (await FrappeAPI.getDocument(
        "Job Applicant",
        applicant_name
      )) as any;

      const job_applicant_data: JobApplicantBasicDetails = {
        name: applicantDoc.name,
        applicant_name: `${applicantDoc.applicant_name || ""} ${
          applicantDoc.custom_applicant_last_name_ || ""
        }`.trim(),
        email_id: applicantDoc.email_id || "N/A",
        phone_number: applicantDoc.phone_number || "N/A",
        job_title: applicantDoc.job_title || "N/A",
        designation: applicantDoc.designation || "N/A",
        status: applicantDoc.status || "N/A",
        sub_status: applicantDoc.custom_substatus || "N/A",
        location: `${applicantDoc.custom_location || ""}${
          applicantDoc.custom_location && applicantDoc.country ? ", " : ""
        }${applicantDoc.country || ""}`.trim(),
        experience: applicantDoc.custom_total_experience || "N/A",
        expected_ctc: `${applicantDoc.currency || ""} ${
          applicantDoc.custom_expected_ctc || applicantDoc.lower_range || 0
        } / Annum`.trim(),
        notice_period: applicantDoc.custom_bond_if_any || "N/A",
        profile_image: applicantDoc.profile_image || null,
        resume_attachment: applicantDoc.resume_attachment || null,
        creation: applicantDoc.creation,
        custom_recruiter_name: applicantDoc.custom_recruiter_name || "N/A",
        custom_current_designation:
          applicantDoc.custom_current_designation || "N/A",
        custom_current_company_name:
          applicantDoc.custom_current_company_name || "N/A",
        custom_linkedin_url: applicantDoc.custom_linkedin_url || "N/A",
        custom_permanent_address:
          applicantDoc.custom_permanent_address || "N/A",
        custom_current_address: applicantDoc.custom_current_address || "N/A",
        custom_expected_doj: applicantDoc.custom_expected_doj || null,
        source: applicantDoc.source || "N/A",
        applicant_rating: applicantDoc.applicant_rating || 0,
        custom_home_town: applicantDoc.custom_home_town || "N/A",
        custom_recruiter_remark: applicantDoc.custom_recruiter_remark || "N/A",
      };

      const employment_history: EmploymentEntry[] = (
        applicantDoc.custom_previous_work_experience || []
      ).map((entry: any) => {
        const startDate = entry.custom_from_datee;
        const endDate = entry.custom_to_datee;
        let duration = "";
        return {
          company_name: entry.company_name || "N/A",
          designation: entry.designation || "N/A",
          start_date: startDate || "N/A",
          end_date: endDate || "Present",
          duration: duration,
          address: entry.address || "N/A",
          salary: entry.salary || 0,
        };
      });

      const education_history: EducationEntry[] = (
        applicantDoc.custom_educational_qualification || []
      ).map((entry: any) => ({
        university: entry.school_univ || "N/A",
        degree: entry.qualification || "N/A",
        field_of_study: entry.custom_educational_details || "N/A",
        level: entry.level || "N/A",
        start_year:
          entry.custom_passing_year ||
          (entry.year_of_passing !== 0 ? String(entry.year_of_passing) : "N/A"),
        end_year:
          entry.custom_passing_year ||
          (entry.year_of_passing !== 0 ? String(entry.year_of_passing) : "N/A"),
      }));

      const notes: ApplicantNote[] = (applicantDoc.custom_crm_note || []).map(
        (note_entry: any) => ({
          id: note_entry.name,
          timestamp: note_entry.added_on,
          author: note_entry.added_by,
          content: note_entry.note,
          type: note_entry.custom_comment_type,
        })
      );

      const applicant_timeline_events: ApplicantTimelineEvent[] = [
        {
          id: "app_submitted",
          type: "Application Submitted",
          timestamp: "2025-07-10T11:00:00Z",
          description: "Applied for Senior Frontend Developer role.",
          by_user: "Applicant",
        },
        {
          id: "status_changed_screening",
          type: "Status Changed",
          timestamp: "2025-07-11T16:15:00Z",
          description:
            "Status changed: Sourced → Screening. Sub-status changed to HR Round.",
          by_user: "Sarah Wilson",
        },
        {
          id: "interview_scheduled_tech",
          type: "Interview Scheduled",
          timestamp: "2025-07-12T10:30:00Z",
          description: "Technical Round with John Smith.",
          by_user: "Recruiter",
        },
      ];

      const communication_history: CommunicationEvent[] = [
        {
          id: "whatsapp_confirm",
          type: "WhatsApp Message",
          timestamp: "2025-07-12T10:35:00Z",
          description: "Confirming interview schedule.",
          icon: "chat",
        },
        {
          id: "outgoing_call_expectations",
          type: "Outgoing Call",
          timestamp: "2025-07-11T16:00:00Z",
          description: "Duration: 5m 32s. Spoke about role expectations.",
          icon: "call",
        },
        {
          id: "email_screening_invite",
          type: "Email Sent",
          timestamp: "2025-07-10T14:00:00Z",
          description: "Invitation for initial screening call.",
          icon: "mail",
        },
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
   * Fetches dropdown options for Job Applicant status fields using static data.
   * This is a temporary solution to bypass API issues for the status dropdown.
   * In a production environment, this should ideally be fetched from a Frappe DocType.
   * @returns {Promise<string[]>} A promise that resolves to an array of status strings.
   */
  getJobApplicantStatusOptions: async (): Promise<string[]> => {
    try {
      console.log(`🎯 Fetching job applicant status options from static data.`);

      // Provide your static status options here, matching the dropdown in Frappe
      const static_status_options: string[] = [
        "Open",
        "Screening",
        "Replied",
        "Interview",
        "Hold",
        "Approvals",
        "Accepted",
        "Rejected",
        // Add any other statuses you need from your Frappe dropdown
      ];

      // Simulate a network delay for better development experience
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate 300ms delay

      console.log(`✅ Static status options provided successfully:`, static_status_options);

      return static_status_options;
    } catch (error) {
      // This catch block might not be strictly necessary for static data,
      // but good practice if you ever switch back to an API call.
      console.error(`❌ Failed to provide static job applicant status options:`, error);
      throw error;
    }
  },

  /**
   * Fetches dropdown options for 'Sub Status' based on the selected main status.
   * This assumes a 'Sub Status' DocType exists where each document's 'Parent Status'
   * matches a main status, and its 'sub_status' field contains newline-separated sub-statuses.
   * @param {string} mainStatus - The currently selected main status (which corresponds to 'Parent Status' in 'Sub Status' DocType).
   * @returns {Promise<string[]>} A promise that resolves to an array of sub-status strings.
   */
  getJobApplicantSubStatusOptions: async (
    mainStatus: string
  ): Promise<string[]> => {
    try {
      console.log(
        `🎯 Fetching sub-status options for main status: ${mainStatus}`
      );

      // IMPORTANT: Replace "Sub Status" with the actual name of your Sub Status DocType.
      // VERIFY "parent_status" and "sub_status" are the correct field names
      // in your "Sub Status" DocType as per your Frappe setup.
      const response = await FrappeAPI.getDocumentList(
        "Sub Status", // <--- VERIFY THIS DOCTYPE NAME IN FRAPPE
        {
          fields: ["name", "parent_status", "sub_status"], // <--- VERIFY THESE FIELD NAMES IN YOUR "Sub Status" DOCTYPE
          filters: [["parent_status", "=", mainStatus]], // Filter by the main status value
        }
      );

      let subStatusOptions: string[] = [];

      if (response.data && response.data.length > 0) {
        const subStatusDoc = response.data[0] as any;
        if (subStatusDoc.sub_status) {
          // 'sub_status' is the field containing the multiline string
          subStatusOptions = subStatusDoc.sub_status
            .split("\n")
            .map((s: string) => s.trim())
            .filter((s: string) => s);
        }
      }

      console.log(
        `✅ Sub-status options fetched successfully for ${mainStatus}:`,
        subStatusOptions
      );

      return subStatusOptions;
    } catch (error) {
      console.error(
        `❌ Failed to fetch sub-status options for ${mainStatus}:`,
        error
      );
      throw error;
    }
  },
};