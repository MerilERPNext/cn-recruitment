import TemplateCard from './TemplateCard';
import { GoalTemplate, TemplateListProps } from './types';

export const recommendedTemplates: GoalTemplate[] = [
    {
        id: 'product-release',
        scope: 'Org',
        title: 'Ship a major product release to all employees',
        usedCount: 142,
        recommended: true,
    },
    {
        id: 'handoff-time',
        scope: 'Function',
        title: 'Reduce handoff time between design and engineering',
        usedCount: 87,
    },
    {
        id: 'mentor-juniors',
        scope: 'Org',
        title: 'Mentor 2 junior team members to next level',
        usedCount: 124,
    },
    {
        id: 'csat',
        scope: 'Org',
        title: 'Maintain CSAT >= 4.5 across cross-functional partners',
        usedCount: 96,
    },
    {
        id: 'thought-leadership',
        scope: 'Function',
        title: 'Launch a thought leadership / content series',
        usedCount: 38,
    },
    {
        id: 'service-incidents',
        scope: 'Function',
        title: 'Reduce service incidents in your area by 30%',
        usedCount: 64,
    },
    {
        id: 'offer-conversion',
        scope: 'Function',
        title: 'Improve interview-to-offer conversion by 20%',
        usedCount: 24,
    },
    {
        id: 'onboard-team',
        scope: 'Manager',
        title: 'Onboard X new team members successfully',
        usedCount: 52,
    },
    {
        id: 'design-ops',
        scope: 'BU',
        title: 'Establish design ops practice in your BU',
        usedCount: 18,
        recommended: true,
    },
    {
        id: 'retention-score',
        scope: 'Org',
        title: 'Improve employee retention score by 15% YoY',
        usedCount: 76,
    },
    {
        id: 'docs-coverage',
        scope: 'Function',
        title: 'Achieve 90% documentation coverage for all APIs',
        usedCount: 31,
    },
    {
        id: 'feedback-loop',
        scope: 'Manager',
        title: 'Establish bi-weekly feedback loops across the team',
        usedCount: 45,
    },
];

const RecommendedTemplates = ({ onUseTemplate }: TemplateListProps) => (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {recommendedTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} onUseTemplate={onUseTemplate} />
        ))}
    </div>
);

export default RecommendedTemplates;
