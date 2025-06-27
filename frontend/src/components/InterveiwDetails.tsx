"use client"

import { useState } from "react"
import { ArrowLeft, Calendar, Clock, Video, Code, FileText, Folder, HelpCircle, Play, CheckCircle } from "lucide-react"
import { useNavigate } from "react-router";

const InterviewPage = () => {

  const [checklist, setChecklist] = useState({
    resume: false,
    questions: false,
    setup: false,
  })
  const navigate = useNavigate();

  const handleChecklistChange = (item: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }))
  }
  const handleBackInterview= () => {
    navigate(-1);
  };
  return (
    <div className="relative flex size-full min-h-screen flex-col bg-[var(--background-light)]">
      <div className="flex-grow">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center bg-white/80 backdrop-blur-md p-4 pb-3 justify-between border-b border-slate-200">
          <button 
          onClick={handleBackInterview}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-900">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-center flex-1 text-slate-900">Interview Details</h1>
          <div className="w-10 h-10"></div>
        </header>

        {/* Candidate Information */}
        <section>
          <h2 className="text-xl font-semibold px-4 pb-3 pt-6 text-slate-900">Candidate Information</h2>
          <div className="flex items-center gap-4 bg-white px-4 py-3 border-b border-slate-100">
            <div
              className="w-14 h-14 rounded-full bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage:
                  'url("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face")',
              }}
            />
            <div className="flex flex-col justify-center">
              <p className="text-slate-900 text-base font-medium">Ethan Harper</p>
              <p className="text-slate-600 text-sm">Software Engineer</p>
            </div>
          </div>
        </section>

        {/* Interview Schedule */}
        <section>
          <h2 className="text-xl font-semibold px-4 pb-3 pt-6 text-slate-900">Interview Schedule</h2>
          <div className="flex items-center gap-4 bg-white px-4 py-3">
            <div className="flex items-center justify-center rounded-xl bg-slate-100 w-12 h-12 text-slate-900">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-slate-900 text-base font-medium">Monday, July 15</p>
              <p className="text-slate-600 text-sm">10:00 AM - 11:00 AM</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white px-4 py-3">
            <div className="flex items-center justify-center rounded-xl bg-slate-100 w-12 h-12 text-slate-900">
              <Clock className="h-6 w-6" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-slate-900 text-base font-medium">Duration</p>
              <p className="text-slate-600 text-sm">1 hour</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-center rounded-xl bg-slate-100 w-12 h-12 text-slate-900">
              <Video className="h-6 w-6" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-slate-900 text-base font-medium">Location</p>
              <p className="text-slate-600 text-sm">Video Call</p>
            </div>
          </div>
        </section>

        {/* Assigned Interviewers */}
        <section>
          <h2 className="text-xl font-semibold px-4 pb-3 pt-6 text-slate-900">Assigned Interviewers</h2>
          <div className="flex items-center gap-4 bg-white px-4 py-3">
            <div
              className="w-10 h-10 rounded-full bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD4NppyMFVTmBvCqwALWOsusNJwjjAqfDndq6BXcY8jRnz9Ah9kKcvFGxjQDf50yY64GCDfl-GID1Z3Ru4Ys2M4ZSr26GD21bsJOo07mP_-SBvxKSlU31p8dKtpauf0psc8e7TQ8Q51KlWDKpSQ4qJ0ZPNnMab-OVcokOptRM7jmwdJh475Jub5a-b7NKLeTwdHxep9NzDNWlI9QBjCYXqJcPG6uA9jyEnItgshopCt-bPRrycK8lYHBIcqZ-YamVt5aPe5mvLCTdU1")',
              }}
            />
            <p className="text-slate-900 text-base font-medium flex-1">Dr. Olivia Bennett</p>
          </div>
          <div className="flex items-center gap-4 bg-white px-4 py-3 border-b border-slate-100">
            <div
              className="w-10 h-10 rounded-full bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage:
                  'url("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face")',
              }}
            />
            <p className="text-slate-900 text-base font-medium flex-1">Mr. Noah Carter</p>
          </div>
        </section>

        {/* Interview Type */}
        <section>
          <h2 className="text-xl font-semibold px-4 pb-3 pt-6 text-slate-900">Interview Type</h2>
          <div className="flex items-center gap-4 bg-white px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-center rounded-xl bg-slate-100 w-10 h-10 text-slate-900">
              <Code className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-slate-900">
                Technical Interview
              </span>
            </div>
          </div>
        </section>

        {/* Preparation Materials */}
        <section>
          <h2 className="text-xl font-semibold px-4 pb-3 pt-6 text-slate-900">Preparation Materials</h2>
          <div className="flex items-center gap-4 bg-white px-4 py-3">
            <div className="flex items-center justify-center rounded-xl bg-slate-100 w-10 h-10 text-slate-900">
              <FileText className="h-5 w-5" />
            </div>
            <p className="text-slate-900 text-base font-medium flex-1">Resume</p>
            <button className="flex items-center justify-center w-8 h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded">
              <CheckCircle className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-4 bg-white px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-center rounded-xl bg-slate-100 w-10 h-10 text-slate-900">
              <Folder className="h-5 w-5" />
            </div>
            <p className="text-slate-900 text-base font-medium flex-1">Portfolio</p>
            <button className="flex items-center justify-center w-8 h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded">
              <CheckCircle className="h-5 w-5" />
            </button>
          </div>
        </section>

        {/* Interview Questions Template */}
        <section>
          <h2 className="text-xl font-semibold px-4 pb-3 pt-6 text-slate-900">Interview Questions Template</h2>
          <div className="flex items-center gap-4 bg-white px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-center rounded-xl bg-slate-100 w-10 h-10 text-slate-900">
              <HelpCircle className="h-5 w-5" />
            </div>
            <p className="text-slate-900 text-base font-medium flex-1">Technical Questions</p>
            <button className="flex items-center justify-center w-8 h-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded">
              <Play className="h-5 w-5" />
            </button>
          </div>
        </section>

        {/* Pre-Interview Checklist */}
        <section>
          <h2 className="text-xl font-semibold px-4 pb-3 pt-6 text-slate-900">Pre-Interview Checklist</h2>
          <div className="px-4 pb-4">
            <label className="flex gap-x-3 py-3 items-center cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.resume}
                onChange={() => handleChecklistChange("resume")}
                className="h-5 w-5 rounded-md border-2 border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <p className="text-slate-900 text-base flex-1">{"Review candidate's resume and portfolio"}</p>
            </label>
            <label className="flex gap-x-3 py-3 items-center cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.questions}
                onChange={() => handleChecklistChange("questions")}
                className="h-5 w-5 rounded-md border-2 border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <p className="text-slate-900 text-base flex-1">Prepare technical questions</p>
            </label>
            <label className="flex gap-x-3 py-3 items-center cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.setup}
                onChange={() => handleChecklistChange("setup")}
                className="h-5 w-5 rounded-md border-2 border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <p className="text-slate-900 text-base flex-1">Confirm video call setup</p>
            </label>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="sticky bottom-0 bg-white p-4 border-t border-slate-200">
        <button className="w-full bg-slate-900 text-white font-semibold py-3 px-4 rounded-xl hover:bg-slate-800 active:bg-slate-700 transition-colors duration-150">
          Start Interview
        </button>
      </footer>
    </div>
  )
}
export default InterviewPage;