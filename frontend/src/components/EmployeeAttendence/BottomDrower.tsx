import React from 'react'
import BottomDrawer from '../shared/BottomDrawer';

type reactProp = {
  setShowLeaveRequest: (val: boolean) => void;
  setOpenDrawer: (val: boolean) => void;
  setShowReqAttendanceCorrection: (val: boolean) => void;
  setShowOvertimeRequest: (val: boolean) => void;
  plannedOvertimAllowed: boolean | undefined;
  openDrawer:boolean
};
const BottomDrowerForAttendance: React.FC<reactProp> = ({
  setShowLeaveRequest,
  setOpenDrawer,
  setShowReqAttendanceCorrection,
  setShowOvertimeRequest,
  plannedOvertimAllowed,
  openDrawer,
}) => {
  return (
    <BottomDrawer
      isOpen={openDrawer}
      onClose={() => setOpenDrawer(false)}
      children={
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold text-lg">Raise Request</h2>

          <button
            onClick={() => {
              setShowLeaveRequest(true);
              setOpenDrawer(false);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-200 rounded-lg transition-colors "
          >
            Leave Request
          </button>
          <div className="border-b border-gray-200 m-0 p-0"></div>
          <button
            onClick={() => {
              setShowReqAttendanceCorrection(true);
              setOpenDrawer(false);
            }}
            className="w-full text-left px-4 py-2  hover:bg-gray-200 rounded-lg transition-colors"
          >
            Attendance Request
          </button>
          <div className="border-b border-gray-200 m-0 p-0"></div>

          {plannedOvertimAllowed ? (
            <button
              onClick={() => {
                setShowOvertimeRequest(true);
                setOpenDrawer(false);
              }}
              className="w-full text-left px-4 py-2  hover:bg-gray-200 rounded-lg transition-colors"
            >
              Planned Overtime Request
            </button>
          ) : null}
        </div>
      }
    />
  );
};

export default BottomDrowerForAttendance;
