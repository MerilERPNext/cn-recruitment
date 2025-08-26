import React from 'react';
import NewDesktopLayoutWrapper from './shared/NewDesktopLayoutWrapper';
import { useScreenSize } from '../hooks/useScreenSize';

const DemoNewSidebar: React.FC = () => {
  const { isDesktop } = useScreenSize();

  // Demo action button
  const actionButton = (
    <button className="py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-lg">
      + Demo Action
    </button>
  );

  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <h1 className="text-2xl font-bold mb-4">Mobile View (Original)</h1>
        <p className="text-gray-600">
          The sidebar demo is only available on desktop. Mobile view remains unchanged as requested.
        </p>
      </div>
    );
  }

  return (
    <NewDesktopLayoutWrapper title="New Sidebar Demo" actionButton={actionButton}>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">New Collapsible Sidebar Demo</h1>
          
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Features Implemented:</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Collapsible Sidebar:</strong> Hover over the sidebar to expand and see sub-navigation items</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Sub-Navigation:</strong> Each main navigation item shows relevant sub-items when hovered</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Dynamic Width:</strong> Main content adjusts automatically based on sidebar state (ml-20 collapsed, ml-64 expanded)</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Action Buttons:</strong> Blue action buttons are positioned in bottom-right corner (see "+ Demo Action" button)</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Original Colors:</strong> All original UI colors and styling are preserved</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Mobile Unchanged:</strong> Mobile view remains exactly as before</span>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-blue-900">Compensation Sub-Navigation</h2>
            <p className="text-blue-800 mb-3">As requested, the Compensation section now includes:</p>
            <ul className="space-y-2 text-blue-700">
              <li>• CTC Breakdown (with Annual CTC and Monthly CTC options)</li>
              <li>• Salary Slip</li>
              <li>• Payroll Documents</li>
            </ul>
            <p className="text-sm text-blue-600 mt-3">
              <strong>Try it:</strong> Hover over "Compensation" in the sidebar to see the sub-navigation options.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">Navigation Structure</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>📊 Dashboard</li>
                <li>📅 Leaves & Holidays
                  <ul className="ml-4 mt-1 space-y-1 text-xs">
                    <li>• Apply Leave</li>
                    <li>• Leave History</li>
                    <li>• Holiday Calendar</li>
                    <li>• Leave Balance</li>
                  </ul>
                </li>
                <li>👥 Attendance
                  <ul className="ml-4 mt-1 space-y-1 text-xs">
                    <li>• Attendance</li>
                    <li>• Calendar Views</li>
                    <li>• My Attendance Requests</li>
                    <li>• Team Attendance Requests</li>
                    <li>• Request Overtime</li>
                  </ul>
                </li>
                <li>💰 Compensation
                  <ul className="ml-4 mt-1 space-y-1 text-xs">
                    <li>• CTC Breakdown</li>
                    <li>• Salary Slip</li>
                    <li>• Payroll Documents</li>
                  </ul>
                </li>
                <li>🔄 Shifts</li>
                <li>🧾 Expenses</li>
                <li>🛡️ Policies</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-3">Usage Instructions</h3>
              <ol className="space-y-2 text-sm text-gray-600">
                <li><strong>1.</strong> Hover over the sidebar to expand it</li>
                <li><strong>2.</strong> Hover over navigation items with arrows to see sub-options</li>
                <li><strong>3.</strong> Click on any navigation item to navigate</li>
                <li><strong>4.</strong> Main content automatically adjusts to sidebar width</li>
                <li><strong>5.</strong> Action buttons appear in bottom-right corner</li>
              </ol>
            </div>
          </div>

          <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <p className="text-yellow-800">
              <strong>Note:</strong> This is a demonstration component. To use the new sidebar in your app, 
              replace <code>DesktopLayoutWrapper</code> with <code>NewDesktopLayoutWrapper</code> in your components.
            </p>
          </div>
        </div>
      </div>
    </NewDesktopLayoutWrapper>
  );
};

export default DemoNewSidebar;
