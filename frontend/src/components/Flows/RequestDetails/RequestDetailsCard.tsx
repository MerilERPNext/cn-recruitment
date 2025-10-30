import React from 'react'
import Badge from '../../shared/Badge';

type StageDataType = {
  stageNumber: number
  stageName: string
  assignedTo: string
  actionTakenBy: string
  status: string
  triggerDate: string // ISO date string (e.g. "2025-10-09")
  dueDate: string
  completedDate?: string | null
  actions: string
};

interface RequestDetailsCardProps {
  data: StageDataType;
}

const RequestDetailsCard : React.FC<RequestDetailsCardProps> = ({
  data
}) => {

  const getBadgeColor = (status: string): string => {
    switch (status) {
      case 'Completed':
      return 'text-green-700 bg-green-100';
      case 'Pending':
      return 'text-yellow-700 bg-yellow-100';
      case 'Failed':
      return 'text-red-700 bg-red-100';
      default:
      return 'text-gray-700 bg-gray-100';
    }
  };
  return (
    <div className="p-4 border border-300 rounded-lg m-2">
      <div className="grid gap-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-gray-600 inline-block">Stage {data.stageNumber}</span>
        <h2 className="text-lg font-medium mr-auto text-center flex-1">{data.stageName}</h2>
        <Badge label={data.status} size="sm" textColor={getBadgeColor(data.status)} />
      </div>
      

      <div className="flex flex-col text-center">
        <div className="flex justify-between">
          <div>
          <span className="text-xs text-gray-500">Assigned To</span>
          <p className="text-gray-800">{data.assignedTo}</p>
          </div>
          
          <div>
          <span className="text-xs text-gray-500">Action Taken By</span>
          <p className="text-gray-800">{data.actionTakenBy}</p>
          </div>
          

        <div>
          <span className="text-xs text-gray-500">Actions</span>
          <p className="text-sm text-gray-800">{data.actions}</p>
        </div>
       </div>

       <div className="flex justify-between">
            <div>
            <span className="text-xs text-gray-500">Trigger Date</span>
            <p className="text-gray-800">{new Date(data.triggerDate).toLocaleDateString()}</p>
            </div>
            
            <div>
            <span className="text-xs text-gray-500">Due Date</span>
            <p className="text-gray-800">{new Date(data.dueDate).toLocaleDateString()}</p>
            </div>
            
            {data.completedDate && (
            <div>
              <span className="text-xs text-gray-500">Completed Date</span>
              <p className="text-gray-800">{new Date(data.completedDate).toLocaleDateString()}</p>
            </div>
        )}
        </div>
      </div>

      </div>
    </div>
  )
}

export default RequestDetailsCard;