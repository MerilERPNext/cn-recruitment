import FrappeAPI from "../utils/frappeAPI"; 
import type {
  JobApplicantDetailsResponse,
  GetJobApplicantParams,
  JobApplicantFieldOptionsResponse,
} from "../types/jobApplicant";

export const jobApplicantService = {
  /**
   * Fetches comprehensive details for a specific Job Applicant using a custom Frappe API method.
   * @param {GetJobApplicantParams} { applicant_name } - The name (ID) of the job applicant.
   * @returns {Promise<JobApplicantDetailsResponse>} A promise that resolves to the applicant's details.
   */
  getJobApplicantDetails: async ({
    applicant_name,
  }: GetJobApplicantParams): Promise<JobApplicantDetailsResponse> => {
    try {
      console.log(`🎯 Fetching job applicant details for: ${applicant_name}`);

      // Call your new custom Frappe API method
      const result = (await FrappeAPI.callMethod(
        "recruitment.api.job_applicant.get_job_applicant_details", 
        { applicant_name },
      )) as JobApplicantDetailsResponse; 

      console.log(`✅ Job Applicant details fetched successfully:`, result);

      return result;
    } catch (error) {
      console.error(
        `❌ Failed to fetch job applicant details for ${applicant_name}:`,
        error,
      );
      throw error; 
    }
  },

  /**
   * Fetches dropdown options for Job Applicant status and sub-status fields.
   * @returns {Promise<JobApplicantFieldOptionsResponse>} A promise that resolves to the available options.
   */
  getJobApplicantDropdownOptions:
    async (): Promise<JobApplicantFieldOptionsResponse> => {
      try {
        console.log(`🎯 Fetching job applicant dropdown options.`);

        const result = (await FrappeAPI.callMethod(
          "recruitment.api.job_applicant.get_job_applicant_field_options", 
          {},
        )) as JobApplicantFieldOptionsResponse;

        console.log(`✅ Dropdown options fetched successfully:`, result);

        return result;
      } catch (error) {
        console.error(`❌ Failed to fetch job applicant dropdown options:`, error);
        throw error;
      }
    },
};