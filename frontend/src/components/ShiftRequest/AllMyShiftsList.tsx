import React from "react";
import { StatusBadge } from "./AllShiftsDashboard";
import { useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import FrappeListView from "../ListView";
import type { ShiftAssignment } from "./AllShiftsDashboard";

const MyShiftRowItem: React.FC<{
    item: ShiftAssignment;
    index?: number;
    doctype: string;
}> = ({ item, index }) => {

    const getShiftStatus = (startDate: string, endDate: string): string => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);

        if (today < start) {
            return "Upcoming";
        } else if (today > end) {
            return "Previous";
        } else {
            return "Current";
        }
    };

    const shiftStatus = getShiftStatus(item.start_date, item.end_date);

    // CHANGED: Using .data-row for the container and .data-cell for children.
    return (
        <div
            key={`${item.name}-${index}`}
            className="data-row grid grid-cols-5 gap-4 items-center text-center"
        >
            <div className="data-cell font-medium truncate">
                {item.employee_name}
            </div>
            <div className="data-cell truncate">
                {item.shift_type}
            </div>
            <div className="data-cell">
                {item.start_date}
            </div>
            <div className="data-cell">
                {item.end_date}
            </div>
            <div className="data-cell flex justify-center">
                <StatusBadge status={shiftStatus} />
            </div>
        </div>
    );
};

const AllMyShiftsList: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="w-full mx-auto pb-20">
            <HeaderBar
                title="All My Shifts"
                onBack={() => navigate(-1)}
            />
            <div className="overflow-x-auto mt-6 mx-6 rounded-lg border border-gray-200 bg-white shadow-sm">
                {/* CHANGED: Using .table-header for consistent header styling. */}
                <div className="table-header grid grid-cols-5 gap-4">
                    {/* CHANGED: Using .table-header-text for consistent column titles. */}
                    <span className="table-header-text flex items-center justify-center">
                        EMPLOYEE
                    </span>
                    <span className="table-header-text flex items-center justify-center">
                        SHIFT TYPE
                    </span>
                    <span className="table-header-text flex items-center justify-center">
                        START DATE
                    </span>
                    <span className="table-header-text flex items-center justify-center">
                        END DATE
                    </span>
                    <span className="table-header-text flex items-center justify-center">
                        STATUS
                    </span>
                </div>
                <div>
                    <FrappeListView
                        doctype="Shift Assignment"
                        ItemComponent={MyShiftRowItem}
                        isSearch={false}
                        defaultFields={[
                            "name",
                            "employee",
                            "employee_name",
                            "shift_type",
                            "start_date",
                            "end_date",
                            "status",
                            "docstatus",
                            "creation",
                        ]}
                        searchFields={["employee", "employee_name", "shift_type", "status"]}
                        infiniteScroll={true}
                    />
                </div>
            </div>
        </div>
    );
};
export default AllMyShiftsList;