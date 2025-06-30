import React, { ReactElement } from 'react';
import { ArrowLeft, CheckCircle, Clock, User, } from 'lucide-react';
import { useNavigate } from 'react-router';

// Type definitions
interface ApprovalWorkflow {
  id: number;
  name: string;
  status: 'approved' | 'pending' | 'rejected';
  approvedDate: string | null;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar: string | null;
}

interface ApplicationStats {
  totalApplications: number;
  reviewed: number;
  interviewing: number;
}

interface SalaryRange {
  min: number;
  max: number;
}

interface Details {
  budget: number;
  salaryRange: SalaryRange;
  deadline: string;
  priority: 'High' | 'Medium' | 'Low';
  createdDate: string;
  updatedDate: string;
}

interface MockData {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  description: string;
  approvalWorkflow: ApprovalWorkflow[];
  assignedTeam: TeamMember[];
  applicationStats: ApplicationStats;
  details: Details;
}

interface StatusDisplay {
  icon: ReactElement;
  bgColor: string;
  textColor: string;
  label: string;
}

const RequisitionDetails: React.FC = () => {
  const navigate = useNavigate();
  const handleBackInterview= () => {
    navigate(-1);
  };
  // Mock data that would come from API
  const mockData: MockData = {
    id: 'REQ-001',
    title: 'Senior Product Manager',
    department: 'Product Management',
    location: 'Pune, MH',
    employmentType: 'Full-time',
    description: 'We are seeking a highly motivated and experienced Senior Product Manager to lead the development and execution of our product strategy. The ideal candidate will have a strong understanding of the Indian market, customer needs, and competitive landscape. They will be responsible for defining product vision, roadmap, and requirements, and working closely with engineering, design, and marketing teams to deliver successful products in the Indian market.',
    approvalWorkflow: [
      { id: 1, name: 'HR Approval', status: 'approved', approvedDate: '2024-06-20' },
      { id: 2, name: 'Finance Approval', status: 'approved', approvedDate: '2024-06-22' },
      { id: 3, name: 'Executive Approval', status: 'pending', approvedDate: null }
    ],
    assignedTeam: [
      { id: 1, name: 'Priya Sharma', role: 'Recruiter', avatar: null },
      { id: 2, name: 'Rajesh Gupta', role: 'Hiring Manager', avatar: null }
    ],
    applicationStats: {
      totalApplications: 125,
      reviewed: 75,
      interviewing: 15
    },
    details: {
      budget: 2500000,
      salaryRange: { min: 2000000, max: 2300000 },
      deadline: '2024-07-15',
      priority: 'High',
      createdDate: '2024-06-15',
      updatedDate: '2024-06-25'
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // Helper function to get status icon and color
  const getStatusDisplay = (status: string): StatusDisplay => {
    switch (status) {
      case 'approved':
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          bgColor: 'bg-green-100',
          textColor: 'text-green-600',
          label: 'Approved'
        };
      case 'pending':
        return {
          icon: <Clock className="w-6 h-6 text-orange-500" />,
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-500',
          label: 'Pending'
        };
      default:
        return {
          icon: <Clock className="w-6 h-6 text-gray-500" />,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-500',
          label: 'Unknown'
        };
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center px-4 py-3">
          <button 
          onClick={handleBackInterview}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 pr-10">
            Requisition Details
          </h2>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 pt-4 pb-6">
        {/* Job Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {mockData.title}
          </h1>
          <p className="text-sm font-medium text-gray-600">
            {mockData.department} · {mockData.location} · {mockData.employmentType}
          </p>
        </div>

        {/* Description */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Description & Requirements
          </h2>
          <p className="text-base text-gray-700 leading-relaxed">
            {mockData.description}
          </p>
        </section>

        {/* Approval Workflow */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Approval Workflow
          </h2>
          <div className="space-y-3">
            {mockData.approvalWorkflow.map((approval) => {
              const statusDisplay = getStatusDisplay(approval.status);
              return (
                <div key={approval.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className={`flex items-center justify-center w-10 h-10 ${statusDisplay.bgColor} rounded-full`}>
                    {statusDisplay.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{approval.name}</p>
                    <p className={`text-sm font-medium ${statusDisplay.textColor}`}>{statusDisplay.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Assigned Team */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Assigned Team
          </h2>
          <div className="space-y-3">
            {mockData.assignedTeam.map((member, index) => {
              const avatarColors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500'];
              const avatarColor = avatarColors[index % avatarColors.length];
              
              return (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className={`w-12 h-12 ${avatarColor} rounded-full flex items-center justify-center`}>
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.role}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Application Statistics */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Application Statistics
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Applications</p>
              <p className="text-3xl font-bold text-gray-900">{mockData.applicationStats.totalApplications}</p>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <p className="text-sm font-medium text-gray-600 mb-1">Reviewed</p>
              <p className="text-3xl font-bold text-gray-900">{mockData.applicationStats.reviewed}</p>
            </div>
            <div className="col-span-2 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <p className="text-sm font-medium text-gray-600 mb-1">Interviewing</p>
              <p className="text-3xl font-bold text-gray-900">{mockData.applicationStats.interviewing}</p>
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Details
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200">
            <div className="px-4 py-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-600">Budget</p>
                <p className="text-sm font-medium text-gray-900">{formatCurrency(mockData.details.budget)}</p>
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-600">Salary Range</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(mockData.details.salaryRange.min)} - {formatCurrency(mockData.details.salaryRange.max)}
                </p>
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-600">Deadline</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(mockData.details.deadline)}</p>
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-600">Priority</p>
                <p className={`text-sm font-semibold ${
                  mockData.details.priority === 'High' ? 'text-red-500' : 
                  mockData.details.priority === 'Medium' ? 'text-yellow-500' : 'text-green-500'
                }`}>
                  {mockData.details.priority}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition-colors duration-200">
          Edit Requisition
        </button>
      </footer>
    </div>
  );
};

export default RequisitionDetails;