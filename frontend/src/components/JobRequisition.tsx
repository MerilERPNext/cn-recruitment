import React from 'react';
import {
  MdSearch,
  MdExpandMore,
  MdAddCircle,
} from 'react-icons/md';

const JobRequisition: React.FC = () => {
 

  return (
    <div
      className="relative flex size-full min-h-screen flex-col group/design-root"
      style={{ fontFamily: 'Inter, Noto Sans, sans-serif' }}
    >
      <header className="sticky top-0 z-10 bg-[var(--surface-background)] shadow-sm">
 

        <div className="px-4 pb-3 pt-1">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <MdSearch className="text-[var(--text-secondary)] text-xl" />
            </div>
            {/* Changed bg-[var(--secondary-color)] to bg-gray-200 */}
            <input
              type="search"
              placeholder="Search requisitions..."
              className="form-input block w-full rounded-lg border-none bg-gray-200 py-3 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--primary-color)] focus:ring-opacity-50"
            />
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {['Status', 'Department', 'Location'].map((filter) => (
            // Changed bg-[var(--secondary-color)] to bg-gray-200
            <button
              key={filter}
              className="flex h-9 shrink-0 items-center justify-center gap-x-1.5 rounded-full bg-gray-200 px-4 text-sm font-medium text-[var(--text-primary)] hover:bg-slate-300"
            >
              <span>{filter}</span>
              <MdExpandMore className="text-lg" />
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-2 pb-20">
        <div className="space-y-3 py-3">
          {/* job cards remain unchanged */}
          {[
            {
              title: 'Marketing Manager',
              priority: 'Urgent',
              priorityColor: 'text-red-500',
              status: 'Open',
              statusColor: 'bg-green-100 text-green-800',
              department: 'Marketing Department',
              location: 'New York, NY',
            },
            {
              title: 'Sales Representative',
              priority: 'Normal Priority',
              priorityColor: 'text-yellow-600',
              status: 'In Review',
              statusColor: 'bg-blue-100 text-blue-800',
              department: 'Sales Department',
              location: 'Remote',
            },
            {
              title: 'Software Engineer',
              priority: 'Normal Priority',
              priorityColor: 'text-yellow-600',
              status: 'Closed',
              statusColor: 'bg-gray-100 text-gray-800',
              department: 'Engineering Department',
              location: 'San Francisco, CA',
            },
            {
              title: 'Product Manager',
              priority: 'Normal Priority',
              priorityColor: 'text-yellow-600',
              status: 'Open',
              statusColor: 'bg-green-100 text-green-800',
              department: 'Product Department',
              location: 'London, UK',
            },
            {
              title: 'UX Designer',
              priority: 'Urgent',
              priorityColor: 'text-red-500',
              status: 'Open',
              statusColor: 'bg-green-100 text-green-800',
              department: 'Design Department',
              location: 'Remote',
            },
          ].map((job, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-[var(--surface-background)] p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{job.title}</h3>
                  <p className={`text-xs font-medium ${job.priorityColor} mt-0.5`}>{job.priority}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${job.statusColor}`}
                >
                  {job.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{job.department}</p>
              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{job.location}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="sticky left-0 right-0 bg-[var(--surface-background)] border-t border-slate-200 p-4">
        <button className="flex w-full items-center justify-center rounded-full h-12 bg-[var(--primary-color)] text-white text-base font-semibold shadow-lg hover:bg-blue-700 transition-colors duration-200">
          <MdAddCircle className="mr-2" />
          <span>Create New Requisition</span>
        </button>
      </footer>
    </div>
  );
};

export default JobRequisition;