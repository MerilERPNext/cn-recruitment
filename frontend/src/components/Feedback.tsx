/* eslint-disable @typescript-eslint/no-explicit-any */

"use client"

import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"

interface CompetencyRating {
  name: string
  description: string
  rating: number
}

interface SkillAssessment {
  skill: string
  rating: string
}

interface FeedbackForm {
  interview: string
  interviewer: string
  interview_round: string
  job_applicant: string
  competencies: CompetencyRating[]
  technicalFeedback: string
  communicationFeedback: string
  culturalFitFeedback: string
  overallImpression: string
  recommendation: string
  detailedComments: string
  nextSteps: string
  attachments: File[]
  skillAssessment: SkillAssessment[]
}


export default function InterviewFeedbackForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [interviewId, setInterviewId] = useState<string>("")
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    technical: false,
    communication: false,
    cultural: false,
  })
  const [skills, setSkills] = useState([])
  const [showSkillDropdown, setShowSkillDropdown] = useState<number | null>(null)
  console.log(skills, "skillsskills")
  const initialFormData: FeedbackForm = {
    interview: "",
    interviewer: "",
    interview_round: "",
    job_applicant: "",
    competencies: [
      { name: "Technical Skills", description: "Problem Solving, Coding Ability", rating: 0 },
      { name: "Communication", description: "Verbal Clarity, Written Skills", rating: 0 },
      { name: "Cultural Fit", description: "Teamwork, Adaptability", rating: 0 },
    ],
    technicalFeedback: "",
    communicationFeedback: "",
    culturalFitFeedback: "",
    overallImpression: "",
    recommendation: "",
    detailedComments: "",
    nextSteps: "",
    attachments: [],
    skillAssessment: [{ skill: "", rating: "" }],
  }

  const [formData, setFormData] = useState<FeedbackForm>(initialFormData)

  // Fetch skills from API
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await fetch("/api/method/recruitment.api_interview.interview.get_skill_names");
        const data = await res.json();

        console.log("Skill fetch response:", data.message.data);

        if (data.message.success && data.message.data) {
          setSkills(data.message.data); // now accessing inside `message`
        } else {
          console.warn("Skill fetch failed or empty:", data);
        }
      } catch (error) {
        console.error("Error fetching skills:", error);
      }
    };

    fetchSkills();
  }, []);



  useEffect(() => {
    if (id) {
      setInterviewId(id)
    }
  }, [id])

  useEffect(() => {
    const fetchInterviewData = async () => {
      if (!interviewId) return

      try {
        const res = await fetch(
          `/api/method/recruitment.api_interview.interview.get_interview_and_round?interview_id=${interviewId}`,
        )
        const data = await res.json()
        const interview = data?.message?.message?.interview

        if (interview) {
          const interviewerEmail =
            interview.interview_details?.map((item: { interviewer: any }) => item.interviewer) || []

          setFormData((prev) => ({
            ...prev,
            interview: interview.name || "",
            interviewer: interviewerEmail,
            interview_round: interview.interview_round || "",
            job_applicant: interview.job_applicant || "",
          }))
        }
      } catch (err) {
        console.error("Error fetching interview details:", err)
      }
    }

    fetchInterviewData()
  }, [interviewId])

  const resetForm = () => {
    setFormData({
      ...initialFormData,
      // Keep the interview details from API
      interview: formData.interview,
      interviewer: formData.interviewer,
      interview_round: formData.interview_round,
      job_applicant: formData.job_applicant,
    })
    setExpandedSections({
      technical: false,
      communication: false,
      cultural: false,
    })
  }

  const updateCompetencyRating = (index: number, rating: number) => {
    const updated = [...formData.competencies]
    updated[index].rating = rating
    setFormData({ ...formData, competencies: updated })
  }

  const handleInputChange = (field: keyof FeedbackForm, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const handleBack = () => {
    navigate(-1)
  }

  const calculateAverageRating = () => {
    const totalRating = formData.competencies.reduce((acc, curr) => acc + curr.rating, 0)
    return Math.round(totalRating / formData.competencies.length)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const apiData = {
        interview: formData.interview,
        interviewer: formData.interviewer,
        interview_round: formData.interview_round,
        result: formData.recommendation || "NA",
        job_applicant: formData.job_applicant,
        feedback: formData.detailedComments || "",
        rating: calculateAverageRating(),
        skill_assessment: formData.skillAssessment.filter(sa => sa.skill && sa.rating),
      }

      const res = await fetch("/api/method/recruitment.api_interview.interview.create_interview_feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      })

      const result = await res.json()

      if (res.ok && result.message?.status === "success") {
        setShowSuccessModal(true)
        resetForm() // Reset form after successful submission
      } else {
        throw new Error(result.message || "Submission failed")
      }
    } catch (error) {
      console.error("Submission error:", error)
      alert("Error submitting feedback")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkillSelect = (index: number, skillName: string) => {
    const updated = [...formData.skillAssessment]
    updated[index].skill = skillName
    setFormData({ ...formData, skillAssessment: updated })
    setShowSkillDropdown(null)
  }

  const StarRating = ({
    rating,
    onRatingChange,
  }: {
    rating: number
    onRatingChange: (r: number) => void
  }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`w-8 h-8 text-2xl transition-all duration-200 hover:scale-110 ${star <= rating ? "text-yellow-400" : "text-gray-300 hover:text-yellow-200"
            }`}
          onClick={() => onRatingChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  )

  // Success Modal Component
  const SuccessModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Feedback Submitted!</h3>
          <p className="text-gray-600 mb-6">
            Your interview feedback has been successfully recorded and saved to the system.
          </p>
          <button
            onClick={() => setShowSuccessModal(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium transition-colors"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Modal */}
      {showSuccessModal && <SuccessModal />}

      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center max-w-4xl mx-auto">
          <button onClick={handleBack} className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Interview Feedback</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Interview Information Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Interview Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interview ID</label>
              <div className="bg-gray-50 rounded-lg p-3 border">
                <span className="text-gray-900">{formData.interview || "Loading..."}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Applicant</label>
              <div className="bg-gray-50 rounded-lg p-3 border">
                <span className="text-gray-900">{formData.job_applicant || "Loading..."}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interview Round</label>
              <div className="bg-gray-50 rounded-lg p-3 border">
                <span className="text-gray-900">{formData.interview_round || "Loading..."}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Interviewer(s)</label>
              <div className="bg-gray-50 rounded-lg p-3 border">
                <span className="text-gray-900">
                  {Array.isArray(formData.interviewer)
                    ? formData.interviewer.join(", ")
                    : formData.interviewer || "Loading..."}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Competency Ratings */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Competency Assessment</h2>
          <div className="space-y-4">
            {formData.competencies.map((comp, index) => (
              <div key={comp.name} className="bg-gray-50 rounded-lg border p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{comp.name}</h3>
                    <p className="text-sm text-gray-600">{comp.description}</p>
                  </div>
                  <div className="flex flex-col items-center md:items-end">
                    <StarRating rating={comp.rating} onRatingChange={(r) => updateCompetencyRating(index, r)} />
                    <span className="text-sm text-gray-500 mt-1">
                      {comp.rating > 0 ? `${comp.rating}/5` : "Not rated"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Average Rating Display */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Overall Rating</h4>
                <p className="text-sm text-gray-600">Average of all competency ratings</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{calculateAverageRating()}</div>
                <div className="text-sm text-gray-500">out of 5</div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Feedback Sections */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Feedback</h2>
          <div className="space-y-3">
            {["technical", "communication", "cultural"].map((section) => (
              <div key={section} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection(section)}
                  className="w-full p-4 text-left flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900 capitalize">{section} Skills</span>
                    <span className="ml-2 text-sm text-gray-500">
                      {section === "technical" && "Problem solving, coding ability"}
                      {section === "communication" && "Verbal clarity, presentation"}
                      {section === "cultural" && "Teamwork, adaptability"}
                    </span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections[section] ? "rotate-180" : ""
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSections[section] && (
                  <div className="p-4 bg-white border-t">
                    <textarea
                      placeholder={`Share your observations about the candidate's ${section} skills...`}
                      value={formData[`${section}Feedback` as keyof FeedbackForm] as string}
                      onChange={(e) => handleInputChange(`${section}Feedback` as keyof FeedbackForm, e.target.value)}
                      rows={4}
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Final Recommendation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {["Cleared", "Rejected"].map((option) => (
              <button
                key={option}
                onClick={() => handleInputChange("recommendation", option)}
                className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${formData.recommendation === option
                    ? option === "Cleared"
                      ? "bg-green-50 border-green-500 text-green-700"
                      : "bg-red-50 border-red-500 text-red-700"
                    : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

{/* Skill Assessment */}
<div className="bg-white rounded-lg shadow-sm border p-6">
  <h2 className="text-lg font-semibold text-gray-900 mb-4">Skill Assessment</h2>
  <div className="space-y-4">
    {formData.skillAssessment.map((item, skillIndex) => (
      <div
        key={skillIndex}
        className="flex flex-col md:flex-row gap-4 items-start md:items-center p-4 bg-gray-50 rounded-lg border"
      >
        {/* Skill Dropdown */}
        <div className="flex-1 relative">
          <button
            onClick={() => setShowSkillDropdown(showSkillDropdown === skillIndex ? null : skillIndex)}
            className="w-full p-3 border rounded-lg text-left bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
          >
            <span className={item.skill ? "text-gray-900" : "text-gray-500"}>
              {item.skill || "Select a skill..."}
            </span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showSkillDropdown === skillIndex && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {skills.map((skill, skillListIndex) => (
                <button
                  key={skillListIndex}
                  onClick={() => handleSkillSelect(skillIndex, skill)}
                  className="w-full p-3 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0"
                >
                  <div className="font-medium text-gray-900">{skill}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Star Rating */}
        <div className="flex flex-col items-start md:items-center gap-1">
          <StarRating
            rating={Number(item.rating)}
            onRatingChange={(newRating) => {
              const updated = [...formData.skillAssessment];
              updated[skillIndex].rating = String(newRating);
              setFormData({ ...formData, skillAssessment: updated });
            }}
          />
          <span className="text-sm text-gray-500">{item.rating}/5</span>
        </div>

        {/* Delete Button */}
        <button
          onClick={() => {
            const updated = formData.skillAssessment.filter((_, i) => i !== skillIndex);
            setFormData({ ...formData, skillAssessment: updated });
          }}
          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    ))}
  </div>

  {/* Add Another Skill Button */}
  <button
    onClick={() =>
      setFormData({
        ...formData,
        skillAssessment: [...formData.skillAssessment, { skill: "", rating: "" }],
      })
    }
    className="mt-4 flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
  >
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
    Add Another Skill
  </button>
</div>



        {/* Detailed Comments */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Comments</h2>
          <textarea
            placeholder="Provide comprehensive feedback about the candidate's performance..."
            value={formData.detailedComments}
            onChange={(e) => handleInputChange("detailedComments", e.target.value)}
            rows={6}
            className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Sticky Footer Submit */}
      <div className="sticky bottom-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Submitting Feedback...
              </div>
            ) : (
              "Submit Interview Feedback"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}