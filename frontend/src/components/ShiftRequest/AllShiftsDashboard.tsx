import React, { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- TYPE DEFINITIONS ---
interface ApprovalRequest {
    name: string;
    shift_type: string;
    employee: string;
    employee_name: string;
    status: string;
    from_date: string;
    to_date: string;
    approver: string;
}

interface TeamShift {
    name: string;
    employee: string;
    employee_name: string;
    shift_type: string;
    start_date: string;
    end_date: string;
    status: string;
    modified: string;
}

interface MyShift {
    id: number;
    date: string;
    time: string;
    status: string;
}

export const approvalQueueData: ApprovalRequest[] = [
    {
        name: "HR-SHR-25-08-00003",
        shift_type: "SH_94",
        employee: "37008",
        employee_name: "Ambreen F",
        status: "Approved",
        from_date: "2025-08-30",
        to_date: "2025-08-30",
        approver: "ambreen@test.com",
    },
    {
        name: "HR-SHR-25-08-00004",
        shift_type: "SH_95",
        employee: "37009",
        employee_name: "John Doe",
        status: "Pending",
        from_date: "2025-09-01",
        to_date: "2025-09-02",
        approver: "john@test.com",
    },
    {
        name: "HR-SHR-25-08-00003",
        shift_type: "SH_94",
        employee: "37008",
        employee_name: "Ambreen F",
        status: "Rejected",
        from_date: "2025-08-30",
        to_date: "2025-08-30",
        approver: "ambreen@test.com",
    },
    {
        name: "HR-SHR-25-08-00004",
        shift_type: "SH_95",
        employee: "37009",
        employee_name: "John Doe",
        status: "Completed",
        from_date: "2025-09-01",
        to_date: "2025-09-02",
        approver: "john@test.com",
    },
    {
        name: "HR-SHR-25-08-00003",
        shift_type: "SH_94",
        employee: "37008",
        employee_name: "Ambreen F",
        status: "Approved",
        from_date: "2025-08-30",
        to_date: "2025-08-30",
        approver: "ambreen@test.com",
    },
    {
        name: "HR-SHR-25-08-00004",
        shift_type: "SH_95",
        employee: "37009",
        employee_name: "John Doe",
        status: "Pending",
        from_date: "2025-09-01",
        to_date: "2025-09-02",
        approver: "john@test.com",
    },
    {
        name: "HR-SHR-25-08-00003",
        shift_type: "SH_94",
        employee: "37008",
        employee_name: "Ambreen F",
        status: "Rejected",
        from_date: "2025-08-30",
        to_date: "2025-08-30",
        approver: "ambreen@test.com",
    },
    {
        name: "HR-SHR-25-08-00004",
        shift_type: "SH_95",
        employee: "37009",
        employee_name: "John Doe",
        status: "Completed",
        from_date: "2025-09-01",
        to_date: "2025-09-02",
        approver: "john@test.com",
    },
    {
        name: "HR-SHR-25-08-00003",
        shift_type: "SH_94",
        employee: "37008",
        employee_name: "Ambreen F",
        status: "Approved",
        from_date: "2025-08-30",
        to_date: "2025-08-30",
        approver: "ambreen@test.com",
    },
    {
        name: "HR-SHR-25-08-00004",
        shift_type: "SH_95",
        employee: "37009",
        employee_name: "John Doe",
        status: "Pending",
        from_date: "2025-09-01",
        to_date: "2025-09-02",
        approver: "john@test.com",
    },
    {
        name: "HR-SHR-25-08-00003",
        shift_type: "SH_94",
        employee: "37008",
        employee_name: "Ambreen F",
        status: "Rejected",
        from_date: "2025-08-30",
        to_date: "2025-08-30",
        approver: "ambreen@test.com",
    },
    {
        name: "HR-SHR-25-08-00004",
        shift_type: "SH_95",
        employee: "37009",
        employee_name: "John Doe",
        status: "Completed",
        from_date: "2025-09-01",
        to_date: "2025-09-02",
        approver: "john@test.com",
    },
];

export const teamShiftsData: TeamShift[] = [
        {
        name: "HR-SHA-25-09-00137",
        employee: "1105742",
        employee_name: "Brittany Janet Foley",
        shift_type: "SH_1",
        start_date: "2025-11-23",
        end_date: "2025-11-26",
        status: "Rejected",
        modified: "2025-09-03 15:00:43.739532",
    },
    {
        name: "HR-SHA-25-09-00138",
        employee: "1105742",
        employee_name: "Brittany Janet Foley",
        shift_type: "SH_1",
        start_date: "2025-11-30",
        end_date: "2025-12-03",
        status: "Approved",
        modified: "2025-09-03 15:00:43.920997",
    },
    {
        name: "HR-SHA-25-09-00136",
        employee: "1105742",
        employee_name: "Brittany Janet Foley",
        shift_type: "SH_1",
        start_date: "2025-11-16",
        end_date: "2025-11-19",
        status: "Completed",
        modified: "2025-09-03 15:00:43.559538",
    },
    {
        name: "HR-SHA-25-09-00138",
        employee: "1105742",
        employee_name: "Brittany Janet Foley",
        shift_type: "SH_1",
        start_date: "2025-11-30",
        end_date: "2025-12-03",
        status: "Approved",
        modified: "2025-09-03 15:00:43.920997",
    },
    {
        name: "HR-SHA-25-09-00137",
        employee: "1105742",
        employee_name: "Brittany Janet Foley",
        shift_type: "SH_1",
        start_date: "2025-11-23",
        end_date: "2025-11-26",
        status: "Rejected",
        modified: "2025-09-03 15:00:43.739532",
    },
    {
        name: "HR-SHA-25-09-00136",
        employee: "1105742",
        employee_name: "Brittany Janet Foley",
        shift_type: "SH_1",
        start_date: "2025-11-16",
        end_date: "2025-11-19",
        status: "Completed",
        modified: "2025-09-03 15:00:43.559538",
    },
];

export const myShiftsData: MyShift[] = [
    { id: 5, date: '2025-09-10', time: '11:00 AM - 07:00 PM', status: 'Approved' },
    { id: 6, date: '2025-09-12', time: '08:00 AM - 04:00 PM', status: 'Approved' },
    { id: 1, date: '2025-08-29', time: '10:00 AM - 06:00 PM', status: 'Pending' },
    { id: 2, date: '2025-08-28', time: '09:00 AM - 05:00 PM', status: 'Approved' },
    { id: 3, date: '2025-07-21', time: '08:00 AM - 04:00 PM', status: 'Completed' },
    { id: 4, date: '2025-07-15', time: '09:00 AM - 05:00 PM', status: 'Completed' },
];

// --- HELPER COMPONENTS ---
export const StatusBadge = ({ status }: { status: string }) => {
    const baseStyle = 'text-xs font-medium px-2.5 py-1 rounded-full';
    const statusStyles: { [key: string]: string } = {
        'Approved': 'bg-green-100 text-green-800',
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Rejected': 'bg-red-100 text-red-800',
        'Completed': 'bg-blue-100 text-blue-800',
    };
    return <span className={`${baseStyle} ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
};

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>{children}</div>
);

const CardHeader = ({ title, onSeeAll }: { title: string; onSeeAll: () => void }) => (
    <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <button onClick={onSeeAll} className="text-gray-500 hover:text-gray-800 transition-colors" title="See All">
            <ExternalLink size={18} />
        </button>
    </div>
);

// // // --- UI SECTIONS ---

const ApprovalRejectionQueue = ({ maxItems = 9 }: { maxItems?: number }) => {
    const navigate = useNavigate();

    const sortedData = useMemo(
        () =>
            [...approvalQueueData].sort(
                (a, b) =>
                    new Date(b.from_date).getTime() -
                    new Date(a.from_date).getTime()
            ),
        []
    );

    return (
        <Card>
            <CardHeader
                title="Shift Change Request"
                onSeeAll={() =>
                    navigate("/webapp/shift-request/all-shift-change-request")
                }
            />

            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                {/* Header */}
                <div className="grid grid-cols-6 gap-4 px-6 h-12 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                    <span className="text-xs font-semibold text-gray-500 flex items-center">
                        EMPLOYEE
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center">
                        SHIFT TYPE
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center">
                        STATUS
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center">
                        START DATE
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center">
                        END DATE
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center justify-center">
                        ACTIONS
                    </span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-200">
                    {sortedData.slice(0, maxItems).map((item) => (
                        <div
                            key={item.name}
                            className="grid grid-cols-6 gap-4 items-center px-6 h-14 hover:bg-gray-50 transition-colors"
                        >
                            <div className="font-medium text-gray-900 truncate">
                                {item.employee_name}
                            </div>
                            <div className="text-gray-700 truncate">
                                {item.shift_type}
                            </div>
                            <div>
                                    <StatusBadge status={item.status} />
                            </div>
                            <div className="text-gray-600">{item.from_date}</div>
                            <div className="text-gray-600">{item.to_date}</div>
                            <div className="flex justify-end items-center space-x-2">
                                <button className="px-3 py-1.5 text-xs font-medium rounded-lg text-green-600 bg-green-100 hover:bg-green-200 transition">
                                    Approve
                                </button>
                                <button className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 bg-red-100 hover:bg-red-200 transition">
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
};

const TeamShiftList = ({ maxItems = 4 }: { maxItems?: number }) => {
    const navigate = useNavigate();

    const sortedData = useMemo(
        () =>
            [...teamShiftsData].sort(
                (a, b) =>
                    new Date(b.start_date).getTime() -
                    new Date(a.start_date).getTime()
            ),
        []
    );

    return (
        <Card>
            <CardHeader
                title="Team Shift List"
                onSeeAll={() => navigate("/webapp/shift-request/all-team-shifts")}
            />

            <ul className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                {sortedData.slice(0, maxItems).map((item) => (
                    <li
                        key={item.name}
                        className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition"
                    >
                        {/* Left section */}
                        <div>
                            <p className="font-medium text-gray-900">
                                {item.employee_name}
                            </p>
                            <p className="text-sm text-gray-600">
                                {item.start_date}{" "}
                                →{" "}
                                {item.end_date}
                            </p>
                        </div>

                        {/* Right section */}
                        <StatusBadge status={item.status} />
                    </li>
                ))}
            </ul>
        </Card>
    );
};

const MyShifts = ({ maxItems = 4 }: { maxItems?: number }) => {
    const navigate = useNavigate();
    const today = new Date('2025-08-25'); // Fixed date for demo
    const { upcoming, past } = useMemo(() => {
        const upcomingShifts = myShiftsData
            .filter(shift => new Date(shift.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const pastShifts = myShiftsData
            .filter(shift => new Date(shift.date) < today)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { upcoming: upcomingShifts, past: pastShifts };
    }, []);
    const ShiftListItem = ({ shift }: { shift: MyShift }) => (
        <li className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
            <p className="text-sm text-gray-700">
                {new Date(shift.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {shift.time}
            </p>
            <StatusBadge status={shift.status} />
        </li>
    );
    return (
        <Card>
            <CardHeader
                title="My Shifts"
                onSeeAll={() => navigate('/webapp/shift-request/all-my-shifts')}
            />
            <div className="space-y-5">
                <div>
                    <h3 className="font-semibold text-gray-600 mb-3">Upcoming</h3>
                    <ul className="space-y-2">
                        {upcoming.slice(0, maxItems).map(shift => <ShiftListItem key={shift.id} shift={shift} />)}
                    </ul>
                </div>
                <div>
                    <h3 className="font-semibold text-gray-600 mb-3">Past</h3>
                    <ul className="space-y-2">
                        {past.slice(0, maxItems).map(shift => <ShiftListItem key={shift.id} shift={shift} />)}
                    </ul>
                </div>
            </div>
        </Card>
    );
};

// --- MAIN DASHBOARD COMPONENT ---
export default function AllShiftsDashboard() {
    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <main className="p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Approval Queue */}
                    <div className="lg:col-span-2">
                        <ApprovalRejectionQueue maxItems={11} />
                    </div>
                    {/* Right Column: Team Shift & My Shifts */}
                    <div className="space-y-6">
                        <TeamShiftList maxItems={3} />
                        <MyShifts maxItems={2} />
                    </div>
                </div>
            </main>
        </div>
    );
}

