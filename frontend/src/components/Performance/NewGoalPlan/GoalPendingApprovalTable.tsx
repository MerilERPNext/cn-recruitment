import React from 'react';
import CardTable from '../../shared/CardTable';

const GoalPendingApprovalTable: React.FC<{ tableData: any[], children: React.ReactNode }> = ({ tableData, children }) => {
    const isEmpty = !tableData || tableData.length === 0;
    return (
        <div className="bg-white h-full px-4 pt-2 mb-32">
            <CardTable
                titles={[
                    "",
                    "Goal",
                    "Status",
                    "Achievement",
                    "Weightage",
                    "Actions",
                ]}
                columnWidths={["10px", "0.9fr", "0.9fr", "1fr", "1fr", "0.5fr"]}
            >
                <div>
                    {isEmpty ? (
                        <div className="text-center text-gray-500 py-16">
                            No pending approvals found.
                        </div>
                    ) : (
                        children
                    )}
                </div>
            </CardTable>
        </div>
    );
};

export default GoalPendingApprovalTable;



