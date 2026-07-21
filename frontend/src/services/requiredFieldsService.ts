import FrappeAPI from "../utils/frappeAPI"

export interface RequiredFieldsResponse {
  doctype_name: string,
  fields: {
    fieldname: string;
    fieldtype: string;
    label: string;
    hidden: number;
    reqd: number;
    options: any
  }[];
}

export const requiredFieldsService = {
  getRequiredFields: async (doctype_name: string): Promise<RequiredFieldsResponse> => {
    const url = "recruitment.api.doctype_meta_api.get_doctype_with_custom_fields?doctype_name";

    const result = await FrappeAPI.callMethod(url, { doctype_name});

    // ✅ Log the result for debugging
    console.log("✅  Document Response:", doctype_name, result);

    return result as RequiredFieldsResponse;
  }
}