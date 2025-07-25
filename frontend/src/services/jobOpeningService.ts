import FrappeAPI from "../utils/frappeAPI";
import type { JobOpening } from "../types/jobOpening";

export interface CreateJobOpeningFromRequisitionParams {
  job_requisition: string;
  job_title?: string;
  designation?: string;
  department?: string;
  employment_type?: string;
  location?: string;
  planned_vacancies?: number;
  posted_on?: string;
  closes_on?: string;
  description?: string;
  publish?: boolean;
}

export interface CreateJobOpeningResponse {
  status: "success" | "error";
  message: string;
  name?: string;
  job_opening?: JobOpening;
}

export const jobOpeningService = {
  // Create job opening from requisition using Resource API
  createJobOpeningFromRequisition: async (params: CreateJobOpeningFromRequisitionParams): Promise<CreateJobOpeningResponse> => {
    try {
      console.log(`🎯 Creating job opening from requisition: ${params.job_requisition}`)
      
      // First, get requisition details to map fields
      const requisitionData = await FrappeAPI.getDocument("Job Requisition", params.job_requisition) as any;
      console.log("📋 Requisition data:", requisitionData);
      
      // Check if job opening already exists for this requisition
      const existingJobOpenings = await FrappeAPI.getDocumentList("Job Opening", {
        fields: ["name", "status"],
        filters: [["job_requisition", "=", params.job_requisition]]
      });
      
      if (existingJobOpenings.data.length > 0) {
        const existingJobOpening = existingJobOpenings.data[0] as any;
        console.log(`⚠️ Job opening already exists:`, existingJobOpening);
        return {
          status: "error",
          message: `Job Opening already exists for this requisition: ${existingJobOpening.name}. You can view it in the Frappe interface.`,
          name: existingJobOpening.name
        };
      }
      
      // Create job opening document using resource API with all required fields
      const jobOpeningDoc = {
        doctype: "Job Opening",
        job_requisition: params.job_requisition,
        job_title: params.job_title || requisitionData.designation || "Job Opening",
        designation: params.designation || requisitionData.designation,
        department: params.department || requisitionData.department,
        company: requisitionData.company, // Required field
        planned_vacancies: params.planned_vacancies || requisitionData.no_of_positions || 1,
        posted_on: params.posted_on || new Date().toISOString().split('T')[0],
        status: "Open",
        publish: params.publish !== false ? 1 : 0,
        // Optional fields
        employment_type: params.employment_type || requisitionData.custom__employee_type || null,
        location: params.location || requisitionData.custom_location || null,
        closes_on: params.closes_on || requisitionData.expected_by || null,
        description: params.description || requisitionData.description || "",
        custom_recruiter: requisitionData.custom_assign_to_recruiter || null,
        // Map custom fields from requisition
        custom_division: requisitionData.custom_division || null,
        custom_employee_type: requisitionData.custom__employee_type || null,
        custom_hiring_manager: requisitionData.custom_user_id || null,
        custom_location: requisitionData.custom_location || null
      };

                  console.log("🔨 Job opening document to create:", jobOpeningDoc);

      // Use Frappe Resource API to create the job opening
      const createdJobOpening = await FrappeAPI.createDocument("Job Opening", jobOpeningDoc) as JobOpening;
      
            console.log(`✅ Job opening created:`, createdJobOpening)

      // Update requisition status to "Job Opening Created" only if we have a valid job opening
      if (createdJobOpening && createdJobOpening.name) {
        try {
          await FrappeAPI.callMethod("frappe.client.set_value", {
            doctype: "Job Requisition",
            name: params.job_requisition,
            fieldname: "status",
            value: "Job Opening Created"
          });
          console.log("✅ Requisition status updated");
        } catch (statusError) {
          console.warn("⚠️ Failed to update requisition status:", statusError);
          // Don't fail the entire operation if status update fails
        }
      }

      return {
        status: "success",
        message: "Job opening created successfully",
        name: createdJobOpening.name,
        job_opening: createdJobOpening
      }
    } catch (error: any) {
      console.error(`❌ Failed to create job opening from requisition ${params.job_requisition}:`, error)
      
      // Enhanced error logging
      if (error.response) {
        console.error("📋 Error response status:", error.response.status);
        console.error("📋 Error response data:", error.response.data);
        console.error("📋 Error response headers:", error.response.headers);
      }
      
      let errorMessage = "Failed to create job opening";
      
      // Parse specific error messages
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.exception) {
        errorMessage = error.response.data.exception;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        status: "error",
        message: errorMessage
      }
    }
  },

  // Get job openings for a requisition using Resource API
  getJobOpeningsByRequisition: async (job_requisition: string): Promise<JobOpening[]> => {
    try {
      console.log(`🎯 Fetching job openings for requisition: ${job_requisition}`)
      
      const result = await FrappeAPI.getDocumentList("Job Opening", {
        fields: ["*"],
        filters: [["job_requisition", "=", job_requisition]],
        orderBy: "creation desc"
      });

      console.log(`✅ Found ${result.data.length} job openings for requisition ${job_requisition}`)
      
      return result.data as JobOpening[]
    } catch (error) {
      console.error(`❌ Failed to fetch job openings for requisition ${job_requisition}:`, error)
      throw error
    }
  }
};
