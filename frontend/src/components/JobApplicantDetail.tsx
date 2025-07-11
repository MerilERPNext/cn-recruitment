import { useState } from "react";
import {
  Phone,
  MessageCircle,
  Mail,
  History,
  User,
  FileText,
  Code,
  Clock,
  FolderOpen,
  StickyNote,
  Plus,
  Edit,
  Users,
  Share,
  Printer,
  Flag,
  Calendar,
  UserPlus,
  Video,
  Send,
  MessageSquare,
  RefreshCw,
  Home,
  Briefcase,
  Settings,
  ChevronRight,
  ChevronLeft,
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
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

// Mock applicant data
const mockApplicant: JobApplicant = {
  id: 1,
  name: "Ethan Harper",
  role: "Software Engineer",
  profileImage:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  email: "ethan.harper@example.com",
  status: "pending",
  phone: "+1-234-567-8900",
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
  return (
    <div className="p-4 flex items-center gap-4 bg-white border-b border-gray-200">
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
  );
};

const MenuSection = ({
  title,
  items,
}: {
  title: string;
  items: MenuItem[];
}) => {
  return (
    <div>
      <h3 className="text-slate-900 text-lg font-bold px-4 pb-2 pt-6">
        {title}
      </h3>
      <div className="bg-white">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={item.action}
            className="w-full flex items-center gap-4 bg-white p-4 cursor-pointer transition-all duration-300 hover:bg-gray-50 group"
          >
            <div className="flex items-center justify-center size-10 bg-white rounded-full shadow-sm text-blue-600 transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white">
              {item.icon}
            </div>
            <p className="text-base font-medium text-slate-900 flex-1 truncate text-left">
              {item.label}
            </p>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>
        ))}
      </div>
    </div>
  );
};

const BottomNavigation = ({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) => {
  const navItems = [
    { id: "home", label: "Home", icon: <Home className="h-5 w-5" /> },
    {
      id: "recruit",
      label: "Recruit",
      icon: <Briefcase className="h-5 w-5" />,
    },
    { id: "people", label: "People", icon: <Users className="h-5 w-5" /> },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  return (
    <footer className="sticky bottom-0 bg-white border-t border-gray-200 pt-2 pb-3">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-1 flex-col items-center justify-end gap-1 transition-colors duration-300 ${
              activeTab === item.id ? "text-blue-600" : "text-slate-400"
            }`}
          >
            {item.icon}
            <p className="text-xs font-medium">{item.label}</p>
          </button>
        ))}
      </div>
    </footer>
  );
};

export default function JobApplicantDetail() {
  const [activeTab, setActiveTab] = useState("recruit");
  const [applicant] = useState<JobApplicant>(mockApplicant);

  const handleBack = () => {
    console.log("Back button clicked");
    // TODO: Implement navigation back to applicant list
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    console.log("Tab changed to:", tab);
  };

  // Menu items for each section
  const contactItems: MenuItem[] = [
    {
      id: "call",
      label: "Call",
      icon: <Phone className="h-5 w-5" />,
      action: () => console.log("Call clicked"),
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: <MessageCircle className="h-5 w-5" />,
      action: () => console.log("WhatsApp clicked"),
    },
    {
      id: "email",
      label: "Email",
      icon: <Mail className="h-5 w-5" />,
      action: () => console.log("Email clicked"),
    },
    {
      id: "history",
      label: "Contact History",
      icon: <History className="h-5 w-5" />,
      action: () => console.log("Contact History clicked"),
    },
  ];

  const applicantInfoItems: MenuItem[] = [
    {
      id: "profile",
      label: "Profile",
      icon: <User className="h-5 w-5" />,
      action: () => console.log("Profile clicked"),
    },
    {
      id: "resume",
      label: "Resume",
      icon: <FileText className="h-5 w-5" />,
      action: () => console.log("Resume clicked"),
    },
    {
      id: "skills",
      label: "Skills",
      icon: <Code className="h-5 w-5" />,
      action: () => console.log("Skills clicked"),
    },
    {
      id: "timeline",
      label: "Timeline",
      icon: <Clock className="h-5 w-5" />,
      action: () => console.log("Timeline clicked"),
    },
    {
      id: "documents",
      label: "Documents",
      icon: <FolderOpen className="h-5 w-5" />,
      action: () => console.log("Documents clicked"),
    },
    {
      id: "notes",
      label: "Notes",
      icon: <StickyNote className="h-5 w-5" />,
      action: () => console.log("Notes clicked"),
    },
  ];

  const actionPanelItems: MenuItem[] = [
    {
      id: "create-interview",
      label: "Create Interview",
      icon: <Plus className="h-5 w-5" />,
      action: () => console.log("Create Interview clicked"),
    },
    {
      id: "status-update",
      label: "Status Update",
      icon: <Edit className="h-5 w-5" />,
      action: () => console.log("Status Update clicked"),
    },
    {
      id: "add-to-talent-pool",
      label: "Add to Talent Pool",
      icon: <UserPlus className="h-5 w-5" />,
      action: () => console.log("Add to Talent Pool clicked"),
    },
    {
      id: "share",
      label: "Share",
      icon: <Share className="h-5 w-5" />,
      action: () => console.log("Share clicked"),
    },
    {
      id: "print-export",
      label: "Print/Export",
      icon: <Printer className="h-5 w-5" />,
      action: () => console.log("Print/Export clicked"),
    },
    {
      id: "flag-followup",
      label: "Flag for Follow-up",
      icon: <Flag className="h-5 w-5" />,
      action: () => console.log("Flag for Follow-up clicked"),
    },
  ];

  const interviewManagementItems: MenuItem[] = [
    {
      id: "schedule",
      label: "Schedule",
      icon: <Calendar className="h-5 w-5" />,
      action: () => console.log("Schedule clicked"),
    },
    {
      id: "assign-interviewers",
      label: "Assign Interviewers",
      icon: <UserPlus className="h-5 w-5" />,
      action: () => console.log("Assign Interviewers clicked"),
    },
    {
      id: "interview-type",
      label: "Interview Type",
      icon: <Video className="h-5 w-5" />,
      action: () => console.log("Interview Type clicked"),
    },
    {
      id: "send-invites",
      label: "Send Invites",
      icon: <Send className="h-5 w-5" />,
      action: () => console.log("Send Invites clicked"),
    },
    {
      id: "feedback",
      label: "Feedback",
      icon: <MessageSquare className="h-5 w-5" />,
      action: () => console.log("Feedback clicked"),
    },
    {
      id: "reschedule-cancel",
      label: "Reschedule/Cancel",
      icon: <RefreshCw className="h-5 w-5" />,
      action: () => console.log("Reschedule/Cancel clicked"),
    },
  ];

  return (
    <div className="relative flex size-full min-h-screen flex-col justify-between bg-slate-50">
      <main className="flex-grow">
        <Header onBack={handleBack} />
        <ApplicantProfile applicant={applicant} />

        <div className="divide-y divide-gray-200">
          <MenuSection title="Contact & Communication" items={contactItems} />
          <MenuSection
            title="Applicant Information"
            items={applicantInfoItems}
          />
          <MenuSection title="Action Panel" items={actionPanelItems} />
          <MenuSection
            title="Interview Management"
            items={interviewManagementItems}
          />
        </div>
      </main>

      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
