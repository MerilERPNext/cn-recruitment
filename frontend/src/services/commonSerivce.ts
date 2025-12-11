import FrappeAPI from "../utils/frappeAPI";

class commonSerivce {
    static async getHoverData(
        doctype: string,
        docnames: string,
    ): Promise<any> {
        const result = await FrappeAPI.callMethod(
            "cn_hrms_core.cn_hrms_core.doctype.hover_view_configuration.hover_view_configuration.get_hover_data",
            { doctype, docnames }
        );
        return result;
    }
}

export default commonSerivce;