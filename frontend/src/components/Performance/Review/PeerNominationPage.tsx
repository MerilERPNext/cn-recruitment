import React, { useState } from 'react';
import { Search, Sparkles, Check, Sparkle } from 'lucide-react';
import { Typography } from '../../shared/atoms/Typography';
import Button from '../../shared/atoms/Button';
import Badge from '../../shared/Badge';
import { Select } from '../../shared/atoms/Select';

const INITIAL_REVIEWERS = [
  {
    id: 1,
    initials: "KI",
    name: "Karthik Iyer",
    role: "Eng Lead · Platform",
    suggestionText: "Worked on Oxygen 2.0 (84 PRs)",
    selected: true,
  },
  {
    id: 2,
    initials: "NP",
    name: "Neha Patel",
    role: "Product Manager · Oxygen",
    suggestionText: "PM partner on dashboard rebuild",
    selected: true,
  },
  {
    id: 3,
    initials: "MS",
    name: "Mohit Sinha",
    role: "Sr. Designer · Recruitment",
    suggestionText: "Frequent design crit collaborator",
    selected: true,
  },
  {
    id: 4,
    initials: "RB",
    name: "Riya Banerjee",
    role: "Research Lead",
    suggestionText: "Joint research projects (3)",
    selected: true,
  },
  {
    id: 5,
    initials: "AB",
    name: "Aman Bhatt",
    role: "Frontend Eng",
    suggestionText: "Slack DMs (high freq) + 12 PRs",
    selected: false,
  },
  {
    id: 6,
    initials: "SD",
    name: "Shreya Das",
    role: "Content Strategist",
    suggestionText: "Cross-functional workshop facilitator",
    selected: false,
  },
  {
    id: 7,
    initials: "VR",
    name: "Vikram Rao",
    role: "Sr. Designer · LMS",
    suggestionText: "Design system v2 co-author",
    selected: false,
  },
  {
    id: 8,
    initials: "PM",
    name: "Priya Menon",
    role: "QA Lead",
    suggestionText: "Joint usability testing",
    selected: false,
  },
];

const PeerNominationPage = () => {
  const [reviewers, setReviewers] = useState(INITIAL_REVIEWERS);
  const [searchTerm, setSearchTerm] = useState("");
  const selectedCount = reviewers.filter(r => r.selected).length;

  const toggleSelection = (id: number) => {
    setReviewers(prev => prev.map(reviewer => 
      reviewer.id === id ? { ...reviewer, selected: !reviewer.selected } : reviewer
    ));
  };

  return (
    <div className="min-h-full bg-[#f8fafc] overflow-y-scroll p-4 sm:p-6 font-sans">
      <div className="max-w-5xl mx-auto flex flex-col">
        
        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col mb-6">
          
          {/* Top Header Section */}
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="mb-4">
                 <Badge label="Step 2 of 6 · Reviews" variant="purple" size="sm" />
              </div>
              <Typography variant="h3" className="mb-2 text-gray-900">Nominate Peer Reviewers</Typography>
              <Typography variant="bodyMedium" className="text-gray-600 max-w-2xl">
                Choose 4 people who've worked closely with you this cycle. Your manager will approve. Auto-suggestions from Slack, Jira and Figma below.
              </Typography>
            </div>
            <div className="flex flex-col items-end shrink-0 md:pl-6 md:border-l border-gray-100">
              <Typography variant="caption" className="text-gray-500 font-semibold tracking-wider mb-1">SELECTED</Typography>
              <div className="text-4xl font-brand text-blue-600 font-bold leading-none">
                {selectedCount} <span className="text-blue-600 text-3xl font-medium">/ 4</span>
              </div>
              <Typography variant="caption" className="text-gray-500 mt-2">min 3 · max 7</Typography>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 bg-white border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex-1 w-full flex border border-gray-200 rounded-lg overflow-hidden h-10 items-center focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all bg-white">
              <div className="pl-3 pr-2 text-gray-400">
                <Search className="w-4 h-4" />
              </div>
              <input 
                type="text" 
                placeholder="Search PW employees by name, team or BU..." 
                className="flex-1 h-full outline-none text-sm text-gray-900 placeholder:text-gray-400 bg-transparent w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="w-[140px] shrink-0">
                <Select 
                  options={[{label: "India Tech BU", value: "india_tech"}]} 
                  value={{label: "India Tech BU", value: "india_tech"}} 
                  onChange={()=>{}} 
                  className="!w-full [&>button]:h-10 [&>button]:py-0 [&>button]:shadow-none"
                />
              </div>
              <Button 
                variant="soft" 
                className="whitespace-nowrap text-purple-700 bg-purple-50 hover:bg-purple-100 h-10 px-4" 
                icon={<Sparkles className="w-4 h-4 text-purple-500" />}
              >
                AI suggestions (8)
              </Button>
            </div>
          </div>

          {/* List Header */}
          <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex justify-between items-center">
            <Typography variant="caption" className="font-semibold text-gray-500 tracking-wider">SUGGESTED REVIEWERS (8)</Typography>
            <Typography variant="caption" className="text-gray-500">Inferred from Slack, Jira & Figma · last 90 days</Typography>
          </div>

          {/* List Content */}
          <div className="flex flex-col divide-y divide-gray-100">
            {reviewers.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())).map((reviewer) => (
              <div key={reviewer.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition-colors gap-4">
                
                {/* User Info */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                    {reviewer.initials}
                  </div>
                  <div>
                    <Typography variant="bodyMedium" className="font-bold text-gray-900">{reviewer.name}</Typography>
                    <Typography variant="caption" className="text-gray-500 block mt-0.5">{reviewer.role}</Typography>
                  </div>
                </div>
                
                {/* Action & Badge */}
                <div className="flex items-center gap-4 md:ml-auto">
                  <div>
                    <Badge label={reviewer.suggestionText} variant="purple" size="sm" icon={<Sparkle className="w-3.5 h-3.5" />} />
                  </div>
                  {reviewer.selected ? (
                    <Button 
                      variant="contain" 
                      bgColor="primary" 
                      className="w-28 shadow-sm flex items-center justify-center gap-1.5"
                      onClick={() => toggleSelection(reviewer.id)}
                    >
                      <Check className="w-4 h-4" /> Selected
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      bgColor="primary" 
                      className="w-28 bg-white flex items-center justify-center gap-1.5"
                      onClick={() => toggleSelection(reviewer.id)}
                    >
                      + Nominate
                    </Button>
                  )}
                </div>

              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default PeerNominationPage;