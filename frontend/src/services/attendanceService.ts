// services/attendanceService.ts
import FrappeAPI from '../utils/frappeAPI';
import type { Attendance, AttendanceRequest, EmployeeCheckInLog, EmployeeShift } from '../types/attendance';
import { FilterCondition } from '../types/frappe';

export const attendanceService = {
  getAllAttendance: async (): Promise<Attendance[]> => {
    const response = await FrappeAPI.getDocumentList('Attendance', {
      fields: ['*'],
    });
    return response.data as Attendance[];
  },

  getHomeSummaryDetails: async (userId:string,filters:{}): Promise<EmployeeCheckInLog[]> => {
    try {
      const response = await fetch(`/api/method/cn_leave_shift_managment.api.get_shift_checkins?user=${userId}&filters=${filters}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result?.message as EmployeeCheckInLog[];
    } catch (error) {
      console.error('📡 Error marking notice as read:', error);
      throw error;
    }
  },
  getEmployeeShift: async (userId:string,filters?:{}): Promise<EmployeeShift> => {
    try {
      const response = await fetch(`/api/method/cn_leave_shift_managment.api.get_employee_shift?user=${userId}&filters=${filters}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result?.message as EmployeeShift;
    } catch (error) {
      console.error('📡 Error marking notice as read:', error);
      throw error;
    }
  },


  getQuickAttendanceSummary: async (employeeId:string,fromDate:string,toDate:string): Promise<any> => {
    try {
      const response = await fetch(`/api/method/cn_leave_shift_managment.api.get_quick_summary?employee=${employeeId}&from_date=${fromDate}&to_date=${toDate}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result?.message as any;
    } catch (error) {
      console.error('📡 Error marking notice as read:', error);
      throw error;
    }
  },

  checkInOutService: async (body:any): Promise<any> => {
    try {
      const response = await fetch(`/api/method/cn_leave_shift_managment.api.create_employee_checkin `, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      return response.ok && result.message === true;
    } catch (error) {
      console.error('📡 Error marking notice as read:', error);
      return false;
    }
  },

  getAllAttendanceRequests: async (pageSize:number,filters?: FilterCondition[]): Promise<AttendanceRequest[]> => {
    const response = await FrappeAPI.getDocumentList('Attendance Request', {
      fields: ['*'],
      limit:pageSize,
      filters:filters
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
