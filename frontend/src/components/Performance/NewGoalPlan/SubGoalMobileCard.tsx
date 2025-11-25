import React from 'react';
import { formatDashedDate } from '../../../utils/formatToIndianDate';
import { SubGoal } from '../../../types/goal';


const SubGoalMobileCard: React.FC<{ data: SubGoal }> = ({ data }) => {
    const statusColors: any = {
        "Not Started": "bg-gray-200 text-gray-700",
        "In Progress": "bg-blue-100 text-blue-700",
        "Completed": "bg-green-100 text-green-700",
        "On Hold": "bg-yellow-100 text-yellow-700",
        "Delayed": "bg-orange-100 text-orange-700",
        "At Risk": "bg-red-100 text-red-700",
    };

    return (
        
        <div className=" mt-2 bg-gray-200 w-full rounded-lg border p-4">
            <div className='flex justify-between'>
                <span className='text-blue-600 font-medium text-lg'>{data.name}</span>
                <span className={`w-fit h-fit rounded-xl px-2 text-sm ${statusColors[data.status] || "bg-gray-100 text-gray-700"}`}>{data.status}</span>
                 </div>
                 <div className='flex sm:flex-row flex-col-reverse  mt-4'>
                    <div><span className='text-xs'>{formatDashedDate(data.start_date)} - {formatDashedDate(data.end_date)}</span> </div>
                    <div className='flex sm:ml-auto'>
                        <div><label className='text-sm text-gray-600'>Achievement :</label><span> {data.achievement}%</span> </div>
                        <span className='px-1 text-gray-600'> | </span>
                        <div><label className='text-sm text-gray-600'>Weightage : </label> <span>{data.weightage}%</span></div>
                    </div>
                </div>
        </div>
    );
};

export default SubGoalMobileCard;