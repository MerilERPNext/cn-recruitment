import React from 'react';

interface GoalPlanCardProps {
  title: string;
  data: number | string;
  icon: React.JSX.Element;
  description?: string;
}

const GoalPlanCard: React.FC<GoalPlanCardProps> = ({ title, data = "_", icon, description }) => {
  return (
    <div className='group bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 ease-in-out w-full flex justify-between items-start'>
      
      <div className='flex flex-col justify-between h-full space-y-4'>
        <div>
          <h2 className="text-gray-500 text-xs font-bold uppercase tracking-wider">
            {title}
          </h2>
          <span className='text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight mt-2 block'>
            {data}
          </span>
        </div>
        
        {description && (
          <p className='text-sm font-medium text-gray-400 group-hover:text-gray-500 transition-colors'>
            {description}
          </p>
        )}
      </div>

      <div className='flex items-center justify-center p-3 bg-gray-50 rounded-xl text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors duration-300'>
        {icon}
      </div>
      
    </div>
  );
};

export default GoalPlanCard;