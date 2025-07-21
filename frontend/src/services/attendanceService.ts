// services/attendanceService.ts
import FrappeAPI from '../utils/frappeAPI';
import type { Attendance } from '../types/attendance';
import { FilterCondition } from '../types/frappe';

export const attendanceService = {
  getAllAttendance: async (): Promise<Attendance[]> => {
    const response = await FrappeAPI.getDocumentList('Attendance', {
      fields: ['*'],
    });
    return response.data as Attendance[];
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

//   searchAttendance: async (searchTerm: string): Promise<Attendance[]> => {
//     const response = await FrappeAPI.getDocumentList('Attendance', {
//       fields: ['*'],
//       filters: [['employee', 'like', `%${searchTerm}%`]],
//     });
//     return response.data;
//   },
};
