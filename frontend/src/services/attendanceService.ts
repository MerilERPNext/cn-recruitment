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
  getAllAttendanceRequests: async (pageSize:number): Promise<AttendanceRequest[]> => {
    const response = await FrappeAPI.getDocumentList('Attendance Request', {
      fields: ['*'],
      limit:pageSize
    });
    return response.data as AttendanceRequest[];
  },

  getAttendanceById: async (id: string): Promise<Attendance> => {
    if (!id) throw new Error('Attendance ID is required');
    const result = await FrappeAPI.getDocument('Attendance',id);
    if (!result) throw new Error('Attendance record not found');
    return result as Attendance;
  },

  getAttendance: async (filters?: FilterCondition[]): Promise<Attendance[]> => {
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

    createAttendanceRequest: async (body: any): Promise<any> => {
    const response = await fetch(`/api/resource/Attendance Request`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
      throw new Error(error.message);
    }

    return response.json();
  }



//   searchAttendance: async (searchTerm: string): Promise<Attendance[]> => {
//     const response = await FrappeAPI.getDocumentList('Attendance', {
//       fields: ['*'],
//       filters: [['employee', 'like', `%${searchTerm}%`]],
//     });
//     return response.data;
//   },
};
