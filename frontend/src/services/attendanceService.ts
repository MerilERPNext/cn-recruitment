// services/attendanceService.ts
import FrappeAPI from '../utils/frappeAPI';
import type { Attendance, AttendanceRequest } from '../types/attendance';
import { FilterCondition } from '../types/frappe';

export const attendanceService = {
  getAllAttendance: async (): Promise<Attendance[]> => {
    const response = await FrappeAPI.getDocumentList('Attendance', {
      fields: ['*'],
    });
    return response.data as Attendance[];
  },
  getAllAttendanceRequests: async (): Promise<AttendanceRequest[]> => {
    const response = await FrappeAPI.getDocumentList('Attendance Request', {
      fields: ['*'],
    });
    return response.data as AttendanceRequest[];
  },

  getAttendanceById: async (id: string): Promise<Attendance> => {
    if (!id) throw new Error('Attendance ID is required');
    const result = await FrappeAPI.getDocument('Attendance',id);
    if (!result) throw new Error('Attendance record not found');
    return result as Attendance;
  },

  getAttendance: async (filters: FilterCondition[]): Promise<Attendance[]> => {
    const response = await FrappeAPI.getDocumentList("Attendance", {
      fields: ["*"],
      filters,
    });
    return response.data as Attendance[];
  },
  getLeaveType: async (filters?: FilterCondition[]): Promise<any> => {
    const response = await FrappeAPI.getDocumentList("Leave Type", {
      fields: ["*"],
      filters,
    });
    return response.data;
  },

//   searchAttendance: async (searchTerm: string): Promise<Attendance[]> => {
//     const response = await FrappeAPI.getDocumentList('Attendance', {
//       fields: ['*'],
//       filters: [['employee', 'like', `%${searchTerm}%`]],
//     });
//     return response.data;
//   },
};
