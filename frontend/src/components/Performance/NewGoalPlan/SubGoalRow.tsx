import React from 'react';
import type {  SubGoal } from '../../../types/goal';
import { formatDashedDate } from '../../../utils/formatToIndianDate';

interface SubGoalRowProps {
    gtc: string;
    data: SubGoal;
    isLastSubGoal: boolean;
}

const SubGoalRow: React.FC<SubGoalRowProps> = ({gtc, data , isLastSubGoal}) => {
    const statusColors: any = {
        "Not Started": "bg-gray-200 text-gray-700",
        "In Progress": "bg-blue-100 text-blue-700",
        "Completed": "bg-green-100 text-green-700",
        "On Hold": "bg-yellow-100 text-yellow-700",
        "Delayed": "bg-orange-100 text-orange-700",
        "At Risk": "bg-red-100 text-red-700",
    };
    return (
        <div className='flex bg-slate-100'>
            <div className='ml-6 relative'>
            { isLastSubGoal ? 
                <><div className='bg-black h-1/3 w-0.5' /> <div className='w-3 h-0.5 absolute bg-black' /></>
                : <div className='bg-black h-full w-0.5' />}
                </div> 
            <div className='grid items-center grid-cols-4 w-full px-4  py-2 gap-4 border-b border-gray-200 cursor-pointer'
                    style={{
                    gridTemplateColumns: gtc
                }}
            >
                <span className='text-sm font-medium text-gray-700 text-start truncate'> {data.name}  <br /> <span className='text-xs text-gray-600'>{formatDashedDate(data.start_date)} - {formatDashedDate(data.end_date)}</span> </span>
                <span className={`w-fit h-fit rounded-xl px-2 text-sm ${statusColors[data.status] || "bg-gray-100 text-gray-700"}`}>{data.status}</span>
                <span  className='text-sm font-medium text-gray-700 text-start truncate'>{data.achievement} %</span>
                <span  className='text-sm font-medium text-gray-700 text-start truncate'>{data.weightage} %</span>
                <span>
                </span>
            </div>
        </div>
    );
};

export default SubGoalRow;