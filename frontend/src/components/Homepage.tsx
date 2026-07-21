import React from 'react';
import { useNavigate } from 'react-router-dom';

interface StatCard {
  title: string;
  value: string;
  icon: string;
  color: string;
  trend?: string;
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string;
}

const Homepage: React.FC = () => {
  const navigate = useNavigate();

  const stats: StatCard[] = [
    {
      title: "Active Candidates",
      value: "1,234",
      icon: "people",
      color: "text-blue-500",
      trend: "+12% this month"
    },
    {
      title: "Open Positions",
      value: "45",
      icon: "work",
      color: "text-green-500",
      trend: "+3 new this week"
    },
    {
      title: "Interviews Scheduled",
      value: "89",
      icon: "event",
      color: "text-orange-500",
      trend: "18 this week"
    },
    {
      title: "Offers Extended",
      value: "23",
      icon: "handshake",
      color: "text-purple-500",
      trend: "+5 this month"
    }
  ];

  const quickActions: QuickAction[] = [
    {
      title: "Recruitment",
      description: "Manage referrals, interviews, and applications",
      icon: "work",
      color: "bg-blue-500",
      route: "/recruitment"
    },
    {
      title: "Add New Candidate",
      description: "Register a new candidate in the system",
      icon: "person_add",
      color: "bg-green-500",
      route: "/candidates/new"
    },
    {
      title: "Schedule Interview",
      description: "Set up interviews with candidates",
      icon: "calendar_today",
      color: "bg-orange-500",
      route: "/interviews/new"
    },
    {
      title: "Job Postings",
      description: "Create and manage job openings",
      icon: "post_add",
      color: "bg-purple-500",
      route: "/jobs"
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: "Interview",
      title: "Software Engineer Interview",
      candidate: "John Doe",
      time: "2 hours ago",
      status: "completed"
    },
    {
      id: 2,
      type: "Application",
      title: "New Application Received",
      candidate: "Jane Smith",
      time: "4 hours ago",
      status: "pending"
    },
    {
      id: 3,
      type: "Offer",
      title: "Offer Extended",
      candidate: "Mike Johnson",
      time: "6 hours ago",
      status: "sent"
    }
  ];

  const handleQuickAction = (route: string): void => {
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="material-icons text-blue-500 text-2xl mr-3">business</span>
              <h1 className="text-xl font-semibold text-gray-900">HR Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500 transition-colors">
                <span className="material-icons">notifications</span>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-500 transition-colors">
                <span className="material-icons">settings</span>
              </button>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">A</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h2>
          <p className="text-gray-600">Here's what's happening with your recruitment today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className={`material-icons ${stat.color} text-2xl`}>{stat.icon}</span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                {stat.trend && (
                  <p className="text-xs text-gray-500">{stat.trend}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action.route)}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow text-left group"
              >
                <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                  <span className="material-icons text-white text-xl">{action.icon}</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{action.title}</h4>
                <p className="text-sm text-gray-600">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {activity.type}
                      </span>
                      <p className="font-medium text-gray-900">{activity.title}</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Candidate: {activity.candidate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{activity.time}</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                      activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-gray-100">
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View all activity →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Homepage; 