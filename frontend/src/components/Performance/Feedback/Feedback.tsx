import React, { useState, Suspense, lazy } from 'react';

const RatingCard = lazy(() => import('./components/RatingCard').then(m => ({ default: m.RatingCard })));
const FeedbackHeaderCard = lazy(() => import('./components/FeedbackHeaderCard').then(m => ({ default: m.FeedbackHeaderCard })));
const FeedbackRightSidebar = lazy(() => import('./components/FeedbackRightSidebar').then(m => ({ default: m.FeedbackRightSidebar })));

const Feedback = () => {
  const [ratings, setRatings] = useState({
    tech: { value: 5, comment: "" },
    cross: { value: 4, comment: "" },
    leadership: { value: 0, comment: "" }
  });

  const [activeReviewId, setActiveReviewId] = useState('KI');

  const openReviews = [
    { id: 'KI', name: 'Karthik Iyer', role: 'Eng Lead · Oxygen Platform', status: 'NOW' },
    { id: 'NP', name: 'Neha Patel', role: 'Product Manager · Oxygen', status: '—' },
    { id: 'MS', name: 'Mohit Sinha', role: 'Sr. Designer · Recruitment', status: 'done' },
    { id: 'RB', name: 'Riya Banerjee', role: 'Research Lead', status: '—' },
  ];

  const activeReview = openReviews.find(r => r.id === activeReviewId) || openReviews[0];

  return (
    <div className="min-h-full bg-[#f8fafc] overflow-y-scroll p-4 sm:p-6 font-sans">
      <Suspense fallback={<div className="p-6 text-center text-gray-500">Loading...</div>}>
      <div className="max-w-[1300px] mx-auto flex flex-col xl:flex-row gap-6">
        
        {/* Main Content (Left) */}
        <div className="flex-1 flex flex-col min-w-0">
          
          <FeedbackHeaderCard activeReview={activeReview} />

          {/* Feedback Form */}
          <div className="flex flex-col">
            <RatingCard 
              title="Technical Excellence"
              description="Designs & delivers complex systems with quality, scale and craft."
              value={ratings.tech.value}
              onChange={(val) => setRatings(prev => ({...prev, tech: {...prev.tech, value: val}}))}
              comment={ratings.tech.comment}
              onCommentChange={(val) => setRatings(prev => ({...prev, tech: {...prev.tech, comment: val}}))}
            />

            <RatingCard 
              title="Cross-functional Partnership"
              description="Collaborates effectively with Design, Product and QA."
              value={ratings.cross.value}
              onChange={(val) => setRatings(prev => ({...prev, cross: {...prev.cross, value: val}}))}
              comment={ratings.cross.comment}
              onCommentChange={(val) => setRatings(prev => ({...prev, cross: {...prev.cross, comment: val}}))}
            />

            <RatingCard 
              title="Leadership & Influence"
              description="Sets technical direction; coaches engineers; communicates trade-offs."
              value={ratings.leadership.value}
              onChange={(val) => setRatings(prev => ({...prev, leadership: {...prev.leadership, value: val}}))}
              comment={ratings.leadership.comment}
              onCommentChange={(val) => setRatings(prev => ({...prev, leadership: {...prev.leadership, comment: val}}))}
            />
          </div>
        </div>

        <FeedbackRightSidebar 
          openReviews={openReviews} 
          activeReviewId={activeReviewId} 
          onSelectReview={setActiveReviewId} 
        />

      </div>
      </Suspense>
    </div>
  );
};

export default Feedback;