import React, { useState } from 'react';
import { 
  User, 
  Target, 
  PieChart, 
  Award, 
  TrendingUp, 
  FileText, 
  Briefcase, 
  Star, 
  ChevronRight
} from 'lucide-react';

// --- Types ---
interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

// --- Data ---
const MENU_ITEMS: SidebarItem[] = [
  { id: 'goals-kra', label: 'Goals / Key Result Areas', icon: Target },
  { id: 'goals-overall', label: 'Goals Overall', icon: PieChart },
  { id: 'competencies', label: 'Competencies', icon: Award },
  { id: 'competencies-overall', label: 'Competencies Overall', icon: TrendingUp },
  { id: 'forms', label: 'Forms', icon: FileText },
  { id: 'promotion', label: 'Promotion Assessment', icon: Briefcase },
  { id: 'review', label: 'Overall Review', icon: Star },
];

const UserProfile = () => (
  <div className="flex items-center gap-3 p-4 mb-4 bg-slate-50 rounded-xl border border-slate-100">
    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm">
      <User size={20} />
    </div>
    <div className="flex flex-col">
      <span className="text-sm font-semibold text-slate-900 leading-tight">
        Ishaan Bisht
      </span>
      <span className="text-xs font-medium text-slate-500">
        PW2396
      </span>
    </div>
  </div>
);

const ReviewSidebar = () => {
  const [activeId, setActiveId] = useState<string>('goals-kra');

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar Container */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm">
        
        {/* User Profile Section */}
        <div className="px-4 mt-2">
          <UserProfile />
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-2">
            Performance Management
          </p>
          
          {MENU_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveId(item.id)}
                className={`
                  w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon 
                    size={18} 
                    className={`${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} 
                  />
                  <span>{item.label}</span>
                </div>
                
                {/* Active Indicator Chevron */}
                {isActive && <ChevronRight size={16} className="text-blue-400" />}
              </button>
            );
          })}
        </nav>
      </aside>

    </div>
  );
}


export default ReviewSidebar;