import FrappeAPI from "../utils/frappeAPI";

export const getAllLoanProducts = async (): Promise<{
  data: [{ name: string }];
}> => {
  const res = await FrappeAPI.getDocumentList("Loan Product", {
    fields: ["name"],
    orderBy: "creation desc",
  });
  return {
    data: res.data as [{ name: string }],
  };
};

export const createLoanApplication = async (
  body: Record<string, unknown>
): Promise<boolean> => {
  try {
    const response = await FrappeAPI.createDocument("Loan Application", body);
    return response as boolean;
  } catch (error) {
    console.error("📡 Error while Adding Loan Application in:", error);
    throw error;
  }
};
