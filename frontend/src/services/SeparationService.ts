import FrappeAPI from "../utils/frappeAPI";

export const SeparationEmployeeService = async () => {
    const res = await FrappeAPI.getDocumentList("Employee Separation", {
      fields: ["*"],
    });
    return {
      data: res.data,
    };
  };