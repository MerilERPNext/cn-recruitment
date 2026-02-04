import FrappeAPI from "../../utils/frappeAPI";

export const deleteDocument = async (
  doctype: string,
  name: string
): Promise<void> => {
  if (!doctype || !name) {
    throw new Error("Doctype and document name are required");
  }

  await FrappeAPI.deleteDocument(doctype, name);
};
