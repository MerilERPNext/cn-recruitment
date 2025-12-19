/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    useQuery,
    UseQueryResult,
} from "@tanstack/react-query";

import { getAllAccruedReimbursements, getBenefitPaySlipHTML, getBenefitPayslipListView } from "../services/benefitService";


export interface BenefitPayslip {
    name: string;
    employee: string;
    employee_name: string;
    custom_payroll_period: string;
    claim_date: string | null;
    company: string;
    custom_status: string;
    earning_component: string;
    claimed_amount: number;
    custom_note_by_employee: string | null;
    custom_note_by_approver: string | null;
    custom_is_taxable: number;
    custom_taxable_amount: number;
    custom_is_non_taxable: number;
    custom_non_taxable_amount: number;
    attachments: {
        file_url: string;
    }[];
}

interface BenefitPayslipResponse {
    status: string;
    data: BenefitPayslip[];
}

export const useGetBenefitPayslipListView = (EmployeeId: string, company: string, period: string): UseQueryResult<
    BenefitPayslipResponse,
    Error
> => {
    return useQuery<any, Error>({
        queryKey: ["benefit", "benefit-payslip", EmployeeId, company, period],
        queryFn: () => getBenefitPayslipListView(EmployeeId, company, period),
        refetchOnWindowFocus: true,
        enabled: !!EmployeeId && !!company
        // ...defaultQueryOptions,
    });
};

export const useGetBenefitSlipHTML = (salarySlipName: string): UseQueryResult<
    any,
    Error
> => {
    return useQuery<any, Error>({
        queryKey: ["benefit", "benefit-payslip", salarySlipName],
        queryFn: () => getBenefitPaySlipHTML(salarySlipName),
        refetchOnWindowFocus: true,
        enabled: !!salarySlipName
        // ...defaultQueryOptions,
    });
};

export interface SalaryComponentData { data: SalaryComponent[]; }

export interface SalaryComponent {
    salary_component: string;
    carry_forward_amount: number;
    total_accrued_amount: number;
    periodic_original_amount: number;
    advance_period: number;
    advance_amount: number;
    total_claimed_amount: number;
    total_balance_amount: number;
    details: SalaryComponentDetail[];
}
export interface SalaryComponentDetail {
    month: string;
    amount: number;
    working_days: number;
    payment_days: number;
    periodic_original_amount: number;
    lop_days: number;
    arrear_days: number;
    claimed_amount: number;
    paid_amount: number;
    bill_amount: number;
    balance_bill_amount: number;
    closing_balance: number;

}


export const useGetAllAccruedReimbursements = (employee: string, company: string): UseQueryResult<
    SalaryComponentData,
    Error
> => {
    return useQuery<any, Error>({
        queryKey: ["benefit", "my-benefits", employee, company],
        queryFn: () => getAllAccruedReimbursements(employee, company),
        refetchOnWindowFocus: true,
        enabled: !!employee && !!company
        // ...defaultQueryOptions,
    });
};


