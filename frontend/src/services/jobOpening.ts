// services/frappeService.ts

import { FrappeAPI } from '../utils/frappeAPI';
import { FilterCondition } from '../types/frappe';

export const getJobApplicantCount = async (filters?: FilterCondition[]): Promise<number> => {
  try {
    return await FrappeAPI.getDocumentCount('Job Applicant', filters);
  } catch (error) {
    console.error('Error fetching Job Applicant count:', error);
    throw error;
  }
};