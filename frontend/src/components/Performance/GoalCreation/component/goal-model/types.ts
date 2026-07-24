export interface GoalTemplate {
    id: string;
    scope: string;
    title: string;
    usedCount: number;
    recommended?: boolean;
    department?: string;
    designation?: string;
}

export interface TemplateListProps {
    onUseTemplate?: (template: GoalTemplate) => void;
    searchQuery?: string;
    selectedDepartment?: string;
    selectedDesignation?: string;
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
        // Match Search Query
        const matchesQuery =
            !query ||
            t.title.toLowerCase().includes(query) ||
            t.scope.toLowerCase().includes(query) ||
            (t.department && t.department.toLowerCase().includes(query)) ||
            (t.designation && t.designation.toLowerCase().includes(query));

        // Match Department Filter
        const matchesDept =
            !dept ||
            dept === 'all' ||
            (t.department && t.department.toLowerCase() === dept) ||
            t.scope.toLowerCase().includes(dept) ||
            t.title.toLowerCase().includes(dept);

        // Match Designation / Level Filter
        const matchesDesig =
            !desig ||
            desig === 'all' ||
            (t.designation && t.designation.toLowerCase() === desig) ||
            t.scope.toLowerCase().includes(desig) ||
            t.title.toLowerCase().includes(desig);

        return matchesQuery && matchesDept && matchesDesig;
    });
};

