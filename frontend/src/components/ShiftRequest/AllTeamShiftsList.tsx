import React from "react";
import { StatusBadge } from "./AllShiftsDashboard";
import { useNavigate } from "react-router-dom";
import HeaderBar from "../HeaderBar";
import FrappeListView from "../ListView";
import type { ShiftAssignment } from "./AllShiftsDashboard";
import formatToIndianDate from "../../utils/formatToIndianDate";

const TeamShiftRowItem: React.FC<{
  item: ShiftAssignment;
  index?: number;
  doctype: string;
}> = ({ item, index }) => {
  // UPDATED: Using prefixed classes
  return (
    <div
      key={`${item.name}-${index}`}
      className="my-data-row grid grid-cols-5 gap-4 items-center text-center"
    >
      <div className="my-data-cell font-medium truncate">
        {item.employee_name || item.employee}
      </div>
      <div className="my-data-cell truncate" title={item.creation}>
        {item.shift_type}
      </div>
      <div className="my-data-cell">{formatToIndianDate(item.start_date)}</div>
      <div className="my-data-cell">{formatToIndianDate(item.end_date)}</div>
      <div className="my-data-cell flex justify-center">
        <StatusBadge status={item.status} />
      </div>
    </div>
  );
};

const AllTeamShiftsList: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full mx-auto pb-20">
      <HeaderBar title="All Team Shifts" onBack={() => navigate(-1)} />
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
            ItemComponent={TeamShiftRowItem}
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

export default AllTeamShiftsList;
