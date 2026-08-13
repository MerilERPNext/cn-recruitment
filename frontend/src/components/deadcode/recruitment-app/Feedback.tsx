import type React from "react"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useNavigate, useParams } from "react-router"
import {
  useInterviewRoundData,
  useInterviewForFeedback,
  useFeedbackSubmission,
  isPermissionError,
} from "../../../hooks/useFeedbackQuery"
import { AlertCircle, RefreshCw, ArrowLeft, X } from "lucide-react"
import type {
  FeedbackForm,
  SkillAssessment,
  CompetencyRating,
  Interview,
  ExpectedSkillSet,
  StarRatingProps,
  FeedbackSubmissionData,
} from "../../../types/feedback"

export default function InterviewFeedbackForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  console.log(`🎯 InterviewFeedbackForm initialized with ID: ${id}`)

  // React Query hooks
  const {
    data: interviewResponse,
    isLoading: interviewLoading,
    error: interviewError,
    refetch: refetchInterview,
  } = useInterviewForFeedback({ interview_id: id || "" }, { enabled: !!id })

  // Get interview round data based on interview details
  const {
    data: roundResponse,
    isLoading: roundLoading,
    error: roundError,
    refetch: refetchRound,
  } = useInterviewRoundData(
    { interview_round: interviewResponse?.interview?.interview_round || "" },
    { enabled: !!interviewResponse?.interview?.interview_round },
  )

  const feedbackMutation = useFeedbackSubmission()

  // Process interview data with proper type checking
  const interviewData: Partial<Interview> | undefined = useMemo(() => {
    const interview = interviewResponse?.interview
    console.log(`📋 Interview data processed:`, interview)
    return interview
  }, [interviewResponse])

  // Process skills from interview round with proper type checking
  const expectedSkills: ExpectedSkillSet[] = useMemo(() => {
    const skills = roundResponse?.data?.expected_skill_set || []
    console.log(`📋 Expected skills processed:`, skills)
    return skills
  }, [roundResponse])

  // Initialize form data
  const initialFormData: FeedbackForm = useMemo(
    () => ({
      interview: "",
      interviewer: [], // Always initialize as array
      interview_round: "",
      job_applicant: "",
      competencies: [],
      technicalFeedback: "",
      communicationFeedback: "",
      culturalFitFeedback: "",
      overallImpression: "",
      recommendation: "",
      detailedComments: "",
      nextSteps: "",
      attachments: [],
      skillAssessment: [],
    }),
    [],
  )

  const [formData, setFormData] = useState<FeedbackForm>(initialFormData)

  // Function to show error popup
  const showError = useCallback((message: string) => {
    setErrorMessage(message)
    setShowErrorModal(true)
  }, [])

  // Update form data when skills are loaded
  useEffect(() => {
    if (expectedSkills.length > 0) {
      const initialCompetencies: CompetencyRating[] = expectedSkills.map((skill) => ({
        name: skill.skill,
        description: skill.description || "",
        rating: 0,
      }))

      const initialSkillAssessment: SkillAssessment[] = expectedSkills.map((skill) => ({
        skill: skill.skill,
        description: skill.description || "",
        rating: "0.0",
      }))

      setFormData((prev) => ({
        ...prev,
        competencies: initialCompetencies,
        skillAssessment: initialSkillAssessment,
      }))

      console.log(`🔧 Form data updated with skills:`, {
        initialCompetencies,
        initialSkillAssessment,
      })
    }
  }, [expectedSkills])

  // Update form data when interview details are loaded with null checks
  useEffect(() => {
    if (interviewData && Object.keys(interviewData).length > 0) {
      const interviewerEmails: string[] = interviewData.interview_details?.map((item) => item.interviewer) || []

      setFormData((prev) => ({
        ...prev,
        interview: interviewData.name || "",
        interviewer: interviewerEmails,
        interview_round: interviewData.interview_round || "",
        job_applicant: interviewData.job_applicant || "",
      }))

      console.log(`🔧 Form data updated with interview details:`, {
        interview: interviewData.name,
        interviewer: interviewerEmails,
        interview_round: interviewData.interview_round,
        job_applicant: interviewData.job_applicant,
      })
    }
  }, [interviewData])

  const resetForm = useCallback(() => {
    // Reset competencies with current skills but zero ratings
    const resetCompetencies = formData.competencies.map((comp) => ({
      ...comp,
      rating: 0,
    }))

    // Reset skill assessments
    const resetSkillAssessment = formData.skillAssessment.map((skill) => ({
      ...skill,
      rating: "0.0",
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

    console.log(`🧹 Form reset`)
  }, [formData, initialFormData])

  // Function to update skill assessment rating with float values
  const updateSkillAssessmentRating = useCallback((index: number, rating: number) => {
    setFormData((prev) => {
      const updated = [...prev.skillAssessment]
      // Convert rating to float based on requirements (0-5 stars to 0.0-1.0)
      const floatRating = (rating * 0.2).toFixed(1)
      updated[index].rating = floatRating

      console.log(`⭐ Updated skill rating for ${updated[index].skill}: ${rating} stars = ${floatRating}`)
      return { ...prev, skillAssessment: updated }
    })
  }, [])

  const handleInputChange = useCallback((field: keyof FeedbackForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    console.log(`📝 Form field updated: ${field} = ${value}`)
  }, [])

  const handleBack = useCallback(() => {
    console.log(`🔙 Navigating back from feedback form`)
    navigate(-1)
  }, [navigate])

  // Function to calculate average skill assessment rating (for API payload - out of 1.0)
  const calculateAverageSkillRating = useCallback(() => {
    if (formData.skillAssessment.length === 0) return "0.0"

    // Filter out skills with rating "0" or empty rating
    const ratedSkills = formData.skillAssessment.filter(
      (skill) => skill.rating && skill.rating !== "0" && skill.rating !== "0.0",
    )

    if (ratedSkills.length === 0) return "0.0"

    const totalRating = ratedSkills.reduce((acc, curr) => acc + Number.parseFloat(curr.rating), 0)
    const average = (totalRating / ratedSkills.length).toFixed(2)

    console.log(`📊 Average skill rating calculated: ${average}`)
    return average
  }, [formData.skillAssessment])

  // Function to calculate display average rating (for UI display - out of 5.0)
  const calculateDisplayAverageRating = useCallback(() => {
    if (formData.skillAssessment.length === 0) return "0.0"

    // Filter out skills with rating "0" or empty rating
    const ratedSkills = formData.skillAssessment.filter(
      (skill) => skill.rating && skill.rating !== "0" && skill.rating !== "0.0",
    )

    if (ratedSkills.length === 0) return "0.0"

    // Convert back to star rating (multiply by 5 since we stored as rating * 0.2)
    const totalStarRating = ratedSkills.reduce((acc, curr) => acc + Number.parseFloat(curr.rating) * 5, 0)
    const averageStarRating = (totalStarRating / ratedSkills.length).toFixed(1)

    console.log(`⭐ Display average rating calculated: ${averageStarRating}`)
    return averageStarRating
  }, [formData.skillAssessment])

  // Update the submit handler to handle the response properly with better error handling
  const handleSubmit = useCallback(async () => {
    const apiData: FeedbackSubmissionData = {
      interview: formData.interview,
      interviewer: formData.interviewer,
      interview_round: formData.interview_round,
      result: formData.recommendation || "NA",
      job_applicant: formData.job_applicant,
      feedback: formData.detailedComments || "",
      rating: calculateAverageSkillRating(),
      skill_assessment: formData.skillAssessment.filter(
        (sa) => sa.skill && sa.rating && sa.rating !== "0" && sa.rating !== "0.0",
      ),
    }

    console.log("🚀 Submitting feedback:", apiData)

    try {
      const result = await feedbackMutation.mutateAsync(apiData)
      if (result.status === "success") {
        setShowSuccessModal(true)
        resetForm()
        console.log("✅ Feedback submitted successfully")
      } else {
        const errorMessage = result.message || "Submission failed"
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error("❌ Feedback submission error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      showError(`Error submitting feedback: ${errorMessage}`)
    }
  }, [formData, calculateAverageSkillRating, feedbackMutation, resetForm, showError])

  const handleRetry = useCallback(() => {
    console.log(`🔄 Retrying data fetch`)
    refetchInterview()
    refetchRound()
  }, [refetchInterview, refetchRound])

  // Enhanced StarRating component with half-star functionality
  const StarRating = useCallback(({ rating, onRatingChange }: StarRatingProps) => {
    const handleStarClick = (starIndex: number, event: React.MouseEvent) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const clickX = event.clientX - rect.left
      const starWidth = rect.width
      const isLeftHalf = clickX < starWidth / 2

      // Calculate rating based on click position
      const newRating = isLeftHalf ? starIndex - 0.5 : starIndex
      onRatingChange(newRating)
    }

    const renderStar = (starIndex: number) => {
      const isFullStar = rating >= starIndex
      const isHalfStar = rating >= starIndex - 0.5 && rating < starIndex

      return (
        <button
          key={starIndex}
          type="button"
          className="relative w-4 h-4 text-xl transition-all duration-200 hover:scale-110 focus:outline-none"
          onClick={(e) => handleStarClick(starIndex, e)}
        >
          {/* Background star (gray) */}
          <span className="absolute inset-0 text-gray-300">★</span>
          {/* Half star (left half) */}
          {isHalfStar && (
            <span
              className="absolute inset-0 text-yellow-400 overflow-hidden"
              style={{ clipPath: "polygon(0 0, 50% 0, 50% 100%, 0 100%)" }}
            >
              ★
            </span>
          )}
          {/* Full star */}
          {isFullStar && <span className="absolute inset-0 text-yellow-400">★</span>}
          {/* Hover effect overlay */}
          <span className="absolute inset-0 text-yellow-200 opacity-0 hover:opacity-100 transition-opacity">★</span>
        </button>
      )
    }

    return (
      <div className="flex gap-1 items-center">
        {[1, 2, 3, 4, 5].map(renderStar)}
        <span className="ml-2 text-sm text-gray-600"></span>
      </div>
    )
  }, [])

  // Success Modal Component
  const SuccessModal = useCallback(
    () => (
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
              onClick={() => navigate(`/webapp/recruitment-app`)}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium transition-colors"
            >
              Ok
            </button>
          </div>
        </div>
      </div>
    ),
    [navigate],
  )

  // Error Modal Component
  const ErrorModal = useCallback(
    () => (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Error</h3>
              </div>
              <button
                onClick={() => setShowErrorModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowErrorModal(false)}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    ),
    [errorMessage],
  )

  // Helper function to render interviewer display
  const renderInterviewer = useCallback(() => {
    return formData.interviewer.map((email, index) => (
      <span key={`interviewer-${email}-${index}`} className="block bg-gray-50 mt-2 rounded-lg p-3 border">
        {email}
      </span>
    ))
  }, [formData.interviewer])

  // Loading state
  if (interviewLoading || roundLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center max-w-4xl mx-auto">
            <button onClick={handleBack} className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Interview Feedback</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-gray-500">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-lg">Loading feedback form...</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state with improved error handling
  if (interviewError || roundError) {
    const error = interviewError || roundError
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center max-w-4xl mx-auto">
            <button onClick={handleBack} className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Interview Feedback</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md mx-auto text-center">
            {isPermissionError(error) ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    You don't have permission to access this feedback form. Please contact your administrator.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={handleRetry}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </button>
                    <button
                      onClick={handleBack}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Go Back
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="p-3 bg-red-100 rounded-full">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Form</h3>
                  <p className="text-sm text-gray-600 mb-4">{errorMessage}</p>
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Modal */}
      {showSuccessModal && <SuccessModal />}

      {/* Error Modal */}
      {showErrorModal && <ErrorModal />}

      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center max-w-4xl mx-auto">
          <button onClick={handleBack} className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
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
              <div className="">{renderInterviewer()}</div>
            </div>
          </div>
        </div>

        {/* Skill Assessment Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Skill Assessment</h2>
          <div className="space-y-4">
            {formData.skillAssessment.map((skill, index) => (
              <div key={skill.skill} className="bg-gray-50 rounded-lg border p-4">
                <div className="flex flex-row items-center md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{skill.skill}</h3>
                    <p className="text-gray-900">{skill.description}</p>
                  </div>
                  <div className="flex flex-col items-center md:items-end">
                    <StarRating
                      rating={Number.parseFloat(skill.rating) / 0.2 || 0} // Convert back to star rating for display
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
                  <div className="text-2xl font-bold text-green-600">{calculateDisplayAverageRating()}</div>
                  <div className="text-sm text-gray-500">out of 5.0</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recommendation */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Final Recommendation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {["Cleared", "Rejected"].map((option) => (
              <button
                key={option}
                onClick={() => handleInputChange("recommendation", option)}
                className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                  formData.recommendation === option
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
            disabled={feedbackMutation.isPending}
            className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {feedbackMutation.isPending ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
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
