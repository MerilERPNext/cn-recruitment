import axios from "axios"
import html2pdf from "html2pdf.js"
import FrappeAPI from "../utils/frappeAPI"

/**
 * Generate PDF from HTML string
 */
const generatePDFfromHTML = (html: string, fileName: string) => {
  const element = document.createElement("div")
  element.innerHTML = html
  html2pdf().set({ filename: fileName }).from(element).save()
}

const fetchHTML = async (method: string, salarySlipName: string) => {
  const response = await axios.get(`/api/method/${method}`, {
    params: { id: salarySlipName },
  })
  const data = response.data.message || response.data
  return data.response || data
}

export const getSalarySlipName = async () => {
  const response = await FrappeAPI.getDocumentList("Salary Slip", {
    fields: ["name"],
    orderBy: "creation desc",
  });
  return response
};

/** Generic function to download PDF from HTML-based API*/
const downloadPDFfromHTMLMethod = async (method: string, salarySlipName: string, fileName: string) => {
  const html = await fetchHTML(method, salarySlipName)
  if (!html) throw new Error("No data returned from API")
  generatePDFfromHTML(html, fileName)
}

/**Download Salary Slip (HTML → PDF)*/
export const downloadSalarySlipPDF = async (salarySlipName: string) => {
  await downloadPDFfromHTMLMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.tds_printer.get_payslip_pdf_html",
    salarySlipName,
    "SalarySlip.pdf",
  )
}

/** Download TDS Payslip PDF*/
export const TDSPRintViewPDF = async (salarySlipName: string) => {
  await downloadPDFfromHTMLMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.tds_printer.get_payslip_tds_pdf_html",
    salarySlipName,
    "TDSPayslip.pdf",
  )
}

/** Download Benefit Claim PDF*/
export const BenefitClaimPDF = async (salarySlipName: string) => {
  await downloadPDFfromHTMLMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.tds_printer.get_benefit_payslip_pdf_html",
    salarySlipName,
    "BenefitClaim.pdf",
  )
}

/** Download Off-Cycle Payslip PDF*/
export const offCyclePaySlipPDF = async (salarySlipName: string) => {
  await downloadPDFfromHTMLMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.tds_printer.get_offcycle_payslip_pdf_html",
    salarySlipName,
    "OffCyclePayslip.pdf",
  )
}

export const getSalarySlipHTML = async (salarySlipName: string) => {
  return await fetchHTML(
    "cn_indian_payroll.cn_indian_payroll.overrides.tds_printer.get_payslip_pdf_html",
    salarySlipName,
  )
}

export const getTDSPayslipHTML = async (salarySlipName: string) => {
  return await fetchHTML(
    "cn_indian_payroll.cn_indian_payroll.overrides.tds_printer.get_payslip_tds_pdf_html",
    salarySlipName,
  )
}

export const getBenefitPayslipHTML = async (salarySlipName: string) => {
  return await fetchHTML(
    "cn_indian_payroll.cn_indian_payroll.overrides.tds_printer.get_benefit_payslip_pdf_html",
    salarySlipName,
  )
}

export const getOffCyclePayslipHTML = async (salarySlipName: string) => {
  return await fetchHTML(
    "cn_indian_payroll.cn_indian_payroll.overrides.tds_printer.get_offcycle_payslip_pdf_html",
    salarySlipName,
  )
}



/** Roles allowed to release salary slips (configured in Payroll Settings). */
export const getPayrollAdminRoles = async (
  employee?: string,
): Promise<string[]> => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.salary_slip_list.check_admin_permission",
    { employee },
  );
  return Array.isArray(response) ? (response as string[]) : [];
};

/** Release (submit) a single draft Salary Slip */
export const releaseSalarySlip = async (salarySlipName: string, salary_slip_type: string) => {
  const response = await FrappeAPI.callMethod(
    "cn_indian_payroll.cn_indian_payroll.overrides.webapp_api.salary_slip_list.release_salary_slip",
    { salary_slip_id: salarySlipName, salary_slip_type }
  );
  return response;
};

// api/salarySlip.ts
export const updateSalarySlip = async (
  salarySlipName: string,
  fileUrl: string
) => {
  const response = await FrappeAPI.updateDocument(
    "Salary Slip",
    salarySlipName,
    {
      custom_attach: fileUrl,
    }
  );

  return response;
};
