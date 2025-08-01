import { useState, useMemo } from 'react'
import { BulkActionBar } from './BulkActionBar'
import { RequestCard } from './RequestCard'
import { useAllAttendanceRequests } from '../../../hooks/useAttendance'
import { AttendanceRequest } from '../../../types/attendance'
import { AttendanceDetailView } from '../AttendanceDetails'
import { useNavigate } from 'react-router'

const TeamAttendanceDetails = () => {
    const { data = [], isLoading, error, refetch } = useAllAttendanceRequests(5);
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null)
    const { pendingRequests, actionedRequests } = useMemo(() => {
        const pending = data.filter((req) => req.custom_status === "Pending")
        const actioned = data.filter((req) => req.custom_status === "Approved" || req.custom_status === "Rejected")
        return {
            pendingRequests: pending,
            actionedRequests: actioned,
        }
    }, [data])

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        )
    }

    const isSelected = (id: string) => selectedIds.includes(id)

    const selectAll = () => {
        if (selectedIds.length === pendingRequests.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(pendingRequests.map((r) => r.name))
        }
    }
    const navigate = useNavigate()
    if (isLoading) {
        return (
            <>
                <div className="bg-white min-h-screen">
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                            <p className="text-gray-500">Loading attendance requests...</p>
                        </div>
                    </div>
                </div>
            </>
        )
    }

    if (error) {
        return (
            <>
                <div className="bg-white min-h-screen">
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="text-red-500 text-lg mb-2">⚠️</div>
                            <p className="text-gray-600">Error loading attendance requests</p>
                            <p className="text-sm text-gray-500 mt-1">{error.message}</p>
                        </div>
                    </div>
                </div>
            </>
        )
    }

    if (!data || data.length === 0) {
        return (
            <>
                <div className="bg-white min-h-screen">
                    <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="text-center">
                            <div className="text-gray-400 text-6xl mb-4">📋</div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attendance Requests</h3>
                            <p className="text-gray-500 mb-6">There are currently no attendance requests to display.</p>
                            <button
                                onClick={() => {
                                    refetch()
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <div className="bg-white min-h-screen">
                <div className='bg-white'>
                    {/* Pending */}
                    {pendingRequests?.length > 0 && <>
                        <div className="flex justify-between mb-4 p-4">
                            <h2 className=" text-lg font-semibold text-gray-800">Pending Requests</h2>
                            <button
                                onClick={() => { navigate("/webapp/attendance/team-attendance-details/pendings") }}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                            >View All</button>
                        </div>
                        <div className='mb-4 px-4'>
                            <BulkActionBar
                                selectedIds={selectedIds}
                                pendingRequests={pendingRequests}
                                onSelectAll={selectAll}
                                onBulkAction={() => {
                                    console.log("Selected Pending IDs:", selectedIds)
                                    setSelectedIds([])
                                }}
                            />
                        </div>

                        <div className="space-y-3 border-t-1 border-gray-300 pt-2 px-[2px]">
                            {pendingRequests.map((request) => (
                                <RequestCard
                                    key={request.name}
                                    request={request}
                                    isActionedCard={false}
                                    isSelected={isSelected(request.name)}
                                    onToggleSelect={toggleSelect}
                                    onClick={(request) => setSelectedRequest(request)}
                                />
                            ))}
                        </div>
                    </>}

                    {/* Show message when no pending requests */}
                    {pendingRequests?.length === 0 && (
                        <div className="p-4 text-center">
                            <p className="text-gray-500">No pending attendance requests</p>
                        </div>
                    )}
                </div>

                {/* Actioned */}
                <div className='bg-white'>
                    {actionedRequests?.length > 0 && <div>
                        <h2 className="text-lg font-semibold text-gray-800mb-2 border-b-1 border-gray-200 p-4">Actioned Requests</h2>
                        <div className="space-y-3">
                            {actionedRequests.map((request) => (
                                <RequestCard
                                    key={request.name}
                                    request={request}
                                    isActionedCard={true}
                                    onClick={(request) => setSelectedRequest(request)}
                                />
                            ))}
                        </div>
                    </div>}

                    {/* Show message when no actioned requests */}
                    {actionedRequests?.length === 0 && (
                        <div className="p-4 text-center border-t border-gray-200">
                            <p className="text-gray-500">No actioned attendance requests</p>
                        </div>
                    )}
                </div>
            </div>
            {selectedRequest && (
                <AttendanceDetailView
                    data={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                />
            )}
        </>
    )
}

export default TeamAttendanceDetails
