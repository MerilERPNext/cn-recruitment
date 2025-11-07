import React from 'react';

const tableHeadings = [
    "Goal",
    "Status",
    "Achievement",
    "Weightage"
];

type statusType = "pending" | "progress" | "completed";

const GoalPendingApprovalTable: React.FC<{ tableData: any[] }> = ({ tableData }) => {
    const getStatusColor = (status: statusType) => {
        switch (status) {
            case "pending": return "bg-gray-200 text-gray-600";
            case "completed": return "bg-green-200 text-green-600";
            case "progress": return "bg-yellow-200 text-yellow-600";
        }
    }
    return (
        <div className='rounded-xl overflow-hidden border'>
            <div className='grid grid-cols-4 px-4 bg-gray-50 py-2 border-b border-gray-200'
                style={{
                    gridTemplateColumns: "2fr 1fr 1fr 1fr"
                }}
            >
                {tableHeadings.map(th => (
                    <h5 className='text-gray-600 font-semibold text-sm py-2'>{th}</h5>
                ))}
            </div>
            <div>
                {tableData.map(data => (
                    <div className='grid grid-cols-4 px-4 bg-white py-2 border-b border-gray-200 hover:bg-gray-50 cursor-pointer'
                        style={{
                            gridTemplateColumns: "2fr 1fr 1fr 1fr"
                        }}
                    >
                        <span className=''>{data.goal} <br /> {data.last_updated} </span>
                        <span className={`w-fit h-fit rounded-xl px-2 text-sm ${getStatusColor(data.status)}`}>{data.status}</span>
                        <span>{data.achievment}</span>
                        <span>{data.weightage}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GoalPendingApprovalTable;