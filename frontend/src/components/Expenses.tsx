import React from 'react';

const Expenses: React.FC = () => {
  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--background-medium)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Expenses Management
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track, manage, and process employee expense reports and reimbursements.
          </p>
        </div>

        <div className="rounded-lg shadow-md p-6" style={{ backgroundColor: 'var(--background-light)' }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Expense Dashboard
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            Welcome to the expenses management system. Here you can manage all expense-related activities.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4" style={{ borderColor: 'var(--border-light)' }}>
              <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Submit Expense
              </h3>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Create a new expense report
              </p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                New Expense
              </button>
            </div>

            <div className="border rounded-lg p-4" style={{ borderColor: 'var(--border-light)' }}>
              <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                My Expenses
              </h3>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                View your submitted expenses
              </p>
              <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                View Expenses
              </button>
            </div>

            <div className="border rounded-lg p-4" style={{ borderColor: 'var(--border-light)' }}>
              <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Approve Expenses
              </h3>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Review and approve team expenses
              </p>
              <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
                Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;
