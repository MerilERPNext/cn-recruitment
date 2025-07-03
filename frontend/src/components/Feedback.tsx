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
  description: string
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
  const [skills, setSkills] = useState<string[]>([])

  console.log(skills, "skillsskills")

  const initialFormData: FeedbackForm = {
    interview: "",
    interviewer: "",
    interview_round: "",
    job_applicant: "",
    competencies: [], // Fixed: should be empty array, not empty string
    technicalFeedback: "",
    communicationFeedback: "",
    culturalFitFeedback: "",
    overallImpression: "",
    recommendation: "",
    detailedComments: "",
    nextSteps: "",
    attachments: [],
    skillAssessment: [{ skill: "",description:"", rating: "" }],
  }

  const [formData, setFormData] = useState<FeedbackForm>(initialFormData)

  // Fetch skills from API
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await fetch("/api/method/recruitment.api_interview.interview.get_skill_names")
        const data = await res.json()
  
        if (data.message.success && data.message.data) {
          const fetchedSkills = data.message.data
  
          setSkills(fetchedSkills)
  
          const initialCompetencies = fetchedSkills.map((skill: any) => ({
            name: skill.skill_name,
            description: skill.description || "",
            rating: 0,
          }))
  
          const initialSkillAssessment = fetchedSkills.map((skill: any) => ({
            skill: skill.skill_name,
            description: skill.description || "",
            rating: "0",
          }))
  
          setFormData((prev) => ({
            ...prev,
            competencies: initialCompetencies,
            skillAssessment: initialSkillAssessment,
          }))
        }
      } catch (err) {
        console.error("Error fetching skills:", err)
      }
    }
  
    fetchSkills()
  }, [])
  
  


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
    // Reset competencies with current skills but zero ratings
    const resetCompetencies = formData.competencies.map((comp) => ({
      ...comp,
      rating: 0,
    }))

    // Reset skill assessments
    const resetSkillAssessment = formData.skillAssessment.map((skill) => ({
      ...skill,
      rating: "0",
    }))

    setFormData({
      ...initialFormData,
      // Keep the interview details from API
      interview: formData.interview,
      interviewer: formData.interviewer,
      interview_round: formData.interview_round,
      job_applicant: formData.job_applicant,
      competencies: resetCompetencies,
      skillAssessment: resetSkillAssessment,
    })
  }



  // NEW: Function to update skill assessment rating
  const updateSkillAssessmentRating = (index: number, rating: number) => {
    const updated = [...formData.skillAssessment]
    updated[index].rating = rating.toString()
    setFormData({ ...formData, skillAssessment: updated })
  }

  const handleInputChange = (field: keyof FeedbackForm, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleBack = () => {
    navigate(-1)
  }


  // NEW: Function to calculate average skill assessment rating
  const calculateAverageSkillRating = () => {
    if (formData.skillAssessment.length === 0) return 0

    // Filter out skills with rating "0" or empty rating
    const ratedSkills = formData.skillAssessment.filter(skill =>
      skill.rating && skill.rating !== "0" && skill.rating !== ""
    )

    if (ratedSkills.length === 0) return 0

    const totalRating = ratedSkills.reduce((acc, curr) => acc + parseInt(curr.rating), 0)
    return (totalRating / ratedSkills.length).toFixed(1)
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
        rating: calculateAverageSkillRating(),
        skill_assessment: formData.skillAssessment.filter((sa) => sa.skill && sa.rating && sa.rating !== "0"),
      }

      console.log("API Data being sent:", apiData) // Debug log

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

  const StarRating = ({
    rating,
    onRatingChange,
  }: {
    rating: number
    onRatingChange: (r: number) => void
  }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4].map((star) => (
        <button
          key={star}
          type="button"
          className={`w-6 h-6 text-2xl transition-all duration-200 hover:scale-110 ${star <= rating ? "text-yellow-400" : "text-gray-300 hover:text-yellow-200"
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
              {Array.isArray(formData.interviewer)
                ? formData.interviewer.map((item, index) => (
                  <div className=" mt-2 p-3 ">

                    <span key={index} className="mr-2">
                      {item}
                    </span>



                  </div>
                ))
                : formData.interviewer || "Loading..."}
            </div>
          </div>
        </div>

        {/* Skill Assessment Section - NEW */}
        <div className="bg-white rounded-lg shadow-sm border p-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Skill Assessment</h2>
          <div className="space-y-4">
            {formData.skillAssessment.map((skill, index) => (
              <div key={skill.skill} className="bg-gray-50 rounded-lg border p-4">
                <div className="flex flex-row items-center md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{skill.skill}</h3>
                    <p className=" text-gray-900">{skill.description}</p>
                  </div>
                  <div className="flex flex-col items-center md:items-end">
                    <StarRating
                      rating={parseInt(skill.rating) || 0}
                      onRatingChange={(r) => updateSkillAssessmentRating(index, r)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Skill Average Rating Display */}
          {formData.skillAssessment.length > 0 && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Overall Skill Rating</h4>
                  <p className="text-sm text-gray-600">Average of all skill ratings</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{calculateAverageSkillRating()}</div>
                  <div className="text-sm text-gray-500">out of 5</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Feedback Sections */}


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