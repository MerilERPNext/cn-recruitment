import React from 'react'
import Avatar from '../../shared/Avatar'

const EmployeeStatusCard = () => {
    return (
        <div className="w-full px-4 py-2 bg-white rounded-xl">
            <div className="flex gap-4 mb-2">
                <Avatar name="E" status="onleave" />
                <div className="">
                    <h5 className="font-semibold line-clamp-2">Ethan Payne</h5>
                    <p className="font-thin text-sm">Present</p>
                </div>
            </div>
            <div className="mb-2 w-full px-4 py-2 bg-gray-100 rounded-xl flex justify-between">
                <div>
                    <p className="text-gray-400 text-sm text-center">Check-in</p>
                    <h5 className="font-semibold">08:58 AM</h5>
                </div>
                <div>
                    <p className="text-gray-400 text-sm text-center">Check-out</p>
                    <h5 className="font-semibold">08:58 PM</h5>
                </div>
            </div>
        </div>
    )
}

export default EmployeeStatusCard
