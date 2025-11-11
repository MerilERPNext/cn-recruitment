import React from 'react';
import GoalPlanCard from './GoalPlanCard';
import { Award, Flag, Goal } from 'lucide-react';
import GoalPendingApprovalTable from './GoalPendingApprovalTable';
import { useScreenSize } from '../../../hooks/useScreenSize';
import GoalPendingMobileCard from './GoalPendingMobileCard';

const dummyCardsData =  [
    {
      title: "Total Goals",
      static: "12",
      description: "+2 from last month"
    },{
        title: "Total Sub Goals",
        static: "45",
        description: "Tasks within goals"
    },{
        title: "Average Achievement",
        static: "78.50%",
        description: "Progress across all goals"
    }
  ];

const Icons = [<Flag className='w-12 h-12 rounded-lg bg-purple-100 p-3'/>, 
               <Goal className='w-12 h-12 rounded-lg bg-blue-100 p-3' />, 
               <Award className='w-12 h-12 rounded-lg bg-green-100 p-3'/>];


const tableDummyData = [
  {
    goal: "Implement New Marketing Strategy",
    status: "pending",
    achievment: "75%",
    weightage: "100%",
    last_updated: "2025-11-01",
  },
  {
    goal: "Redesign Company Website",
    status: "progress",
    achievment: "40%",
    weightage: "80%",
    last_updated: "2025-11-03",
  },
  {
    goal: "Launch Social Media Campaign",
    status: "completed",
    achievment: "100%",
    weightage: "60%",
    last_updated: "2025-10-28",
  },
  {
    goal: "Optimize Email Marketing",
    status: "pending",
    achievment: "20%",
    weightage: "50%",
    last_updated: "2025-11-05",
  },
  {
    goal: "Conduct Customer Feedback Survey",
    status: "progress",
    achievment: "55%",
    weightage: "70%",
    last_updated: "2025-11-02",
  },
];

const NewGoalPlan: React.FC = () => {
  const { isDesktop } = useScreenSize();
  return (
    <div className='sm:px-8 px-4 pt-8 pb-8'>
      <div className='grid xl:grid-cols-3 sm:grid-cols-2 grid-cols-1 sm:gap-8 gap-4 max-sm:px-4'>
        {dummyCardsData.map(((data, i) => (
          <GoalPlanCard key={data.title} data={data} icon={Icons[i]} />
        )))}
      </div>

      <div className='bg-white lg:p-8 px-4 rounded-xl mt-8'>
        <div className='flex justify-between mb-4'>
         <h3 className='sm:text-xl text-lg font-semibold text-gray-900'>Goals Pending Approval</h3>
         <button className='text-gray-500 bg-gray-100 rounded-lg px-4 sm:py-2 whitespace-nowrap cursor-pointer hover:bg-gray-200'>+ Add Goal</button>
         </div>
         {isDesktop ?
          <GoalPendingApprovalTable tableData={tableDummyData} />
          :
          <div className='flex flex-col gap-3'>
            {tableDummyData.map(data =>(
              <GoalPendingMobileCard data={data} />
            ))}
          </div>
         }
      </div>
    </div>
  );
};

export default NewGoalPlan;