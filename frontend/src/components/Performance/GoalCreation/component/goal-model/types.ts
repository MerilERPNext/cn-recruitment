import { CascadeGoal, DraftGoalItem, Goal } from "../../../../../types/goal";

export type GoalTemplate = Partial<Goal> & {
    id?: string;
    goal?: string;
    title: string;
    scope?: string;
    usedCount?: number;
    recommended?: boolean;
    department?: string | null;
    department_title?: string | null;
    designation?: string;
    designation_title?: string | null;
    designation_name?: string | null;
    role?: string | null;
    role_title?: string | null;
    role_name?: string | null;
    job_role?: string | null;
    role_based?: boolean | number | string | null;
    total_weightage?: number;
    goal_count?: number;
    used_by_count?: number; 
    owner_designation?: string | null;
    owner_employee_name?: string | null;
    repository_goals?: GoalTemplate[];
};

export const getGoalKey = (template: GoalTemplate | CascadeGoal | DraftGoalItem): string => {
    if (!template) return '';
    return   template.goal || template.title || '';
};

export interface TemplateListProps {
    onUseTemplate?: (template: GoalTemplate | GoalTemplate[], source?: string) => void;
    searchQuery?: string;
    selectedDepartment?: string;
    selectedDesignation?: string;
    selectedTemplates?: GoalTemplate[];
    onToggleSelect?: (template: GoalTemplate) => void;
    onSelectAll?: (templates: GoalTemplate[]) => void;
    weightages?: Record<string, number>;
    onWeightageChange?: (template: GoalTemplate, weightage: number) => void;
    allOrgTemplatesData?: GoalTemplate[];
     recommendedTemplatesData?: GoalTemplate[];
}

export const filterTemplates = (
    templates: GoalTemplate[],
    searchQuery: string = '',
    selectedDepartment: string = 'All',
    selectedDesignation: string = 'All'
): GoalTemplate[] => {
    const query = searchQuery.trim().toLowerCase();
    const dept = selectedDepartment.toLowerCase();
    const desig = selectedDesignation.toLowerCase();

    return templates.filter((t) => {
        const titleMatch = t.title ? t.title.toLowerCase() : '';
        const deptMatch = t.department ? t.department.toLowerCase() : (t.department_title ? t.department_title.toLowerCase() : '');
        const desigMatch = t.designation ? t.designation.toLowerCase() : (t.owner_employee_name ? t.owner_employee_name.toLowerCase() : '');
        const scopeMatch = t.scope ? t.scope.toLowerCase() : '';

        // Match Search Query
        const matchesQuery =
            !query ||
            titleMatch.includes(query) ||
            deptMatch.includes(query) ||
            desigMatch.includes(query) ||
            scopeMatch.includes(query);

        // Match Department Filter
        const matchesDept =
            !dept ||
            dept === 'all' ||
            deptMatch.includes(dept) ||
            scopeMatch.includes(dept) ||
            titleMatch.includes(dept);

        // Match Designation / Level Filter
        const matchesDesig =
            !desig ||
            desig === 'all' ||
            desigMatch.includes(desig) ||
            titleMatch.includes(desig);

        return matchesQuery && matchesDept && matchesDesig;
    });
};


