import React from 'react';

type statusType = "pending" | "progress" | "completed";

const GoalPendingMobileCard: React.FC<{ data: any }> = ({ data }) => {
    const getStatusColor = (status: statusType) => {
        switch (status) {
            case "pending": return "bg-gray-200 text-gray-600";
            case "completed": return "bg-green-200 text-green-600";
            case "progress": return "bg-yellow-200 text-yellow-600";
        }
    }
    return (
        <div className=" bg-gray-50 w-full rounded-lg border p-4">
            <div className='flex justify-between'>
                <span className='text-gray-600 font-medium'>{data.goal}</span>
                <span className={`w-fit h-fit rounded-xl px-2 text-sm ${getStatusColor(data.status)}`}>{data.status}</span>
                 </div>
                 <div className='flex sm:flex-row flex-col-reverse  mt-4'>
                    <span className='text-sm'>{data.last_updated} </span>
                    <div className='flex sm:ml-auto'>
                        <div><label className='text-sm text-gray-600'>Achievement :</label><span>{data.achievment}</span> </div>
                        <span className='px-1 text-gray-600'> | </span>
                        <div><label className='text-sm text-gray-600'>Weightage</label> <span>{data.weightage}</span></div>
                    </div>
                </div>
        </div>
    );
};

export default GoalPendingMobileCard;