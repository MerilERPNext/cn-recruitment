import { Settings, Users, Award, Zap, FileText, CreditCard, FileCheck, Building, UserCheck, MessageSquare, DollarSign, Download, User, HelpCircle } from 'lucide-react'

const MicroAppInDashboard = () => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-gray-900">Admin Apps</h3>
      <span className="text-blue-600 text-sm cursor-pointer">
        View All
      </span>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <Settings className="w-6 h-6 text-yellow-600" />
        </div>
        <p className="text-xs text-gray-600">Settings</p>
      </div>
      <div className="text-center">
        <div className="w-12 h-12 bg-pink-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <Users className="w-6 h-6 text-pink-600" />
        </div>
        <p className="text-xs text-gray-600">Onboarding</p>
      </div>
      <div className="text-center">
        <div className="w-12 h-12 bg-teal-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <Award className="w-6 h-6 text-teal-600" />
        </div>
        <p className="text-xs text-gray-600">Recognitions</p>
      </div>
      <div className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <Zap className="w-6 h-6 text-green-600" />
        </div>
        <p className="text-xs text-gray-600">Performance</p>
      </div>
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <p className="text-xs text-gray-600">PolicyDesk</p>
      </div>
      <div className="text-center">
        <div className="w-12 h-12 bg-cyan-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-cyan-600" />
        </div>
        <p className="text-xs text-gray-600">Travel & Expenses</p>
      </div>
      <div className="text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <FileCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <p className="text-xs text-gray-600">HRIS Documents</p>
      </div>
      <div className="text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <Building className="w-6 h-6 text-gray-600" />
        </div>
        <p className="text-xs text-gray-600">MIS Encashment</p>
      </div>
      <div className="text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <UserCheck className="w-6 h-6 text-slate-600" />
        </div>
        <p className="text-xs text-gray-600">Separations</p>
      </div>
      <div className="text-center">
        <div className="w-12 h-12 bg-indigo-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-indigo-600" />
        </div>
        <p className="text-xs text-gray-600">OrgChart</p>
      </div>
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-blue-600" />
        </div>
        <p className="text-xs text-gray-600">Offboarding</p>
      </div>
      <div className="text-center">
        <div className="w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <Download className="w-6 h-6 text-yellow-600" />
        </div>
        <p className="text-xs text-gray-600">Talent Mgmt</p>
      </div>
      <div className="text-center">
        <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <User className="w-6 h-6 text-purple-600" />
        </div>
        <p className="text-xs text-gray-600">Separation Help...</p>
      </div>
      <div className="text-center">
        <div className="w-12 h-12 bg-teal-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <HelpCircle className="w-6 h-6 text-teal-600" />
        </div>
        <p className="text-xs text-gray-600">Ask Themis</p>
      </div>
    </div>
  </div>
  )
}

export default MicroAppInDashboard
