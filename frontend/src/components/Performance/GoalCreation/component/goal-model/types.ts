export interface GoalTemplate {
    id: string;
    scope: string;
    title: string;
    usedCount: number;
    recommended?: boolean;
}

export interface TemplateListProps {
    onUseTemplate?: (template: GoalTemplate) => void;
}
