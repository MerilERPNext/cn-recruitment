import { useMemo, useState } from "react"
import LayoutHeader from "../../shared/LayoutHeader"
import DatePicker from "react-datepicker"
import { ArrowLeft, Plus, XCircle } from "lucide-react"
import { useLoggedInUser } from "../../../hooks/useLoggedInUser"
import { useAttendance } from "../../../hooks/useAttendance"
import FrappeListView from "../../ListView"
import { Attendance } from "../../../types/attendance"
import { useNavigate } from "react-router"
import EmpAttendanceRequestCard from "./EmpAttendanceRequestCard"
import AttndanceRequestForm from "../AttendanceRequest/AttendanceRequestForm"
import RequestCompOff from "./RequestCompOff"

const EmployeeAttendance = () => {
    const navigate = useNavigate()
    const { data: userId } = useLoggedInUser();
    const filters = userId ? [["owner", "=", userId]] : [];
    const { data: allAttendance, isError, error } = useAttendance(filters as any, {
        enabled: !!userId,
    });
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
    const todayAttendance = allAttendance?.filter((record) => record.attendance_date === today)?.[0];
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(2025, 6, 17))
    const [showReqAttendanceCorrection, setShowReqAttendanceCorrection] = useState<boolean>(false)
    const [showReqCompOff, setShowReqCompOff] = useState<boolean>(false)
    type Status = | "present"
        | "absent"
        | "on-leave"
        | "half-day"
        | "work-from-home"
        | "default";

    const createAttendanceStatusGetter = (attendances: Attendance[] = []) => {
        const statusMap: Record<string, Status> = {};

        attendances.forEach((record) => {
            const dateKey = new Date(record.attendance_date).toISOString().split("T")[0];
            const rawStatus = record.status?.toLowerCase().trim();

            let status: Status = "default";
            switch (rawStatus) {
                case "present":
                    status = "present";
                    break;
                case "absent":
                    status = "absent";
                    break;
                case "on leave":
                case "leave":
                    status = "on-leave";
                    break;
                case "half day":
                case "half-day":
                    status = "half-day";
                    break;
                case "work from home":
                case "wfh":
                    status = "work-from-home";
                    break;
                default:
                    status = "default";
            }

            statusMap[dateKey] = status;
        });

        return (date: Date): Status => {
            const key = date.toISOString().split("T")[0];
            return statusMap[key] || "default";
        };
    };


    const getAttendanceStatus = useMemo(() => {
        return createAttendanceStatusGetter(allAttendance ?? []);
    }, [allAttendance]);



    if (isError) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-4">
                    <XCircle className="w-12 h-12 text-black mx-auto" />
                    <h2 className="text-xl font-semibold text-black">Error Loading Attendances</h2>
                    <p className="text-gray-600">{error?.message}</p>
                    <button
                        onClick={() => {
                            navigate(-1)
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                </div>
            </div>
        )
    }
    const defaultFilters = useMemo(() => {
        if (!userId) return undefined;
        return { owner: userId };
    }, [userId]);

    return <div>
        <LayoutHeader tab="Attendance" />
        <div className="flex flex-col gap-4 mt-2 px-4 pb-4">

            {/* ------------------------------------------------- Info Card Start---------------------------------------------- */}

            <div className="p-4 border-2 border-gray-200 rounded-xl bg-white">
                <h1 className="text-lg font-semibold text-gray-900 mb-4">Today's Attendance</h1>

                <div className="flex items-center justify-between gap-1">
                    <div>
                        <div className="text-sm text-gray-600">Check-In</div>
                        <div className="text-lg font-semibold text-gray-900">{todayAttendance?.in_time || "-- --"}</div>
                    </div>

                    <div>
                        <div className="text-sm text-gray-600">Work Hours</div>
                        <div className="text-lg font-semibold text-gray-900">{todayAttendance?.working_hours || "-- --"}</div>
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
                        const status = getAttendanceStatus(date);
                        const isSelected =
                            selectedDate?.toDateString() === date.toDateString(); // check selection
                        const baseClasses = "transition-colors duration-200";

                        const highlightClass = (() => {
                            switch (status) {
                                case "present":
                                    return "!bg-green-100 !text-green-800 border border-green-200";
                                case "absent":
                                    return "!bg-red-100 !text-red-800 border border-red-200";
                                case "on-leave":
                                    return "!bg-orange-100 !text-orange-800 border border-orange-200";
                                case "half-day":
                                    return "!bg-yellow-100 !text-yellow-800 border border-yellow-200";
                                case "work-from-home":
                                    return "!bg-purple-100 !text-purple-800 border border-purple-200";
                                default:
                                    return "hover:!bg-gray-100 !text-gray-700";
                            }
                        })();

                        // Ignore default "selected" styles
                        return `${baseClasses} ${highlightClass} ${isSelected ? "!bg-inherit !text-inherit border-none" : ""}`;
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
                        <div className="w-3 h-3 rounded-full bg-orange-100 border border-orange-200"></div>
                        <span>On Leave</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-200"></div>
                        <span>Half Day</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-purple-100 border border-purple-200"></div>
                        <span>Work From Home</span>
                    </div>
                </div>

            </div>
            {/* Legend */}


            {/* ------------------------------------------------- Calendar End---------------------------------------------- */}

            {/* Request Attendance Correction */}
            <button className="w-full text-gray-700 font-bold border-gray-300 bg-transparent flex justify-center items-center p-2"
                onClick={() => {
                    setShowReqAttendanceCorrection(!showReqAttendanceCorrection)
                }}>
                <Plus className="w-5 h-5 mr-2 font-bold" />
                Request Attendance Correction
            </button>
            {/* Request Attendance Correction */}



            {/* Work Hour Exceptions */}
            <h3 className="text-lg font-semibold text-gray-900">Work Hour Exceptions</h3>
            <div className="flex gap-3">
                <button onClick={() => { setShowReqCompOff(!showReqCompOff) }} className="flex-1 text-gray-700 font-bold border-gray-300 bg-transparent flex justify-center items-center p-2">
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
                <FrappeListView
                    doctype="Attendance Request"
                    isSearch={false}
                    ItemComponent={(props: { item: any }) => {
                        return (
                            <EmpAttendanceRequestCard
                                data={props?.item}
                            />
                        );
                    }}
                    defaultFilters={defaultFilters}
                    showRefereshButton={false}
                    onItemClick={() => { }}
                    infiniteScroll={true}
                    isFilter={false}
                    pageSize={5}
                    defaultFields={[
                        // '*',
                        "reason",
                        // "label",
                        "modified",
                        "creation",
                        "docstatus"
                    ]}
                />


            </div>
            {showReqAttendanceCorrection &&
                <AttndanceRequestForm onClose={() => { setShowReqAttendanceCorrection(false) }} />
            }
            {
                showReqCompOff && <RequestCompOff onClose={() => setShowReqCompOff(false)} />
            }
            {/* My Attendance Requests */}
        </div>
    </div >

}

export default EmployeeAttendance
