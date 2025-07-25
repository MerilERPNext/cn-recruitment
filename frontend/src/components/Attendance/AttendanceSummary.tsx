import { addMonths, format, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, EyeIcon, Clock, Users, Calendar, Shield } from "lucide-react"
import { useState } from "react";
import { useNavigate } from "react-router"

const AttendanceSummary = () => {
    const navigate = useNavigate()
    const [currentDate, setCurrentDate] = useState(new Date());

    const goToPreviousMonth = () => {
        setCurrentDate(prev => subMonths(prev, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(prev => addMonths(prev, 1));
    };
    return (
        <div className="min-h-screen bg-gray-100 p-4">
            {/* Header Card */}
            <div className=" mb-4 ">
                {/* Date Navigation */}
                <div className="flex items-center justify-between mb-4 border-2 bg-white border-gray-200 rounded-2xl shadow-sm p-4">
                    <button
                        className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
                        onClick={goToPreviousMonth}
                    >
                        <ChevronLeft className="h-5 w-5 text-gray-600" />
                    </button>

                    <div className="text-center">
                        <h1 className="text-xl font-bold text-gray-900">
                            {format(currentDate, "MMMM yyyy")}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Attendance Overview</p>
                    </div>

                    <button
                        className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
                        onClick={goToNextMonth}
                    >
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                    </button>
                </div>

                {/* Statistics Grid */}
                <div className="space-y-4  border-2 bg-white border-gray-200 rounded-2xl shadow-sm p-4">
                    <h2 className="text-xl font-semibold ">Quick Summary</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                            <div className="text-2xl font-bold text-gray-900 mb-1">21.0</div>
                            <div className="text-sm text-gray-700 font-medium">Leave Days</div>
                        </div>
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                            <div className="text-2xl font-bold text-gray-900 mb-1">0.0</div>
                            <div className="text-sm text-gray-700 font-medium">Present Days</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                            <div className="text-2xl font-bold text-gray-900 mb-1">0.0</div>
                            <div className="text-sm text-gray-700 font-medium">Absent Days</div>
                        </div>
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                            <div className="text-2xl font-bold text-gray-900 mb-1">00:00</div>
                            <div className="text-sm text-gray-700 font-medium">Avg. Late By</div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900 mb-1">00:00</div>
                            <div className="text-sm text-gray-700 font-medium">Avg. Overtime</div>
                        </div>
                    </div>
                </div>

                {/* Attendance View Button */}
                <div className="mt-4">
                    <button
                        onClick={() => { navigate("/webapp/attendance/emp-attendance/all") }}
                        className="w-full bg-black hover:bg-gray-800 text-white rounded-xl font-semibold flex items-center justify-center gap-3 p-4 transition-all duration-200 shadow-sm hover:shadow-lg">
                        <EyeIcon className="h-5 w-5" />
                        <span>View Detailed Attendance</span>
                    </button>
                </div>
            </div>

            {/* Settings Card */}
            <div className=" border-2 bg-white border-gray-200 rounded-2xl shadow-sm p-4 ">
                <div className="space-y-4">
                    {/* Clock in priority */}
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="p-2 bg-gray-200 rounded-lg">
                            <Clock className="h-4 w-4 text-gray-700" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">Clock in Priority</h3>
                            <p className="text-gray-600 text-sm">Biometric verification required</p>
                        </div>
                    </div>

                    {/* Shift */}
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="p-2 bg-gray-200 rounded-lg">
                            <Users className="h-4 w-4 text-gray-700" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">Current Shift</h3>
                            <p className="text-gray-600 text-sm">General shift schedule</p>
                        </div>
                    </div>

                    {/* Policy */}
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="p-2 bg-gray-200 rounded-lg">
                            <Shield className="h-4 w-4 text-gray-700" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">Active Policies</h3>
                            <div>
                                <button className=" w-full text-left px-3 py-1 text-sm font-medium text-gray-800 hover:text-black hover:bg-gray-100 rounded-lg transition-colors">
                                    GENERAL SHIFT POLICY
                                </button>
                                <button className=" w-full text-left px-3 py-1 text-sm font-medium text-gray-800 hover:text-black hover:bg-gray-100 rounded-lg transition-colors">
                                    GEOFENCING FOR CHECK-IN
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Off */}
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="p-2 bg-gray-200 rounded-lg">
                            <Calendar className="h-4 w-4 text-gray-700" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">Weekly Schedule</h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200">
                                    <span className="text-sm text-gray-600">Weekly Off Pattern</span>
                                    <span className="text-sm font-medium text-gray-900">Physicswallah</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200">
                                    <span className="text-sm text-gray-600">Off Days</span>
                                    <span className="text-sm font-medium text-gray-900">1st, 2nd, 4th Sunday</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AttendanceSummary
