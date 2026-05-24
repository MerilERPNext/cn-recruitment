import  { useState } from 'react';
import Badge from '../../shared/Badge';
import { Typography } from '../../shared/atoms/Typography';
import { useScreenSize } from '../../../hooks/useScreenSize';
import { FileSignature, ArrowRight } from 'lucide-react';

const PerformanceReviewApp = () => {
  const [agreed, setAgreed] = useState(true);
  const [comment, setComment] = useState("");
  const { isMobile } = useScreenSize();

  return (
    <div className="min-h-full bg-[#f8fafc] overflow-y-auto p-4 sm:p-6 font-sans">
      <div className="max-w-screen mx-auto flex flex-col gap-6">
        
        {/* Header Banner */}
        <div className={`bg-blue-500 rounded-2xl p-6 md:p-8 flex ${isMobile ? 'flex-col' : 'flex-row'} justify-between items-start gap-6 text-white shadow-sm relative overflow-hidden`}>
          <div className="flex flex-col z-10 w-full">
            <div className="bg-white/20 text-blue-50 text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider w-fit mb-4">
              FINAL RATING · RELEASED 8 JUN 2026
            </div>
            <Typography variant="h1" className="text-3xl font-bold mb-2 text-white">FY26 Annual Performance Review</Typography>
            <Typography variant="bodyMedium" className="text-blue-100 font-medium">Pallavi Mahar · Sr. Product Designer · Oxygen</Typography>
          </div>
          
          <div className={`bg-white/20 border border-white/20 rounded-xl p-6 flex flex-col items-center justify-center ${isMobile ? 'w-full' : 'w-auto min-w-[200px]'} z-10`}>
            <Typography variant="caption" className="text-white text-xs font-bold uppercase tracking-widest mb-1">OVERALL RATING</Typography>
            <Typography variant="h1" className="text-4xl font-bold text-white mb-2">Exceeds</Typography>
            <Typography variant="bodyMedium" className="text-blue-100 text-sm font-medium">4 / 5</Typography>
          </div>

          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/5 rounded-md blur-3xl"></div>
          <div className="absolute -top-24 right-32 w-64 h-64 bg-white/5 rounded-md blur-3xl"></div>
        </div>

        {/* Section Breakdown Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col">
          <div className="mb-8">
            <Typography variant="h2" className="text-xl font-bold text-gray-900 mb-1">Section Breakdown</Typography>
            <Typography variant="bodyMedium" className="text-gray-500 text-sm">Weighted average across 3 sections · 5-Point Descriptive</Typography>
          </div>

          {/* Breakdown Items */}
          <div className="flex flex-col gap-8">
            {/* Item 1 */}
            <div className={`flex ${isMobile ? 'flex-col items-start gap-4' : 'flex-row items-center justify-between'} gap-4`}>
              <div className={`flex flex-col flex-1 ${!isMobile && 'pr-8'}`}>
                <Typography variant="body" className="text-gray-900 font-bold mb-1">Goals & KPIs <span className="text-gray-400 font-normal">- 60% weight</span></Typography>
                <Typography variant="bodyMedium" className="text-gray-500 italic text-sm">"Pallavi consistently shipped against goals; Oxygen 2.0 rollout is on plan."</Typography>
              </div>
              <div className={`flex items-center gap-4 sm:gap-8 shrink-0 ${isMobile ? 'w-full' : 'w-[240px]'} justify-between`}>
                <div className="flex flex-col flex-1 max-w-[100px]">
                  <Typography variant="caption" className="text-gray-500 mb-1">80%</Typography>
                  <div className="h-1.5 w-full bg-gray-100 rounded-md overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-md" style={{ width: '80%' }}></div>
                  </div>
                </div>
                <Badge label="Exceeds · 4/5" variant="success" size="sm" pulse={{show: false}} icon={<div className="w-1.5 h-1.5 rounded-md bg-green-500"></div>} />
              </div>
            </div>

            {/* Item 2 */}
            <div className={`flex ${isMobile ? 'flex-col items-start gap-4' : 'flex-row items-center justify-between'} gap-4`}>
              <div className={`flex flex-col flex-1 ${!isMobile && 'pr-8'}`}>
                <Typography variant="body" className="text-gray-900 font-bold mb-1">Competencies <span className="text-gray-400 font-normal">- 30% weight</span></Typography>
                <Typography variant="bodyMedium" className="text-gray-500 italic text-sm">"Standout in Craft and Cross-functional Partnership."</Typography>
              </div>
              <div className={`flex items-center gap-4 sm:gap-8 shrink-0 ${isMobile ? 'w-full' : 'w-[240px]'} justify-between`}>
                <div className="flex flex-col flex-1 max-w-[100px]">
                  <Typography variant="caption" className="text-gray-500 mb-1">100%</Typography>
                  <div className="h-1.5 w-full bg-gray-100 rounded-md overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-md" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <Badge label="Outstanding · 5/5" variant="success" size="sm" pulse={{show: false}} icon={<div className="w-1.5 h-1.5 rounded-md bg-green-500"></div>} />
              </div>
            </div>

            {/* Item 3 */}
            <div className={`flex ${isMobile ? 'flex-col items-start gap-4' : 'flex-row items-center justify-between'} gap-4`}>
              <div className={`flex flex-col flex-1 ${!isMobile && 'pr-8'}`}>
                <Typography variant="body" className="text-gray-900 font-bold mb-1">Career Growth <span className="text-gray-400 font-normal">- 10% weight</span></Typography>
                <Typography variant="bodyMedium" className="text-gray-500 italic text-sm">"Promotion-ready to Staff Designer in 12-18 months."</Typography>
              </div>
              <div className={`flex items-center gap-4 sm:gap-8 shrink-0 ${isMobile ? 'w-full' : 'w-[240px]'} justify-between`}>
                <div className="flex flex-col flex-1 max-w-[100px]">
                  <Typography variant="caption" className="text-gray-500 mb-1">80%</Typography>
                  <div className="h-1.5 w-full bg-gray-100 rounded-md overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-md" style={{ width: '80%' }}></div>
                  </div>
                </div>
                <Badge label="Exceeds · 4/5" variant="success" size="sm" pulse={{show: false}} icon={<div className="w-1.5 h-1.5 rounded-md bg-green-500"></div>} />
              </div>
            </div>
          </div>

          <hr className="my-8 border-t-[1.5px] border-gray-900" />

          {/* Weighted Final */}
          <div className="flex justify-between items-center">
            <Typography variant="h3" className="text-xl font-bold text-gray-900">Weighted Final</Typography>
            <div className="flex items-center gap-6">
              <Typography variant="h2" className="text-2xl font-bold text-gray-900">4.2</Typography>
              <Badge label="Exceeds · 4/5" variant="success" size="md" pulse={{show: false}} icon={<div className="w-1.5 h-1.5 rounded-md bg-green-500"></div>} />
            </div>
          </div>
        </div>

        {/* Acknowledge Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5 mb-12">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 border border-blue-100">
              <FileSignature className="w-5 h-5" />
            </div>
            <div className="flex flex-col mt-0.5">
              <Typography variant="h3" className="text-gray-900 font-bold text-lg mb-1">Acknowledge your Final Rating</Typography>
              <Typography variant="bodyMedium" className="text-gray-600 text-sm">
                Acknowledging confirms you've seen this rating. If you disagree, you can <span className="text-red-600 font-medium cursor-pointer hover:underline">Raise a Concern</span> within <strong>7 days</strong> — it goes to HRBP <strong>Aditi Sharma</strong>.
              </Typography>
            </div>
          </div>

          <textarea
            aria-label="Optional comment for manager"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comment for your manager..."
            className="w-full border border-gray-200 rounded-lg p-3 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none min-h-[80px]"
          />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center w-5 h-5 border rounded border-gray-300 bg-white group-hover:border-blue-500 transition-colors">
                <input 
                  aria-label="Confirm rating acknowledgement"
                  type="checkbox" 
                  className="peer sr-only"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <div className={`absolute inset-0 bg-blue-500 rounded border border-blue-500 transition-opacity ${agreed ? 'opacity-100' : 'opacity-0'}`}></div>
                <svg className={`absolute w-3.5 h-3.5 text-white transition-opacity ${agreed ? 'opacity-100' : 'opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <Typography variant="bodyMedium" className="text-sm text-gray-700 select-none">I have read and understood my rating</Typography>
            </label>

            <div className={`flex ${isMobile ? 'flex-col' : 'flex-row items-center'} items-stretch gap-3 w-full sm:w-auto`}>
              <button className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors" aria-label="Raise a concern">
                Raise a Concern
              </button>
              <button className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${agreed ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm' : 'bg-blue-300 text-white cursor-not-allowed'}`} aria-label="Acknowledge and e-sign performance review">
                Acknowledge & e-Sign <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PerformanceReviewApp;
