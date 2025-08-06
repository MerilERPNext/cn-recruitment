import { AttendanceRequest } from "../../../types/attendance"
import Badge from "../../shared/Badge"

const EmpAttendanceRequestCard = ({ data }: { data: AttendanceRequest }) => {

    const getStatus = (status: number) => {
        if (status === 0) {
            return {
                label: 'Draft', statusColor: "bg-yellow-100 text-yellow-800"
            }
        } else if (status === 1) {
            return {
                label: 'Submitted', statusColor: "bg-green-100 text-green-800"
            }
        } else {
            return {
                label: 'Rejected', statusColor: "bg-red-100 text-red-800"
            }
        }
    }
    const status = getStatus(data?.docstatus)


    return (
        <div className="w-full flex border border-gray-100 items-center justify-between gap-3 bg-white shadow-sm rounded-xl">
            <div className="px-4 py-2 w-full">
                <div className=" flex items-center justify-between gap-1">
                    <div>
                        <div className="font-medium text-gray-900">
                            {data?.creation
                                ? new Date(data.creation).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                })
                                : "N/A"}
                        </div>
                        <div className="text-sm text-gray-600">{data?.reason}</div>
                    </div>
                    <Badge backgroundColor={status?.statusColor} label={status?.label} />
                </div>
            </div>
        </div>
    )
}

export default EmpAttendanceRequestCard
