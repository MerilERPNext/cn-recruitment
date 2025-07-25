import { AttendanceRequest } from "../../../types/attendance"
import { formatDateToYYYYMMDD } from "../../../utils/helperUtils"
import Badge from "../../shared/Badge"

const AttendanceRequestCard = ({ data }: { data: AttendanceRequest }) => {

    const getStatus = (status: number) => {
        if (status === 0) {
            return {
                label: 'Draft', statusColor: "text-yellow-500"
            }
        } else if (status === 1) {
            return {
                label: 'Submitted', statusColor: "text-green-500"
            }
        } else {
            return {
                label: 'Rejected', statusColor: "text-red-500"
            }
        }
    }
    const status = getStatus(data?.docstatus)


    return (
        <div className="border-b border-gray-200">
            <div className="px-4 py-2">
                <div className="flex items-center justify-between gap-1">
                    <div>
                        <div className="font-medium text-gray-900">
                            {data?.modified
                                ? formatDateToYYYYMMDD(new Date(data?.modified))
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

export default AttendanceRequestCard
