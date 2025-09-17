import {
    Calendar,
    Clock,
    FileText,
    Users,
    Settings,
    Award,
    CreditCard,
    FileCheck,
    UserCheck,
    Building,
    MessageSquare,
    DollarSign,
    Download,
    User,
    HelpCircle,
    Zap,
    CheckCircle,
    XCircle,
  } from "lucide-react"
import DesktopLayoutWrapper from "../DesktopLayoutWrapper"
  
  export default function DashboardModel() {
    return (
    <DesktopLayoutWrapper title="Dashboard" >
      <div className="min-h-screen overflow-y-scroll bg-gray-50 p-6">
        <div className="w-full mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-lg p-6 text-center shadow-sm">
              <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900">Michelle Smith</h3>
              <p className="text-sm text-gray-600">Software Engineer</p>
              <p className="text-xs text-gray-500 mt-1">Development | EMP1234</p>
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg mt-4 hover:bg-blue-700">
                View Profile
              </button>
            </div>
  
            {/* Requests Section */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Requests</h3>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 text-sm cursor-pointer">View All</span>
                  <span className="text-gray-400">•••</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center bg-gray-100 p-2 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-600">Apply Leave</p>
                </div>
                <div className="text-center bg-gray-100 p-2 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-600">Initiate Flow</p>
                </div>
                <div className="text-center bg-gray-100 p-2 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-600">Request Letter</p>
                </div>
                <div className="text-center bg-gray-100 p-2 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <Award className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-600">Add Goals / Key Result...</p>
                </div>
              </div>
            </div>
  
            {/* Tasks Awaiting */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-700">Apply Leave</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <Clock className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-700">Attendance Regularization</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <Zap className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-gray-700">Raise Request</span>
                  </div>
                </div>
              </div>

  
            {/* Admin Apps */}
      
          </div>
  
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Hero Banner */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-lg p-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2">Keep Up the Rhythm!</h2>
                <p className="text-teal-100">Your contributions are making the day amazing!</p>
              </div>
              <div className="absolute right-4 top-4 w-20 h-20 bg-yellow-100 rounded-lg flex items-center justify-center">
                <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-700" />
                </div>
              </div>
            </div>
  
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
       
              <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Tasks Awaiting You (34569)</h3>
              <div className="space-y-4">
                <div className="flex items-start p-2 rounded-lg bg-gray-100 gap-3">
                  <div className="w-8 h-8  bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 ">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Requisition Activation</span>
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Due on 27 Sep</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      For: Priya Arora (PW1080) | Associate Manager 
                    </p>
                  </div>
                </div>
  
                <div className="flex items-start p-2 rounded-lg bg-gray-100 gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Requisition Activation</span>
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Due on 14 Oct</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      For: Chayan Bose (PW2225) | Professor
                    </p>
                  </div>
                </div>
  
                <div className="flex items-start p-2 rounded-lg bg-gray-100 gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Requisition Activation</span>
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Due on 20 Nov</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      For: Kiya Aggarwal (PW2210) | Trainee Professor
                    </p>
                  </div>
                </div>
              </div>
            </div>
  
              {/* Announcements */}
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Announcements</h3>
                <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                {/* Icon Box */}
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>

                {/* Text Content */}
                <div>
                  <p className="text-xs font-medium text-gray-500 tracking-wide">
                    SHIFT START
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    --:--
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                {/* Icon Box */}
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>

                {/* Text Content */}
                <div>
                  <p className="text-xs font-medium text-gray-500 tracking-wide">
                    IN TIME
                  </p>
                  <p className="text-xl font-bold text-green-600">
                  09:05 AM
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                {/* Icon Box */}
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>

                {/* Text Content */}
                <div>
                  <p className="text-sm text-gray-500 mb-1">SHIFT END</p>
                  <p className="text-xl font-bold text-blue-600">
                    --:--
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                {/* Icon Box */}
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>

                {/* Text Content */}
                <div>
                  <p className="text-sm text-gray-500 mb-1">OUT TIME</p>
                  <p className="text-xl font-bold text-red-600">
                    10:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>
              </div>
            </div>
  
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Helpdesk</h3>
              <div className="flex gap-4">
                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  <HelpCircle className="w-4 h-4" />
                  Raise Ticket
                </button>
                <button className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                  <HelpCircle className="w-4 h-4" />
                  FAQs
                </button>
              </div>
            </div>
              
              <div className="bg-white text-blue-600  p-6 rounded-lg">
                <div className="text-center">
                  <p className="text-gray-500 text-sm mb-2 font-medium tracking-wide">
                    TOTAL HOURS WORKED
                  </p>
                  <p className="text-xl font-bold mb-1">10:00AM</p>
                  <p className="text-blue-600 text-sm mb-6">8h 55m target</p>

                  {/* Enhanced Progress Bar */}
                  <div className="relative px-10 mb-3">
                    <div className="bg-blue-200 h-3 shadow-inner rounded-lg ">
                      <div
                        className="bg-blue-700 h-3 transition-all duration-700 ease-out shadow-sm 
                         rounded-lg"
                        style={{
                          width: `${Math.min(30, 100)}%`,
                        }}
                      ></div>
                    </div>
                    {/* Progress indicator dots */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 flex justify-between px-1 -translate-y-px">
                      <div className="w-0.5 h-0.5 bg-blue-300 opacity-60"></div>
                      <div className="w-0.5 h-0.5 bg-blue-300 opacity-60"></div>
                      <div className="w-0.5 h-0.5 bg-blue-300 opacity-60"></div>
                      <div className="w-0.5 h-0.5 bg-blue-300 opacity-60"></div>
                    </div>
                  </div>
                  <p className="text-blue-600 text-sm font-medium">
                    30% completed
                  </p>
                </div>
              </div>
  
              {/* Upcoming Events */}
      


            </div>
  
            {/* Helpdesk */}
       
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Admin Apps</h3>
                <span className="text-blue-600 text-sm cursor-pointer">View All</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
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
          </div>
        </div>
      </div>
      </DesktopLayoutWrapper>
    )
  }
  