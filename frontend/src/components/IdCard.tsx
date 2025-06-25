import React from 'react';
import { useLocation, useParams } from 'react-router-dom';

const IdCard: React.FC = () => {
  const location = useLocation();
  const params = useParams();

  const memberData = {
    id: params.id || "EMP001",
    name: "John Doe",
    position: "Senior Software Engineer",
    department: "Engineering",
    joinDate: "2024-01-15",
    email: "john.doe@company.com",
    phone: "+1 (555) 123-4567",
    employeeType: "Full-time",
    location: "New York Office",
    manager: "Jane Smith"
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee ID Card</h1>
          <p className="text-gray-600">Current path: {location.pathname}</p>
          {params.id && <p className="text-gray-600">Member ID: {params.id}</p>}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ID Card Preview */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">ID Card Preview</h2>
            
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-6 text-white max-w-sm mx-auto">
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-white rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {memberData.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{memberData.name}</h3>
                <p className="text-blue-100 text-sm">{memberData.position}</p>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-100">ID:</span>
                  <span className="font-semibold">{memberData.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Dept:</span>
                  <span className="font-semibold">{memberData.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Joined:</span>
                  <span className="font-semibold">
                    {new Date(memberData.joinDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-blue-400">
                <div className="text-center">
                  <div className="bg-white text-black text-xs px-2 py-1 rounded">
                    COMPANY LOGO
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors mr-3">
                Download ID Card
              </button>
              <button className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors">
                Print ID Card
              </button>
            </div>
          </div>
          
          {/* Employee Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Employee Details</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee ID
                  </label>
                  <p className="text-gray-900 font-semibold">{memberData.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <p className="text-gray-900 font-semibold">{memberData.name}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <p className="text-gray-900">{memberData.position}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <p className="text-gray-900">{memberData.department}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Join Date
                  </label>
                  <p className="text-gray-900">
                    {new Date(memberData.joinDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Type
                  </label>
                  <p className="text-gray-900">{memberData.employeeType}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <p className="text-gray-900">{memberData.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <p className="text-gray-900">{memberData.phone}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <p className="text-gray-900">{memberData.location}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager
                  </label>
                  <p className="text-gray-900">{memberData.manager}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm">
                  Update Details
                </button>
                <button className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors text-sm">
                  Request New Card
                </button>
                <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm">
                  Report Lost Card
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Search for Different Employee */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Look up Different Employee</h3>
          <div className="flex space-x-4">
            <input
              type="text"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Employee ID"
            />
            <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors">
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdCard;