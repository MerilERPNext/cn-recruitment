import React, { useMemo } from "react";
import { StatusBadge } from "./AllShiftsDashboard";
import { teamShiftsData } from "./AllShiftsDashboard";
import { useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";

const AllTeamShiftsList: React.FC = () => {
    const navigate = useNavigate();
    const sortedData = useMemo(() =>
        [...teamShiftsData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        []);
    return (
        <div className="w-full mx-auto px-4">
            <HeaderBar
                title="All Team Shifts"
                onBack={() => navigate(-1)}
            />
            <ul className="space-y-3">
                {sortedData.map(item => (
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
        </div>
    );
};

export default AllTeamShiftsList;