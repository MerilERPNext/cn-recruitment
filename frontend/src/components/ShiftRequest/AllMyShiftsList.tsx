import React from "react";
import { StatusBadge } from "./AllShiftsDashboard";
import { useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import FrappeListView from "../ListView";
import type { ShiftAssignment } from "./AllShiftsDashboard";
import formatToIndianDate from "../../utils/formatToIndianDate";

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

  // UPDATED: Using prefixed classes
  return (
    <div
      key={`${item.name}-${index}`}
      className="my-data-row grid grid-cols-5 gap-4 items-center text-center"
    >
      <div className="my-data-cell font-medium truncate">{item.employee_name}</div>
      <div className="my-data-cell truncate" title={item.creation}>
        {item.shift_type}
      </div>
      <div className="my-data-cell">{formatToIndianDate(item.start_date)}</div>
      <div className="my-data-cell">{formatToIndianDate(item.end_date)}</div>
      <div className="my-data-cell flex justify-center">
        <StatusBadge status={shiftStatus} />
      </div>
    </div>
  );
};

const AllMyShiftsList: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full mx-auto pb-20">
      <HeaderBar title="All My Shifts" onBack={() => navigate(-1)} />
      <div className="overflow-x-auto mt-6 mx-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* UPDATED: Using prefixed classes for header */}
        <div className="my-table-header grid grid-cols-5 gap-4">
          <span className="my-table-header-text flex items-center justify-center">
            EMPLOYEE
          </span>
          <span className="my-table-header-text flex items-center justify-center">
            SHIFT TYPE
          </span>
          <span className="my-table-header-text flex items-center justify-center">
            START DATE
          </span>
          <span className="my-table-header-text flex items-center justify-center">
            END DATE
          </span>
          <span className="my-table-header-text flex items-center justify-center">
            STATUS
          </span>
        </div>
        <div>
          <FrappeListView
            doctype="Shift Assignment"
            ItemComponent={MyShiftRowItem}
            isSearch={false}
            pageSize={50}
            orderBy="start_date"
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
