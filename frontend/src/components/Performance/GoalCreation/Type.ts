import type { LucideIcon } from 'lucide-react';

export type MetricType = '%' | 'Number' | 'Count' | 'Currency' | 'Boolean' | 'Milestone';

export type CategoryType =
    | 'Organisational'
    | 'Business'
    | 'Functional'
    | 'Team'
    | 'Individual'
    | 'Development';

export type MetricSelectOption = { label: string; value: MetricType };

export type CategorySelectOption = { label: string; value: CategoryType };

export interface KeyResult {
    id: string;
    title: string;
    metricType: MetricType;
    start: string;
    current: string;
    target: string;
    unit: string;
    weight: string;
    suggested?: boolean;
}

export interface AutoPullSource {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    icon: LucideIcon;
}
