// src/services/jobApplicantService.ts

import FrappeAPI from "../utils/frappeAPI"; // Adjust this path if your frappeAPI.ts is elsewhere
import type { JobApplicantDetailsResponse, GetJobApplicantParams } from "../types/jobApplicant"; // Adjust this path if jobApplicant.ts is elsewhere

export const jobApplicantService = {
  /**
   * Fetches comprehensive details for a specific Job Applicant using a custom Frappe API method.
   * @param {GetJobApplicantParams} { applicant_name } - The name (ID) of the job applicant.
   * @returns {Promise<JobApplicantDetailsResponse>} A promise that resolves to the applicant's details.
   */
  getJobApplicantDetails: async ({ applicant_name }: GetJobApplicantParams): Promise<JobApplicantDetailsResponse> => {
    try {
      console.log(`🎯 Fetching job applicant details for: ${applicant_name}`);

      // Call your new custom Frappe API method
      const result = await FrappeAPI.callMethod(
        "recruitment.api.job_applicant.get_job_applicant_details", // This is the full path to your backend method
        { applicant_name },
      ) as JobApplicantDetailsResponse; // Cast the result to your defined interface

      console.log(`✅ Job Applicant details fetched successfully:`, result);

      return result;
    } catch (error) {
      console.error(`❌ Failed to fetch job applicant details for ${applicant_name}:`, error);
      throw error; // Re-throw the error for the React Query hook to catch
    }
  },
};
