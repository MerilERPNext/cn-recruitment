import { useState } from "react";
import { 
  Phone, 
  MessageCircle, 
  Mail, 
  ChevronDown,
  FileText,
  Download,
  Building,
  GraduationCap,
  Plus,
  Edit,
  Share,
  X,
  Paperclip,
  AtSign,
  ChevronLeft
} from "lucide-react";

// Types
interface JobApplicant {
  id: number;
  name: string;
  role: string;
  profileImage: string;
  email: string;
  phone: string;
  status: string;
  subStatus: string;
  location: string;
  experience: string;
  expectedCTC: string;
  noticePeriod: string;
}

// Mock applicant data
const mockApplicant: JobApplicant = {
  id: 1,
  name: "Jane Doe",
  role: "Senior Frontend Developer",
  profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  email: "jane.doe@example.com",
  phone: "+1 234 567 890",
  status: "Screening",
  subStatus: "HR Round",
  location: "San Francisco, CA",
  experience: "8 Years",
  expectedCTC: "$120,000 / Annum",
  noticePeriod: "30 Days"
};

const Header = ({ onBack }: { onBack: () => void }) => {
  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm">
      <div className="flex items-center p-4">
        <button onClick={onBack} className="text-slate-900 p-2 -ml-2">
          <ChevronLeft className="h-8 w-8" />
        </button>
        <h1 className="text-slate-900 text-xl font-bold text-center flex-1 pr-8">
          Applicant Details
        </h1>
      </div>
    </header>
  );
};

const ApplicantProfile = ({ applicant }: { applicant: JobApplicant }) => {
  const [status, setStatus] = useState(applicant.status);
  const [subStatus, setSubStatus] = useState(applicant.subStatus);

  const handleCall = () => console.log('Call clicked');
  const handleWhatsApp = () => console.log('WhatsApp clicked');
  const handleEmail = () => console.log('Email clicked');

  return (
    <div className="p-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4 mb-4">
        <img 
          alt="Applicant Avatar" 
          className="w-16 h-16 rounded-full object-cover" 
          src={applicant.profileImage} 
        />
        <div>
          <h2 className="text-xl font-bold text-slate-900">{applicant.name}</h2>
          <p className="text-sm text-slate-500">{applicant.role}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="relative flex-1">
          <select 
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full appearance-none bg-gray-100 border border-gray-300 text-slate-900 text-sm font-semibold rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          >
            <option>Sourced</option>
            <option>Screening</option>
            <option>Interview</option>
            <option>Offered</option>
            <option>Hired</option>
            <option>Rejected</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        
        <div className="relative flex-1">
          <select 
            value={subStatus}
            onChange={(e) => setSubStatus(e.target.value)}
            className="w-full appearance-none bg-gray-100 border border-gray-300 text-slate-900 text-sm font-semibold rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          >
            <option>HR Round</option>
            <option>Technical Round</option>
            <option>Awaiting Feedback</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center gap-2">
        <button 
          onClick={handleCall}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg font-semibold text-sm"
        >
          <Phone className="h-4 w-4" />
          Call
        </button>
        <button 
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-500 text-white rounded-lg font-semibold text-sm"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </button>
        <button 
          onClick={handleEmail}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-200 text-slate-900 rounded-lg font-semibold text-sm"
        >
          <Mail className="h-4 w-4" />
          Email
        </button>
      </div>
    </div>
  );
};

const TabContent = ({ activeTab, applicant }: { activeTab: string; applicant: JobApplicant }) => {
  const [noteText, setNoteText] = useState('');

  const handlePostNote = () => {
    if (noteText.trim()) {
      console.log('Note posted:', noteText);
      setNoteText('');
    }
  };

  if (activeTab === 'details') {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">Basic Information</h3>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
            <div>
              <p className="text-slate-500">Email</p>
              <p className="font-medium">{applicant.email}</p>
            </div>
            <div>
              <p className="text-slate-500">Phone</p>
              <p className="font-medium">{applicant.phone}</p>
            </div>
            <div>
              <p className="text-slate-500">Location</p>
              <p className="font-medium">{applicant.location}</p>
            </div>
            <div>
              <p className="text-slate-500">Experience</p>
              <p className="font-medium">{applicant.experience}</p>
            </div>
            <div>
              <p className="text-slate-500">Expected CTC</p>
              <p className="font-medium">{applicant.expectedCTC}</p>
            </div>
            <div>
              <p className="text-slate-500">Notice Period</p>
              <p className="font-medium">{applicant.noticePeriod}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-slate-500 mb-2">Resume</h4>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">Resume_JaneDoe.pdf</p>
                  <p className="text-xs text-slate-500">1.2 MB</p>
                </div>
              </div>
              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-full">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">Employment History</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Senior Frontend Developer</p>
                <p className="text-sm text-slate-500">Tech Solutions Inc.</p>
                <p className="text-xs text-slate-400">Jan 2020 - Present • 4 yrs 7 mos</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Frontend Developer</p>
                <p className="text-sm text-slate-500">Web Wizards LLC</p>
                <p className="text-xs text-slate-400">Jun 2017 - Dec 2019 • 2 yrs 7 mos</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">Education History</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <GraduationCap className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Stanford University</p>
                <p className="text-sm text-slate-500">Master of Science • MS, Computer Science</p>
                <p className="text-xs text-slate-400">2015 - 2017</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <GraduationCap className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">University of Texas at Austin</p>
                <p className="text-sm text-slate-500">Bachelor of Science • BS, Computer Science</p>
                <p className="text-xs text-slate-400">2011 - 2015</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">Next Steps</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50">
              <Plus className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Create Interview</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50">
              <Edit className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Update Status</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50">
              <Share className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Share Profile</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-gray-200 hover:bg-gray-50 text-red-600">
              <X className="h-5 w-5" />
              <span className="font-medium">Reject Applicant</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'timeline') {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">Applicant Timeline</h3>
          <div className="relative pl-6 space-y-6 border-l-2 border-gray-200">
            <div className="absolute -left-[11px] top-1.5 w-5 h-5 bg-blue-600 rounded-full border-4 border-white"></div>
            <div className="flex items-start gap-4">
              <div>
                <p className="font-semibold text-slate-900">Interview Scheduled</p>
                <p className="text-sm text-slate-500">Technical Round with John Smith</p>
                <p className="text-xs text-gray-500 mt-1">Today, 10:30 AM</p>
              </div>
            </div>
            <div className="absolute -left-[11px] top-[calc(50%-10px)] w-5 h-5 bg-gray-300 rounded-full border-4 border-white"></div>
            <div className="flex items-start gap-4">
              <div>
                <p className="font-semibold text-gray-600">Status Changed: Screening → Interview</p>
                <p className="text-sm text-slate-500">Sub-status changed to HR Round.</p>
                <p className="text-xs text-gray-500 mt-1">Yesterday, 4:15 PM by Sarah Wilson</p>
              </div>
            </div>
            <div className="absolute -left-[11px] bottom-1.5 w-5 h-5 bg-gray-300 rounded-full border-4 border-white"></div>
            <div className="flex items-start gap-4">
              <div>
                <p className="font-semibold text-gray-600">Application Submitted</p>
                <p className="text-sm text-slate-500">Applied for Senior Frontend Developer role.</p>
                <p className="text-xs text-gray-500 mt-1">2 days ago, 11:00 AM</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">Communication History</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-green-500 mt-1" />
              <div>
                <p className="font-medium text-sm">WhatsApp message sent</p>
                <p className="text-xs text-slate-500">Confirming interview schedule.</p>
                <p className="text-xs text-gray-400 mt-0.5">Today, 10:35 AM</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-blue-600 mt-1" />
              <div>
                <p className="font-medium text-sm">Outgoing call</p>
                <p className="text-xs text-slate-500">Duration: 5m 32s. Spoke about role expectations.</p>
                <p className="text-xs text-gray-400 mt-0.5">Yesterday, 4:00 PM</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="font-medium text-sm">Email sent</p>
                <p className="text-xs text-slate-500">Invitation for initial screening call.</p>
                <p className="text-xs text-gray-400 mt-0.5">2 days ago, 2:00 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'notes') {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-4">Internal Notes</h3>
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-1">
                <p className="font-semibold text-sm">Sarah Wilson</p>
                <p className="text-xs text-gray-500">Yesterday, 5:00 PM</p>
              </div>
              <p className="text-sm text-slate-500">
                <span className="font-medium text-black">Screening Feedback:</span> Very strong candidate. Good communication skills and relevant experience. Seems like a great culture fit. Proceeding to technical round.
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-1">
                <p className="font-semibold text-sm">Admin</p>
                <p className="text-xs text-gray-500">2 days ago, 1:30 PM</p>
              </div>
              <p className="text-sm text-slate-500">
                Initial review passed. Candidate meets all the basic qualifications for the role.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-bold text-lg mb-2">Add a Note</h3>
          <textarea 
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full h-24 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none"
            placeholder="Add internal comments, interview summaries, etc."
          />
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-500 hover:bg-gray-100 rounded-full">
                <Paperclip className="h-5 w-5" />
              </button>
              <button className="p-2 text-slate-500 hover:bg-gray-100 rounded-full">
                <AtSign className="h-5 w-5" />
              </button>
            </div>
            <button 
              onClick={handlePostNote}
              className="py-2 px-5 bg-blue-600 text-white rounded-lg font-semibold text-sm"
            >
              Post Note
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default function JobApplicantDetail() {
  const [activeTab, setActiveTab] = useState('details');
  const [applicant] = useState<JobApplicant>(mockApplicant);

  const handleBack = () => {
    console.log('Back buttons clicked');
    window.history.back(); 
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    console.log('Tab changed to:', tab);
  };


  return (
    <div className="relative flex size-full min-h-screen flex-col justify-between bg-slate-50">
      <main className="flex-grow">
        <Header onBack={handleBack} />
        <ApplicantProfile applicant={applicant} />
        
        <div className="bg-white">
          <div className="flex border-b border-gray-200">
            <button 
              onClick={() => handleTabChange('details')}
              className={`flex-1 py-3 px-2 text-sm font-medium text-center border-b-2 transition-colors duration-300 ${
                activeTab === 'details' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-slate-500 border-transparent hover:text-blue-600 hover:border-gray-300'
              }`}
            >
              Details
            </button>
            <button 
              onClick={() => handleTabChange('timeline')}
              className={`flex-1 py-3 px-2 text-sm font-medium text-center border-b-2 transition-colors duration-300 ${
                activeTab === 'timeline' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-slate-500 border-transparent hover:text-blue-600 hover:border-gray-300'
              }`}
            >
              Timeline
            </button>
            <button 
              onClick={() => handleTabChange('notes')}
              className={`flex-1 py-3 px-2 text-sm font-medium text-center border-b-2 transition-colors duration-300 ${
                activeTab === 'notes' 
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-slate-500 border-transparent hover:text-blue-600 hover:border-gray-300'
              }`}
            >
              Notes
            </button>
          </div>
        </div>
        
        <TabContent activeTab={activeTab} applicant={applicant} />
      </main>
      
    </div>
  );
}