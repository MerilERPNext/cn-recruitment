
import { RequestCardProps } from "../../../types/attendance"
import Avatar from "../../shared/Avatar"
import Badge from "../../shared/Badge"


export function RequestCard({
    request,
    isActionedCard = false,
    isSelected = false,
    onToggleSelect,
    onClick,
}: RequestCardProps & {
    isSelected?: boolean
    onToggleSelect?: (id: string) => void
    onClick?: (request: RequestCardProps['request']) => void
}) {
    return (
        <div className="cursor-pointer bg-white border-b-2 border-gray-100 rounded-lg"
            onClick={() => onClick?.(request)}
        >
            <div className="p-4">
                <div className="flex justify-start items-start gap-2 w-full">
                    {!isActionedCard && (
                        <input
                            type="checkbox"
                            className="mt-2"
                            checked={isSelected}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                            onChange={() => onToggleSelect?.(request?.name)}
                        />
                    )}                    <div className="w-full">
                        <div className="flex items-start space-x-3">
                            <Avatar name={request.name} />

                            <div className="flex-1">
                                <div className="flex items-center justify-between ">
                                    <h3 className="font-semibold text-sm">{request.name}</h3>
                                    <Badge label="Pending" backgroundColor="bg-yellow-100 text-yellow-800" />
                                </div>
                                <p className="text-sm text-gray-500 mb-2">{request.from_date}</p>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-1"><span className="font-semibold">Reason:</span> {request.reason}</p>
                        {!isActionedCard && <div className="flex space-x-2 mt-2">
                            <button
                                className="bg-red-100 p-2 w-1/2 text-red-700 rounded-xl font-semibold"
                            // onClick={(e) => handleAction("rejected", e)}
                            >
                                Reject
                            </button>
                            <button
                                className="bg-green-100 p-2 w-1/2 text-green-700 rounded-xl font-semibold"
                            // onClick={(e) => handleAction("approved", e)}
                            >
                                Approve
                            </button>
                        </div>}
                    </div>
                </div>
            </div>

        </div>
    )
}
