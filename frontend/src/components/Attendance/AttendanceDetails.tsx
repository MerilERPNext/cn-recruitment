
import { Check, X } from "lucide-react"
import Avatar from "../shared/Avatar"
import LayoutHeader from "../shared/LayoutHeader"
import { formatDateString } from "../../utils/helperUtils"
import { AttendanceRequest } from "../../types/attendance"



export function AttendanceDetailView({ data, onClose }: { data: AttendanceRequest, onClose: () => void }) {


    return data?.name ? <div className="fixed top-0 z-20 w-full mx-auto left-0 h-screen bg-white">
        <LayoutHeader tab="Attendance Request"
            onBack={() => {
                onClose()
            }}
            icon="x"
        />
        <div className="m-4 bg-white rounded-lg ">

            {/* Employee Info */}
            <div className="py-4 border-b">
                <div className="flex items-center space-x-3">
                    <Avatar name={data?.employee_name} />
                    <div>
                        <h2 className="font-semibold text-gray-900">{data?.employee_name}</h2>
                        <p className="text-sm text-gray-500">{data?.department}</p>
                    </div>
                </div>
            </div>

            {/* Date */}
            <div className="px-2 py-4 border-b">
                <p className="text-sm text-gray-500 mb-1">Date</p>
                <p className="font-medium">{formatDateString(data?.creation)}</p>
            </div>

            {/* Log Details */}
            <div className="py-4 px-2 border-b">
                <p className="text-sm text-gray-500 mb-3">Log Details</p>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                <Check className="h-3 w-3 text-green-600" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">Check In</p>
                                {/* <p className="text-xs text-gray-500">{data?.checkInType}</p> */}
                            </div>
                        </div>
                        {/* <p className="font-medium">{data?.checkIn || "--:--"}</p> */}
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                                <X className="h-3 w-3 text-red-600" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">Check Out</p>
                                {/* <p className="text-xs text-gray-500">{requestData.checkOut}</p> */}
                            </div>
                        </div>
                        {/* <p className="font-medium">{data?.checkOut || "--:--"}</p> */}
                    </div>
                </div>
            </div>

            {/* Reason */}
            <div className="py-4 px-2">
                <p className="text-sm text-gray-500 mb-2">Reason for Request</p>
                <div className="bg-gray-100 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">{data?.reason}</p>
                </div>
            </div>

        </div>
        {/* Action Buttons */}
        <div className="py-4 px-2 flex  fixed bottom-0 w-full  ">

            <div className=" w-full space-x-3 flex bg-white p-2 rounded-xl">
                <button
                    className="bg-red-100 p-2 w-1/2 text-red-700 rounded-md font-semibold"
                // onClick={(e) => handleAction("rejected", e)}
                >
                    Reject
                </button>
                <button
                    className="bg-green-200 p-2 w-1/2 text-green-700 rounded-md font-semibold"
                // onClick={(e) => handleAction("approved", e)}
                >
                    Approve
                </button>
            </div>
        </div>
    </div> : null

}
