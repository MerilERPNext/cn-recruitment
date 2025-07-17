// // src/services/jobApplicantService.ts
// import FrappeAPI from "../utils/frappeAPI";
// import type { JobApplicant, CommentItem, AddCommentPayload } from "../types/jobApplicant";

// export const jobApplicantService = {
//   getJobApplicantById: async (name: string): Promise<JobApplicant> => {
//     if (!name) throw new Error("Job Applicant ID is required");
//     const result = await FrappeAPI.getDocument("Job Applicant", name);
//     if (!result) throw new Error("Job Applicant data not found");
//     return result as JobApplicant;
//   },

//   updateJobApplicant: async (
//     name: string,
//     updates: Partial<{
//       status: string;
//       sub_status: string;
//       custom_substatus: string;
//     }>
//   ) => {
//     const results = [];

//     for (const [fieldname, value] of Object.entries(updates)) {
//       if (value !== undefined) {
//         const result = await FrappeAPI.callMethod("frappe.client.set_value", {
//           doctype: "Job Applicant",
//           name,
//           fieldname,
//           value,
//         });
//         results.push(result);
//       }
//     }

//     return results;
//   },

//   getSubStatuses: async (parentStatus: string): Promise<string[]> => {
//     const response = await FrappeAPI.getDocumentList("Sub Status", {
//       fields: ["sub_status"],
//       filters: [["parent_status", "=", parentStatus]],
//     });

//     const subStatusData = response.data as { sub_status: string }[];

//     const subStatusArray = subStatusData
//       .map((item) =>
//         item.sub_status.includes("\n")
//           ? item.sub_status.split("\n").filter((s) => s.trim())
//           : [item.sub_status]
//       )
//       .flat();

//     return subStatusArray;
//   },
// };

// export const commentService = {
//   addComment: async ({
//     content,
//     reference_doctype,
//     reference_name,
//     subject = "Internal Note",
//   }: AddCommentPayload): Promise<void> => {
//     await FrappeAPI.callMethod("frappe.client.insert", {
//       doc: {
//         doctype: "Comment",
//         comment_type: "Comment",
//         communication_type: "Comment",
//         subject,
//         content,
//         reference_doctype,
//         reference_name,
//       },
//     });
//   },

//   getCommentsForApplicant: async (applicantId: string): Promise<CommentItem[]> => {
//     const response = await FrappeAPI.getDocumentList("Comment", {
//       fields: ["name", "content", "creation", "owner"],
//       filters: [
//         ["reference_doctype", "=", "Job Applicant"],
//         ["reference_name", "=", applicantId],
//       ],
//       orderBy: "creation desc",
//     });

//     return response.data as CommentItem[];
//   },
// };



// src/services/jobApplicantService.ts
import FrappeAPI from "../utils/frappeAPI";
import type { JobApplicant, CommentItem, AddCommentPayload } from "../types/jobApplicant";

export const jobApplicantService = {
  getJobApplicantById: async (name: string): Promise<JobApplicant> => {
    if (!name) throw new Error("Job Applicant ID is required");
    const result = await FrappeAPI.getDocument("Job Applicant", name);
    if (!result) throw new Error("Job Applicant data not found");
    return result as JobApplicant;
  },

  updateJobApplicant: async (
    name: string,
    updates: Partial<{
      status: string;
      sub_status: string;
      custom_substatus: string;
    }>
  ) => {
    // Filter out undefined values and create a dictionary of valid updates
    const validUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    // If no valid updates are present, exit early
    if (Object.keys(validUpdates).length === 0) {
      console.warn("No valid updates provided for Job Applicant:", name);
      return; // Or return a specific success/failure indicator if your UI expects it
    }

    // Make a single API call to update all valid fields
    // Frappe's set_value can take an object for 'fieldname' to update multiple fields
    return await FrappeAPI.callMethod("frappe.client.set_value", {
      doctype: "Job Applicant",
      name,
      // Pass the dictionary of updates directly here
      fieldname: validUpdates,
      // The 'value' argument is not used when 'fieldname' is an object
    });
  },

  getSubStatuses: async (parentStatus: string): Promise<string[]> => {
    const response = await FrappeAPI.getDocumentList("Sub Status", {
      fields: ["sub_status"],
      filters: [["parent_status", "=", parentStatus]],
    });

    const subStatusData = response.data as { sub_status: string }[];

    const subStatusArray = subStatusData
      .map((item) =>
        item.sub_status.includes("\n")
          ? item.sub_status.split("\n").filter((s) => s.trim())
          : [item.sub_status]
      )
      .flat();

    return subStatusArray;
  },
};

export const commentService = {
  addComment: async ({
    content,
    reference_doctype,
    reference_name,
    subject = "Internal Note",
  }: AddCommentPayload): Promise<void> => {
    await FrappeAPI.callMethod("frappe.client.insert", {
      doc: {
        doctype: "Comment",
        comment_type: "Comment",
        communication_type: "Comment",
        subject,
        content,
        reference_doctype,
        reference_name,
      },
    });
  },

  getCommentsForApplicant: async (applicantId: string): Promise<CommentItem[]> => {
    const response = await FrappeAPI.getDocumentList("Comment", {
      fields: ["name", "content", "creation", "owner"],
      filters: [
        ["reference_doctype", "=", "Job Applicant"],
        ["reference_name", "=", applicantId],
      ],
      orderBy: "creation desc",
    });

    return response.data as CommentItem[];
  },
};
