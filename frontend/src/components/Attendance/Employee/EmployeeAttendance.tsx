import { useState } from "react"
import LayoutHeader from "../../shared/LayoutHeader"
import DatePicker from "react-datepicker"
import { Plus } from "lucide-react"
import AttendanceRequestCard from "./AttendanceRequestCard"
import { timeSinceFormatted } from "../../../utils/helperUtils"

const EmployeeAttendance = () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(2025, 6, 17))
    const attendanceRequests = [
        {
            date: "Oct 26, 2024",
            type: "Check-In Correction",
            status: "Approved",
            statusColor: "bg-green-100 text-green-800",
        },
        {
            date: "Oct 25, 2024",
            type: "Check-Out Correction",
            status: "Pending",
            statusColor: "bg-yellow-100 text-yellow-800",
        },
        {
            date: "Oct 24, 2024",
            type: "Check-In Correction",
            status: "Rejected",
            statusColor: "bg-red-100 text-red-800",
        },
    ]

    const getAttendanceStatus = (date: Date) => {
        const day = date.getDate()
        const presentDays = [1, 2, 7, 8, 9, 14, 15, 16, 21, 22, 28, 29]
        const absentDays = [3, 10, 17, 24, 31]
        const halfDays = [4, 11, 18, 25]
        const holidays = [5, 12, 19, 26]

        if (presentDays.includes(day)) return "present"
        if (absentDays.includes(day)) return "absent"
        if (halfDays.includes(day)) return "half-day"
        if (holidays.includes(day)) return "holiday"
        return "default"
    }

    return <div>
        <LayoutHeader tab="Attendance" />
        <div className="flex flex-col gap-4 mt-2 px-4 pb-4">

            {/* ------------------------------------------------- Info Card Start---------------------------------------------- */}

            <div className="p-4 border-2 border-gray-200 rounded-xl bg-white">
                <h1 className="text-lg font-semibold text-gray-900 mb-4">Today's Attendance</h1>

                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm text-gray-600">Check-In</div>
                        <div className="text-lg font-semibold text-gray-900">09:02 AM</div>
                    </div>

                    <div>
                        <div className="text-sm text-gray-600">Work Hours</div>
                        <div className="text-lg font-semibold text-gray-900">{timeSinceFormatted(new Date(2025, 6, 18)) || "-:-"}</div>
                    </div>

                    <button className="bg-blue-100 hover:bg-blue-200 px-6 py-2">Check Out</button>
                </div>
            </div>
            {/* ------------------------------------------------- Info Card End---------------------------------------------- */}
            {/* ------------------------------------------------- Calendar Start ---------------------------------------------- */}

            <div className="mb-2 w-full  pb-2 border-2 border-gray-200 rounded-xl">
                <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    inline
                    dayClassName={(date) => {
                        const status = getAttendanceStatus(date)
                        const baseClasses = "transition-colors duration-200"

                        switch (status) {
                            case "present":
                                return `${baseClasses} !bg-green-100 !text-green-800 border border-green-200`
                            case "absent":
                                return `${baseClasses} !bg-red-100 !text-red-800 border border-red-200`
                            case "half-day":
                                return `${baseClasses} !bg-yellow-100 !text-yellow-800 border border-yellow-200`
                            case "holiday":
                                return `${baseClasses} !bg-blue-100 !text-blue-800 border border-blue-200`
                            default:
                                return `${baseClasses} hover:!bg-gray-100 !text-gray-700`
                        }
                    }}
                />
                <div className="flex flex-wrap gap-4 text-xs text-gray-600 justify-end px-4">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-100 border border-green-200"></div>
                        <span>Present</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200"></div>
                        <span>Absent</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-200"></div>
                        <span>Half Day</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-200"></div>
                        <span>Holiday</span>
                    </div>
                </div>
            </div>
            {/* Legend */}


            {/* ------------------------------------------------- Calendar End---------------------------------------------- */}

            {/* Request Attendance Correction */}
            <button className="w-full text-gray-700 font-bold border-gray-300 bg-transparent flex justify-center items-center p-2">
                <Plus className="w-5 h-5 mr-2 font-bold" />
                Request Attendance Correction
            </button>
            {/* Request Attendance Correction */}



            {/* Work Hour Exceptions */}
            <h3 className="text-lg font-semibold text-gray-900">Work Hour Exceptions</h3>
            <div className="flex gap-3">
                <button className="flex-1 text-gray-700 font-bold border-gray-300 bg-transparent flex justify-center items-center p-2">
                    <Plus className="w-4 h-4 mr-2 font-bold" />
                    Request Comp Off
                </button>
                <button className="flex-1 text-gray-700 font-bold border-gray-300 bg-transparent flex justify-center items-center p-2">
                    <Plus className="w-4 h-4 mr-2 font-bold" />
                    Request Overtime
                </button>
            </div>
            {/* Work Hour Exceptions */}

            {/* My Attendance Requests */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">My Attendance Requests</h3>
                <div className="space-y-2">
                    {attendanceRequests.map((request, index) => (
                        <AttendanceRequestCard
                            date={request.date}
                            status={request.status}
                            statusColor={request.statusColor}
                            type={request.type}
                            key={request.date + index}

                        />
                    ))}
                </div>
            </div>
            {/* My Attendance Requests */}
        </div>
    </div >

}

export default EmployeeAttendance
