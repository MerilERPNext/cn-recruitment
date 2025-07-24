import { useState } from 'react'
import { useAllAttendanceRequests } from '../../../hooks/useAttendance'
import { AttendanceRequest } from '../../../types/attendance'
import { RequestCard } from './RequestCard'
import { BulkActionBar } from './BulkActionBar'
import { AttendanceDetailView } from '../AttendanceDetails'
import LayoutHeader from '../../shared/LayoutHeader'
import { useNavigate } from 'react-router'

const AllPendingRequests = () => {
    const { data = [] } = useAllAttendanceRequests(20) as { data: AttendanceRequest[] }
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null)
    const navigate = useNavigate()
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        )
    }
    const isSelected = (id: string) => selectedIds.includes(id)
    const selectAll = () => {
        if (selectedIds.length === data.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(data.map((r) => r.name))
        }
    }
    return (<>
        <LayoutHeader tab={"Pending Attendants"} onBack={() => {
            navigate(-1)
        }} />
        <div className='p-2'>

            <BulkActionBar
                selectedIds={selectedIds}
                pendingRequests={data}
                onSelectAll={selectAll}
                onBulkAction={() => {
                    console.log("Selected Pending IDs:", selectedIds)
                    setSelectedIds([])
                }}
            />
            <div className="space-y-3">
                {data.map((request) => (
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
            {selectedRequest && (
                <AttendanceDetailView
                    data={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                />
            )}
        </div>
    </>
    )
}

export default AllPendingRequests
