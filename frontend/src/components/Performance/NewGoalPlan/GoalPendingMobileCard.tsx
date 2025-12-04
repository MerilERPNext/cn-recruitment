import React, { useState } from 'react';
import { formatDashedDate } from '../../../utils/formatToIndianDate';
import CreateGoalDialog from './CreateGoalDialog';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { GroupGoalItem } from '../../../types/goal';
import SubGoalMobileCard from './SubGoalMobileCard';


const GoalPendingMobileCard: React.FC<{ data: GroupGoalItem }> = ({ data }) => {
    const statusColors: any = {
        "Not Started": "bg-gray-200 text-gray-700",
        "In Progress": "bg-blue-100 text-blue-700",
        "Completed": "bg-green-100 text-green-700",
        "On Hold": "bg-yellow-100 text-yellow-700",
        "Delayed": "bg-orange-100 text-orange-700",
        "At Risk": "bg-red-100 text-red-700",
    };

     const [showEditModel, setShowEditModel] = useState(false);
     const [showSubGoals, setShowSubGoals] = useState(false);
    return (
        
        <div className={`bg-white w-full rounded-lg border p-4 ${showSubGoals && "shadow-xl"}`} onClick={()=> setShowSubGoals(prev => !prev)}>
            <div className='flex justify-between'>
                <span className='text-blue-600 font-medium text-lg'>{data.goal}</span>
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
                <hr className='mt-2'/>
                <div className='flex  mt-2 space-x-4 items-center w-full'>
                    {data.subgoals.length >0 && <ChevronDown className={`${showSubGoals && "rotate-180"}`} onClick={()=> setShowSubGoals(prev => !prev)} />}
                    <button className='ml-auto text-gray-500 font-medium bg-gray-500/20 rounded-lg px-2 py-1' onClick={()=> setShowEditModel(true)}>Edit</button>
                    <button className='text-red-500 font-medium bg-red-500/20 rounded-lg px-2 py-1'>Delete</button>
                </div>
                
                { showSubGoals &&
                    data.subgoals.map((subgoal) => (
                        <SubGoalMobileCard data={subgoal} />
                    ))
                }

                 {showEditModel &&
                 createPortal(
                    <CreateGoalDialog actionType='Update' defaultData={data} isOpen={showEditModel} onClose={() => setShowEditModel(false)} />
                    , document.body)
                    }
        </div>
    );
};

export default GoalPendingMobileCard;