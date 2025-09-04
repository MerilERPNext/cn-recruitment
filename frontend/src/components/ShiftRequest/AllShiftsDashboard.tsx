import React, { useMemo } from 'react';
import { Check, X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- TYPE DEFINITIONS ---
interface ApprovalRequest {
    id: number;
    employee: string;
    type: string;
    date: string;
    time: string;
}

interface TeamShift {
    id: number;
    name: string;
    date: string;
    time: string;
    status: string;
}

interface MyShift {
    id: number;
    date: string;
    time: string;
    status: string;
}

// --- MOCK DATA ---
export const approvalQueueData: ApprovalRequest[] = [
    { id: 7, employee: 'Mason Rodriguez', type: 'Time Off', date: '2025-09-05', time: '9a-1p' },
    { id: 6, employee: 'Olivia Hayes', type: 'Shift Swap', date: '2025-09-03', time: '12p-8p' },
    { id: 5, employee: 'Liam Carter', type: 'New Shift', date: '2025-09-02', time: '8a-4p' },
    { id: 4, employee: 'Sophia Clark', type: 'Time Off', date: '2025-09-01', time: '1p-5p' },
    { id: 3, employee: 'Ambreen F Bohari', type: 'Shift Change', date: '2025-08-30', time: '9a-5p' },
    { id: 1, employee: 'Ava Morgan', type: 'Time Off', date: '2025-07-24', time: '9a-5p' },
    { id: 2, employee: 'Ethan Bennett', type: 'New Shift', date: '2025-07-21', time: '10a-6p' },
    { id: 8, employee: 'Avad Morgan', type: 'Time Off', date: '2025-07-24', time: '9a-5p' },
    { id: 9, employee: 'Ether Bennett', type: 'New Shift', date: '2025-07-21', time: '10a-6p' },
];

export const teamShiftsData: TeamShift[] = [
    { id: 7, name: 'Nikita Vaidya', date: '2025-08-26', time: '09:00 AM - 05:00 PM', status: 'Pending' },
    { id: 6, name: 'Rajshree Mahajan', date: '2025-08-13', time: '10:00 AM - 06:00 PM', status: 'Approved' },
    { id: 1, name: 'Ava Morgan', date: '2025-07-24', time: '09:00 AM - 05:00 PM', status: 'Pending' },
    { id: 2, name: 'Liam Carter', date: '2025-07-23', time: '11:00 AM - 07:00 PM', status: 'Rejected' },
    { id: 3, name: 'Olivia Hayes', date: '2025-07-22', time: '08:00 AM - 04:00 PM', status: 'Approved' },
    { id: 4, name: 'Ethan Bennett', date: '2025-07-21', time: '10:00 AM - 06:00 PM', status: 'Pending' },
    { id: 5, name: 'Sophia Clark', date: '2025-07-20', time: '09:00 AM - 05:00 PM', status: 'Approved' },
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

// --- UI SECTIONS ---
const ApprovalRejectionQueue = ({ maxItems = 6 }: { maxItems?: number }) => {
    const navigate = useNavigate();
    const sortedData = useMemo(() =>
        [...approvalQueueData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    []);
    return (
        <Card>
            <CardHeader
                title="Shift Change Request"
                onSeeAll={() => navigate('/webapp/shift-request/all-shift-change-request')}
            />
            <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4 px-4 py-2 text-sm font-medium text-gray-500">
                    <span>EMPLOYEE</span>
                    <span>REQUEST</span>
                    <span className="text-right">ACTIONS</span>
                </div>
                <ul className="divide-y divide-gray-200">
                    {sortedData.slice(0, maxItems).map(item => (
                        <li key={item.id} className="grid grid-cols-3 gap-4 items-center py-3 px-4 hover:bg-gray-50 rounded-md">
                            <div>
                                <p className="font-medium text-gray-900">{item.employee}</p>
                                <p className="text-sm text-gray-500">{item.type}</p>
                            </div>
                            <div className="text-sm text-gray-600">
                                {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {item.time}
                            </div>
                            <div className="flex justify-end items-center space-x-2">
                                <button className="p-2 rounded-full text-red-500 bg-red-100 hover:bg-red-200 transition-colors">
                                    <X size={20} />
                                </button>
                                <button className="p-2 rounded-full text-green-500 bg-green-100 hover:bg-green-200 transition-colors">
                                    <Check size={20} />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </Card>
    );
};

const TeamShiftList = ({ maxItems = 4 }: { maxItems?: number }) => {
    const navigate = useNavigate();
    const sortedData = useMemo(() =>
        [...teamShiftsData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    []);
    return (
        <Card>
            <CardHeader
                title="Team Shift List"
                onSeeAll={() => navigate('/webapp/shift-request/all-team-shifts')}
            />
            <ul className="space-y-3">
                {sortedData.slice(0, maxItems).map(item => (
                    <li key={item.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-600">
                                {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {item.time}
                            </p>
                        </div>
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
                        <ApprovalRejectionQueue maxItems={9} />
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