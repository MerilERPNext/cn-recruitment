import React, { useMemo } from "react";
import { Check, X } from "lucide-react";
import { approvalQueueData } from "./AllShiftsDashboard";
import HeaderBar from "../HeaderBar";
import { useNavigate } from "react-router-dom";


const AllShiftChangeRequestsList: React.FC = () => {
    const navigate = useNavigate();

    const sortedData = useMemo(() =>
        [...approvalQueueData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        []);
    return (
        <div className="w-full mx-auto px-4">
            <HeaderBar
                title="All Shift Change Requests"
                onBack={() => navigate(-1)}
            />            <h2 className="text-xl font-bold mb-6"></h2>
            <div className="grid grid-cols-3 gap-4 px-4 py-2 text-sm font-medium text-gray-500">
                <span>EMPLOYEE</span>
                <span>REQUEST</span>
                <span className="text-right">ACTIONS</span>
            </div>
            <ul className="divide-y divide-gray-200">
                {sortedData.map(item => (
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
    );
};

export default AllShiftChangeRequestsList;