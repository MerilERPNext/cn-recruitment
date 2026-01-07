/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    useMutation,
    useQuery,
    UseQueryResult,
} from "@tanstack/react-query";

import { getAllAccruedReimbursements, getBenefitClaimLockingPeriod, getBenefitPaySlipHTML, getBenefitPayslipListView, getBenefitRequestLockView, getYearFilterOptions, putCommentBenefitClaim } from "../services/benefitService";


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


export const useGetAllAccruedReimbursements = (employee: string, company: string, payroll_period: string): UseQueryResult<
    SalaryComponentData,
    Error
> => {
    return useQuery<any, Error>({
        queryKey: ["benefit", "my-benefits", employee, company, payroll_period],
        queryFn: () => getAllAccruedReimbursements(employee, company, payroll_period),
        enabled: !!employee && !!company
        // ...defaultQueryOptions,
    });
};



export const useCommentOnBenefitClaim = () => {
    return useMutation({
        mutationFn: async ({ doc_name, comment }: { doc_name: string, comment: string }) => {
            const response = await putCommentBenefitClaim(doc_name, comment);
            return response;
        },
    })
}

export const useGetBenefitRequestLockView = (employee: string, payroll_period: string, posting_date: string): UseQueryResult<
    { status: string, message: string },
    Error
> => {
    return useQuery<any, Error>({
        queryKey: ["benefit", "benefit-request-lock", employee, payroll_period, posting_date],
        queryFn: () => getBenefitRequestLockView(employee, payroll_period, posting_date),
        refetchOnWindowFocus: true,
        enabled: !!employee && !!payroll_period && !!posting_date
        // ...defaultQueryOptions,
    });
};

export const useGetBenefitClaimLockingPeriod = (employee: string, payroll_period: string, posting_date: string): UseQueryResult<
    { status: string, message: string },
    Error
> => {
    return useQuery<any, Error>({
        queryKey: ["benefit", "benefit-claim-locking", employee, payroll_period, posting_date],
        queryFn: () => getBenefitClaimLockingPeriod(employee, payroll_period, posting_date),
        enabled: !!employee && !!payroll_period && !!posting_date
        // ...defaultQueryOptions,
    });
};

export const useGetYearFilterOptions = (company: string): UseQueryResult<
    { name: string }[],
    Error
> => {
    return useQuery<any, Error>({
        queryKey: ["benefit", "benefit-claim-locking", company],
        queryFn: () => getYearFilterOptions(company),
        enabled: !!company
        // ...defaultQueryOptions,
    });
};

