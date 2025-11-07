import React from 'react';

const OverviewCard: React.FC<{data: any, icon: React.JSX.Element}> = ({data, icon}) => {
  return (
    <div className='bg-white rounded-xl shadow-sm w-full lg:h-52 h-40 lg:p-8 p-5 border flex justify-between hover:shadow-lg transition-shadow duration-200'>
        <div className='h-full'>
            <h2 className="text-gray-400 text-lg font-semibold">{data.title}</h2>
               <span className='xl:text-5xl text-4xl lg:mt-8 mt-4 block font-bold'>{data.static}</span>
                <p className='text-base mt-2 text-gray-400'>{data.description}</p>
        </div>
        {icon }
    </div>
  );
};

export default OverviewCard;