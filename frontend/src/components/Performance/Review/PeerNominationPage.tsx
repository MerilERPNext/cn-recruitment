import React, { useState, Suspense, lazy } from 'react';
import { Typography } from '../../shared/atoms/Typography';

const PeerNominationHeader = lazy(() => import('./components/PeerNominationHeader').then(m => ({ default: m.PeerNominationHeader })));
const PeerNominationFilterBar = lazy(() => import('./components/PeerNominationFilterBar').then(m => ({ default: m.PeerNominationFilterBar })));
const ReviewerCard = lazy(() => import('./components/ReviewerCard').then(m => ({ default: m.ReviewerCard })));

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
          <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading...</div>}>
          
          <PeerNominationHeader selectedCount={selectedCount} />

          <PeerNominationFilterBar 
            searchTerm={searchTerm} 
            onSearchChange={setSearchTerm} 
          />

          {/* List Header */}
          <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex justify-between items-center">
            <Typography variant="caption" className="font-semibold text-gray-500 tracking-wider">SUGGESTED REVIEWERS (8)</Typography>
            <Typography variant="caption" className="text-gray-500">Inferred from Slack, Jira & Figma · last 90 days</Typography>
          </div>

          {/* List Content */}
          <div className="flex flex-col divide-y divide-gray-100">
            {reviewers.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())).map((reviewer) => (
              <ReviewerCard 
                key={reviewer.id} 
                reviewer={reviewer} 
                onToggleSelection={toggleSelection} 
              />
            ))}
          </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default PeerNominationPage;