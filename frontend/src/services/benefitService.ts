import axios from "axios"
import html2pdf from "html2pdf.js"
import FrappeAPI from "../utils/frappeAPI"

/**
 * Generate PDF from HTML string
 */
export const generatePDFfromHTML = (html: string, fileName: string) => {
    const element = document.createElement("div")
    element.innerHTML = html
    html2pdf().set({ filename: fileName }).from(element).save()
}

export const getBenefitPaySlipHTML = async (salarySlipName: string) => {
    const response = await axios.get(`/api/method/cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.benefit_claim.get_benefit_payslip_pdf`, {
        params: { id: salarySlipName },
    })
    const data = response.data.message || response.data
    return data.response || data
}

// const downloadBenefitSlipPDF = async (salarySlipName: string, fileName: string) => {
//     const html = await getBenefitPaySlipHTML(salarySlipName)
//     if (!html) throw new Error("No data returned from API")
//     generatePDFfromHTML(html, fileName)
// }

type benefitSlipApiParams = {
    employee: string;
    company: string;
    payroll_period?: string;
}

export const getBenefitPayslipListView = async (EmployeeId: string, company: string, period: string) => {
    const params: benefitSlipApiParams = {
        employee: EmployeeId,
        company
    }

    if (period.trim() !== "") {
        params["payroll_period"] = period;
    }

    const response = await FrappeAPI.callMethod(
        "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.benefit_claim.benefit_payslip_list_view",
        params
    );

    return response;
};

export const getAllAccruedReimbursements = async (employee: string, company: string) => {
    const response = await FrappeAPI.callMethod(
        "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.benefit_claim.get_all_accrued_reimbursements",
        { employee, company }
    );

    return response;
};

