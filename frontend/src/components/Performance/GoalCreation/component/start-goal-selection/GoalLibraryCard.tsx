import React from 'react';
import { ArrowRight, FileText } from 'lucide-react';
import { Typography } from '../../../../shared/atoms/Typography';
import Button from '../../../../shared/atoms/Button';

interface GoalLibraryCardProps {
    onUse: () => void;
}

const GoalLibraryCard = ({ onUse }: GoalLibraryCardProps) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 flex-1">
                <div className="flex gap-4 items-start mb-6">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <Typography variant="h4" className="mb-1">From Goal Library</Typography>
                        <Typography variant="bodyMedium" className="text-gray-500">Browse 500+ pre-built OKR templates by role, department, and grade.</Typography>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-auto mb-6">
                    <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-700">Most popular · 142 templates for Design</div>
                        <div className="text-xs text-gray-500">Median time: ~ 90 seconds</div>
                    </div>
                    <Button variant="contain" className="w-full sm:w-auto justify-center bg-indigo-500 hover:bg-indigo-600 text-white" onClick={onUse} aria-label="Use goal library">
                        Use this <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">Design craft +12</span>
                    <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">Mentorship</span>
                    <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">Systems thinking</span>
                    <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">Cross-functional</span>
                    <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">+138 more</span>
                </div>
            </div>
        </div>
    );
};

export default React.memo(GoalLibraryCard);
