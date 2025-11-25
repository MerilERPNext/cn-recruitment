import React from 'react';
import CardTable from '../../shared/CardTable';
import GoalPeningRow from './GoalPeningRow';
import { StaticListView } from '../../ListView';

const GoalPendingApprovalTable: React.FC<{ tableData: any[] }> = ({ tableData }) => {
    const isEmpty = !tableData || tableData.length === 0;
     const gtc = "1fr 1fr 1fr 1fr 0.5fr";
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
                         <StaticListView
                            data={tableData}
                            ItemComponent={(_, item, isLast)=> <GoalPeningRow gtc={gtc} data={item} isLastItem={isLast} />}
                            pageSize={20}
                            />
                    )}
                </div>
            </CardTable>
        </div>
    );
};

export default GoalPendingApprovalTable;



