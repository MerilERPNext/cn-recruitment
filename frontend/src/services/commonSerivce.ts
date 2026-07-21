import FrappeAPI from "../utils/frappeAPI";

export interface MessageDataItem {
    label: string;
    value: string | number | boolean | null;
}

export interface DataResponse {
    data: MessageDataItem[];
}

class commonSerivce {
    static async getHoverData(
        doctype: string,
        docnames: string,
    ): Promise<DataResponse> {
        const result = await FrappeAPI.callMethod(
            "cn_hrms_core.cn_hrms_core.doctype.hover_view_configuration.hover_view_configuration.get_hover_data",
            { doctype, docnames }
        );
        return result as DataResponse;
    }
}

export default commonSerivce;