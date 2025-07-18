import Badge from "../../shared/Badge"

const AttendanceRequestCard = ({ date, type, status, statusColor }: { date: string, type: string, status: string, statusColor: string }) => {
    return (
        <div className="rounded-xl bg-gray-200">
            <div className="px-4 py-2">
                <div className="flex items-center justify-between gap-1">
                    <div>
                        <div className="font-medium text-gray-900">{date}</div>
                        <div className="text-sm text-gray-600">{type}</div>
                    </div>
                    <Badge backgroundColor={statusColor} label={status} />
                </div>
            </div>
        </div>
    )
}

export default AttendanceRequestCard
