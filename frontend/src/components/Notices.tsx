import React from 'react';
import { useLocation } from 'react-router-dom';

const Notices: React.FC = () => {
  const location = useLocation();

  const notices = [
    {
      id: 1,
      title: "New Recruitment Process Updates",
      date: "2025-06-20",
      priority: "High",
      content: "Important changes to the recruitment process effective immediately. All candidates must complete the updated assessment forms."
    },
    {
      id: 2,
      title: "Office Holiday Schedule",
      date: "2025-06-18",
      priority: "Medium",
      content: "Please note the upcoming office holidays and their impact on interview schedules."
    },
    {
      id: 3,
      title: "System Maintenance Notice",
      date: "2025-06-15",
      priority: "Low",
      content: "Scheduled maintenance window for the recruitment portal will be on Sunday from 2 AM to 6 AM."
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notices & Announcements</h1>
          <p className="text-gray-600">Current path: {location.pathname}</p>
        </div>
        
        <div className="space-y-6">
          {notices.map((notice) => (
            <div key={notice.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {notice.title}
                  </h2>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      Date: {new Date(notice.date).toLocaleDateString()}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(notice.priority)}`}>
                      {notice.priority} Priority
                    </span>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800 text-sm">
                  Mark as Read
                </button>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {notice.content}
                </p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    View Details
                  </button>
                  <button className="text-gray-600 hover:text-gray-800 text-sm">
                    Download
                  </button>
                  <button className="text-gray-600 hover:text-gray-800 text-sm">
                    Share
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Notice</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notice Title
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter notice title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Level
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notice Content
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter notice content"
              />
            </div>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors">
              Publish Notice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notices;