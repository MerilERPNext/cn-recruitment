import React from 'react'

interface RequestTypeCardProps{
    label: string
}

const RequestTypeCard: React.FC<RequestTypeCardProps> = ({ label }) => {
  return (
    <div className="border px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-center hover:bg-gray-100 cursor-pointer text-sm sm:text-base w-fit max-w-full break-words">
      {label}
    </div>
  );
};

export default RequestTypeCard