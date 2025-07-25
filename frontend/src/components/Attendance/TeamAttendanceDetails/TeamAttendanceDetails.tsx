import { useState, useMemo } from 'react'
import { BulkActionBar } from './BulkActionBar'
import { RequestCard } from './RequestCard'
import { useAllAttendanceRequests } from '../../../hooks/useAttendance'
import { AttendanceRequest } from '../../../types/attendance'
import { AttendanceDetailView } from '../AttendanceDetails'
import { useNavigate } from 'react-router'
import LayoutHeader from '../../shared/LayoutHeader'

const TeamAttendanceDetails = () => {
    const { data = [] } = useAllAttendanceRequests(5) as { data: AttendanceRequest[] }
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null)
    const { pendingRequests, actionedRequests } = useMemo(() => {
        const pending = data.filter((req) => req.docstatus === 0)
        const actioned = data.filter((req) => req.docstatus === 1)
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
    return (
        <>
            <LayoutHeader tab='Team  Attendance Details' />
            <div className="bg-white">
                <div className='bg-white'>
                    {/* Pending */}

                    {pendingRequests?.length > 0 && <>
                        <div className="flex justify-between mb-4 p-4">
                            <h2 className="text-2xl font-semibold">Pending Requests</h2>
                            <button
                                onClick={() => { navigate("/webapp/attendance/team-attendance-details/pendings") }}
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

                        <div className="space-y-3 border-t-1 border-gray-300 pt-2">
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
                    </>
                    }
                </div>

                {/* Actioned */}
                <div className='bg-white'>

                    {actionedRequests?.length > 0 && <div>
                        <h2 className="text-2xl font-semibold mb-2 border-b-1 border-gray-200 p-4">Actioned Requests</h2>
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
                </div>
            </div >
            {selectedRequest && (
                <AttendanceDetailView
                    data={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                />
            )
            }
        </>
    )
}

export default TeamAttendanceDetails
