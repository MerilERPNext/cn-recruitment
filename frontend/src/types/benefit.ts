import { TodoType } from "./todos";

export interface BenefitType extends Omit<TodoType, "reference_document"> {
    reference_document: {
        name: string;
        employee_name: string;
        earning_component: string;
        claimed_amount: number;
        custom_max_amount: number;
        claim_date: string;
        custom_status: string;
        employee: string;
    }
};