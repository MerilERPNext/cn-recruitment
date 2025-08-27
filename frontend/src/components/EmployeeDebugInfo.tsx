import React, { useState } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useCurrentEmployeeAllDetails } from '../hooks/useEmployee';
import { useScreenSize } from '../hooks/useScreenSize';

const EmployeeDebugInfo: React.FC = () => {
  const [showDebug, setShowDebug] = useState(false);
  const { isDesktop } = useScreenSize();
  const { data: currentUser, isLoading: userLoading, error: userError } = useCurrentUser();
  const { data: currentEmployee, isLoading: employeeLoading, error: employeeError } = useCurrentEmployeeAllDetails(currentUser?.name || '');

  // Don't render on desktop as it will be integrated into the sidebar
  if (isDesktop) {
    return null;
  }

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowDebug(true)}
          className="bg-red-500 text-white px-3 py-1 rounded text-xs shadow-lg"
        >
          Debug Employee
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-full overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Employee Debug Information</h2>
          <button
            onClick={() => setShowDebug(false)}
            className="bg-gray-500 text-white px-3 py-1 rounded"
          >
            Close
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Current User Info */}
          <div className="border p-4 rounded">
            <h3 className="font-semibold text-lg mb-2">Current User Data</h3>
            <div className="mb-2">
              <strong>Loading:</strong> {userLoading ? 'Yes' : 'No'}
            </div>
            {userError && (
              <div className="mb-2 text-red-600">
                <strong>Error:</strong> {userError.message}
              </div>
            )}
            <div className="mb-2">
              <strong>User Data:</strong>
            </div>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(currentUser, null, 2)}
            </pre>
            <div className="mt-2">
              <strong>User ID being used for employee lookup:</strong> 
              <code className="bg-gray-100 px-2 py-1 rounded ml-2">
                {currentUser?.name || 'undefined'}
              </code>
            </div>
          </div>

          {/* Employee Info */}
          <div className="border p-4 rounded">
            <h3 className="font-semibold text-lg mb-2">Employee Data</h3>
            <div className="mb-2">
              <strong>Loading:</strong> {employeeLoading ? 'Yes' : 'No'}
            </div>
            {employeeError && (
              <div className="mb-2 text-red-600">
                <strong>Error:</strong> {employeeError.message}
              </div>
            )}
            <div className="mb-2">
              <strong>Employee Data:</strong>
            </div>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(currentEmployee, null, 2)}
            </pre>
          </div>

          {/* Troubleshooting Tips */}
          <div className="border p-4 rounded bg-blue-50">
            <h3 className="font-semibold text-lg mb-2">Troubleshooting Tips</h3>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Check if the user has an employee record in the system</li>
              <li>Verify that the employee record has the correct user_id field</li>
              <li>Ensure the employee record has both 'name' and 'employee_name' fields</li>
              <li>Check browser console for detailed error messages</li>
              <li>Verify API permissions for the current user</li>
            </ul>
          </div>

          {/* Quick Fixes */}
          <div className="border p-4 rounded bg-green-50">
            <h3 className="font-semibold text-lg mb-2">Common Issues & Solutions</h3>
            <div className="space-y-2 text-sm">
              {!currentUser && (
                <div className="p-2 bg-red-100 rounded">
                  <strong>Issue:</strong> No current user data found<br/>
                  <strong>Solution:</strong> User might not be logged in properly. Try refreshing the page.
                </div>
              )}
              
              {currentUser && !currentEmployee && !employeeLoading && (
                <div className="p-2 bg-orange-100 rounded">
                  <strong>Issue:</strong> No employee record found for user: {currentUser.name}<br/>
                  <strong>Solution:</strong> An employee record needs to be created for this user with user_id = "{currentUser.name}"
                </div>
              )}
              
              {currentEmployee && (!currentEmployee.name || !currentEmployee.employee_name) && (
                <div className="p-2 bg-yellow-100 rounded">
                  <strong>Issue:</strong> Employee record missing required fields<br/>
                  <strong>Solution:</strong> Update the employee record to include both 'name' and 'employee_name' fields
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDebugInfo;
