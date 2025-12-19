/* eslint-disable @typescript-eslint/no-explicit-any */
import FrappeAPI from "../../utils/frappeAPI";
  
  export const getSalaryStructureAssignment = async () => {
    const response = await FrappeAPI.getDocumentList("Salary Structure Assignment", {
      fields: ["*"],
      filters: [["idx", "=", 1]],
    }) as { status: string; data: any[] };
  
    return response.data;   
  };