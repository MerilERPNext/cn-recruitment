import React from 'react';
import TemplateCard from './TemplateCard';
import { TemplateListProps } from './types';
import { recommendedTemplates } from '../../MockData';

const RecommendedTemplates = ({ onUseTemplate }: TemplateListProps) => (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {recommendedTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} onUseTemplate={onUseTemplate} />
        ))}
    </div>
);

export default React.memo(RecommendedTemplates);
