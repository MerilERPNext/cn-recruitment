// hooks/useJobApplicantCount.ts

import { useState, useEffect } from 'react';
import { getJobApplicantCount } from '../services/jobOpening';
import { FilterCondition } from '../types/frappe';
import { PermissionError } from '../types/frappe';

interface UseJobApplicantCountResult {
  count: number | null;
  loading: boolean;
  error: string | null;
}

export const useJobApplicantCount = (filters?: FilterCondition[]): UseJobApplicantCountResult => {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getJobApplicantCount(filters);
        setCount(result);
      } catch (err) {
        if (err instanceof PermissionError) {
          setError(err.message); // Handles 403 errors from FrappeAPI
        } else if (err instanceof Error && err.message.includes('session has expired')) {
          setError('Session expired. Please log in again.');
        } else {
          setError('Failed to fetch Job Applicant count');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, [JSON.stringify(filters)]); // Re-run effect if filters change

  return { count, loading, error };
};