/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoanApplicationUpdatePayload } from "../hooks/useLoan";
import FrappeAPI from "../utils/frappeAPI";

export const getAllLoanProducts = async (): Promise<{
  data: { name: string }[];
}> => {
  const res = await FrappeAPI.getDocumentList("Loan Product", {
    fields: ["name"],
    orderBy: "creation desc",
  });
  return {
    data: res.data as { name: string }[],
  };
};

export const createLoanApplication = async (
  body: Record<string, unknown>
): Promise<boolean> => {
  try {
    const response = await FrappeAPI.createDocument("Loan Application", body);

    // Return true if response is not null/undefined
    return !!response;
  } catch (error) {
    console.error("📡 Error while Adding Loan Application in:", error);
    throw error;
  }
};


export const updateLoanApplication = async ({
  docname,
  data,
}: LoanApplicationUpdatePayload) => {
  const response = await FrappeAPI.updateDocument("Loan Application", docname, data);
  await FrappeAPI.callMethod(
    "nextai.funnel.doctype.funnel_task.awaiting_actions.chatnext_dynamic_multi_actions.resubmit_approval_event",
    {
      doctype: "Loan Application",
      docname: docname,
      data: [data],
    }
  );
  return response;
};