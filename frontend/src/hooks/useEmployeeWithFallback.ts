import { useCurrentUser } from './useCurrentUser';
import { useCurrentEmployeeAllDetails } from './useEmployee';

export interface EmployeeState {
  isLoading: boolean;
  error: Error | null;
  hasEmployeeRecord: boolean;
  hasValidData: boolean;
  canRetry: boolean;
  retry: () => void;
}

/**
 * Enhanced hook that provides better error handling and fallback states
 * for employee data fetching
 */
export const useEmployeeWithFallback = (): EmployeeState => {
  const { 
    data: currentUser, 
    isLoading: userLoading, 
    error: userError,
    refetch: refetchUser
  } = useCurrentUser();
  
  const { 
    data: currentEmployee, 
    isLoading: employeeLoading, 
    error: employeeError,
    refetch: refetchEmployee
  } = useCurrentEmployeeAllDetails(currentUser?.name || '', undefined, 
    ["user_id", "name", "employee_name"]);

  const retry = () => {
    if (userError) {
      refetchUser();
    }
    if (employeeError || !currentEmployee) {
      refetchEmployee();
    }
  };

  const isLoading = userLoading || employeeLoading;
  const error = userError || employeeError;
  const hasEmployeeRecord = !!currentEmployee;
  const hasValidData = !!(currentEmployee?.name && currentEmployee?.employee_name);
  const canRetry = !!error || (!currentEmployee && !isLoading);

  return {
    isLoading,
    error,
    hasEmployeeRecord,
    hasValidData,
    canRetry,
    retry
  };
};

/**
 * Hook that provides employee data with automatic fallback handling
 * Returns null for employee if data is invalid, but provides state information
 */
// export const useEmployeeOrNull = () => {
//   const state = useEmployeeWithFallback();
//   return {
//     ...state,
//     // Only return employee if data is completely valid
//     employee: state.hasValidData ? state.employee : null
//   };
// };

/**
 * Hook that throws an error if employee data is not available
 * Use this when employee data is absolutely required
 */
// export const useRequiredEmployee = (): Employee => {
//   const state = useEmployeeWithFallback();
  
//   if (state.isLoading) {
//     throw new Promise((resolve) => {
//       // This will suspend the component until loading is complete
//       const checkLoading = () => {
//         if (!state.isLoading) {
//           resolve(state.employee);
//         } else {
//           setTimeout(checkLoading, 100);
//         }
//       };
//       checkLoading();
//     });
//   }
  
//   if (state.error) {
//     throw state.error;
//   }
  
//   if (!state.hasValidData) {
//     throw new Error(
//       state.hasEmployeeRecord 
//         ? 'Employee record exists but has invalid data structure'
//         : 'No employee record found for current user'
//     );
//   }
  
//   return state.employee!;
// };
