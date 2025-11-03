import { Eye, Funnel, Search, Settings } from 'lucide-react'
import React from 'react'

interface CommonSearchAndActionsProps{
    hideEyeIcon?: boolean
}
const CommonSearchAndActions: React.FC<CommonSearchAndActionsProps> = (
    {hideEyeIcon = false}
) => {
  return (
     <div className="mt-4 mb-4 flex justify-between items-center flex-wrap gap-4">
          <div className="relative w-full max-w-[48rem]">
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 cursor-pointer  border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          <div className='flex items-center gap-x-2'>
            < Funnel className="rounded-lg p-2 w-10 h-10 bg-white border  hover:bg-slate-100 text-gray-800 cursor-pointer" />
           {!hideEyeIcon && <Eye className="rounded-lg p-2 w-10 h-10 bg-white border  hover:bg-slate-100 text-gray-800 cursor-pointer" />}
            <Settings className="rounded-lg p-2 w-10 h-10 bg-white border  hover:bg-slate-100 text-gray-800 cursor-pointer" />
          </div>
        </div>
  )
}

export default CommonSearchAndActions