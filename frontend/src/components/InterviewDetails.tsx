import { useMemo } from "react"
import { ArrowLeft, Calendar, Clock, Video, FileText, Copy, AlertCircle, RefreshCw } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { useInterviewAndRounds, isPermissionError } from "../hooks/useInterview"

const InterviewPage = () => {
  const { id: interviewId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  console.log(`🎯 InterviewPage initialized with ID: ${interviewId}`)

  const {
    data: interviewResponse,
    isLoading,
    error,
    refetch,
  } = useInterviewAndRounds(
    { interview_id: interviewId || "" },
    {
      enabled: !!interviewId,
    },
  )

  const interviewData = useMemo(() => {
    const data = interviewResponse?.interview
    console.log(`📋 Interview data processed:`, data)
    return data
  }, [interviewResponse?.interview])

  const rounds = useMemo(() => {
    const roundsData = interviewResponse?.rounds || []
    console.log(`🔄 Rounds data processed:`, roundsData)
    return roundsData
  }, [interviewResponse?.rounds])

  const getDuration = (fromTime: string, toTime: string): string => {
    if (!fromTime || !toTime) return "NA"
    const [fromHours, fromMinutes] = fromTime.split(":").map(Number)
    const [toHours, toMinutes] = toTime.split(":").map(Number)
    const fromDate = new Date()
    fromDate.setHours(fromHours, fromMinutes, 0)
    const toDate = new Date()
    toDate.setHours(toHours, toMinutes, 0)
    let diffMs = toDate.getTime() - fromDate.getTime()
    if (diffMs < 0) {
      diffMs += 24 * 60 * 60 * 1000
    }
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${diffHours}h ${diffMinutes}m`
  }

  const getFieldValue = (field: string) => field || "NA"

  const handleBackInterview = () => {
    navigate(-1)
  }

  const handleRedirect = () => {
    if (interviewData?.custom_resume_attachment) {
      window.open(window.location.origin + interviewData.custom_resume_attachment, "_blank")
    }
  }

  const handleButtonClick = () => {
    navigate(`/webapp/recruitment-app/interviews/interview-feedback/${interviewId}`)
  }

  const handleRetry = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <div className="relative flex size-full min-h-screen flex-col bg-[var(--background-light)]">
        <header className="sticky top-0 z-10 flex items-center bg-white/80 backdrop-blur-md p-4 pb-3 justify-between border-b border-slate-200">
          <button
            onClick={handleBackInterview}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-center flex-1 text-slate-900">Interview Details</h1>
          <div className="w-10 h-10"></div>
        </header>
        <div className="flex-grow flex items-center justify-center">
          <div className="flex items-center space-x-2 text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-lg">Loading interview details...</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="relative flex size-full min-h-screen flex-col bg-[var(--background-light)]">
        <header className="sticky top-0 z-10 flex items-center bg-white/80 backdrop-blur-md p-4 pb-3 justify-between border-b border-slate-200">
          <button
            onClick={handleBackInterview}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-center flex-1 text-slate-900">Interview Details</h1>
          <div className="w-10 h-10"></div>
        </header>
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="max-w-md mx-auto text-center">
            {isPermissionError(error) ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Access Restricted</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    You don't have permission to view this interview. Please contact your administrator for access.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={handleRetry}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </button>
                    <button
                      onClick={handleBackInterview}
                      className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
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
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Error Loading Interview</h3>
                  <p className="text-sm text-slate-600 mb-4">{error.message}</p>
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
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

  // No data state
  if (!interviewData) {
    return (
      <div className="relative flex size-full min-h-screen flex-col bg-[var(--background-light)]">
        <header className="sticky top-0 z-10 flex items-center bg-white/80 backdrop-blur-md p-4 pb-3 justify-between border-b border-slate-200">
          <button
            onClick={handleBackInterview}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-center flex-1 text-slate-900">Interview Details</h1>
          <div className="w-10 h-10"></div>
        </header>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium text-slate-900 mb-2">Interview Not Found</h3>
            <p className="text-sm text-slate-600 mb-4">The requested interview could not be found.</p>
            <button
              onClick={handleBackInterview}
              className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-[var(--background-light)]">
      <div className="flex-grow">
        <header className="sticky top-0 z-10 flex items-center bg-white/80 backdrop-blur-md p-4 pb-3 justify-between border-b border-slate-200">
          <button
            onClick={handleBackInterview}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-center flex-1 text-slate-900">Interview Details</h1>
          <div className="w-10 h-10"></div>
        </header>

        {/* Candidate Information */}
        <section>
          <h2 className="text-xl font-semibold px-4 pb-3 pt-6 text-slate-900">Candidate Information</h2>
          <div className="flex items-center gap-4 bg-white px-4 py-3 border-b border-slate-100">
            <div className="flex flex-col justify-center">
              <p className="text-slate-900 text-base font-medium">{getFieldValue(interviewData?.job_applicant)}</p>
              <p className="text-slate-600 text-sm">{getFieldValue(interviewData?.designation)}</p>
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
              <p className="text-slate-900 text-base font-medium">{getFieldValue(interviewData?.scheduled_on)}</p>
              <p className="text-slate-600 text-sm">{`${getFieldValue(interviewData?.from_time)} - ${getFieldValue(
                interviewData?.to_time,
              )}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white px-4 py-3">
            <div className="flex items-center justify-center rounded-xl bg-slate-100 w-12 h-12 text-slate-900">
              <Clock className="h-6 w-6" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-slate-900 text-base font-medium">Duration</p>
              <p className="text-slate-600 text-sm">{getDuration(interviewData?.from_time, interviewData?.to_time)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white px-4 py-3 border-b border-slate-100">
            <div className="flex items-center justify-center rounded-xl bg-slate-100 w-12 h-12 text-slate-900">
              <Video className="h-6 w-6" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-slate-900 text-base font-medium">Location</p>
              <p className="text-slate-600 text-sm">
                {getFieldValue(interviewData?.custom_interview_type) || "Video Call"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white px-4 py-3">
            <div className="flex items-center justify-center rounded-xl bg-slate-100 w-12 h-12 text-slate-900">
              <Video className="h-6 w-6" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-slate-900 text-base font-medium">Join Link</p>
              <p className="text-slate-600 text-sm flex items-center gap-2">
                <Copy className="h-5 w-5" />
                <a
                  href={getFieldValue(interviewData?.custom_zoom_link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {getFieldValue(interviewData?.custom_zoom_link)}
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Assigned Interviewers */}
        <section>
          <h2 className="text-xl font-semibold px-4 pb-3 pt-6 text-slate-900">Assigned Interviewers</h2>
          {interviewData?.interview_details?.length > 0 ? (
            interviewData.interview_details.map((int, index: number) => (
              <div key={`interviewer-${getFieldValue(int.custom_full_name)}-${index}`} className="flex items-center gap-4 bg-white px-4 py-3 border-b border-slate-100">
                <p className="text-slate-900 text-base font-medium flex-1">{getFieldValue(int.custom_full_name)}</p>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-4 bg-white px-4 py-3 border-b border-slate-100">
              <p className="text-slate-900 text-base font-medium flex-1">NA</p>
            </div>
          )}
        </section>

        {/* Interview Type */}
        <section>
          <h2 className="text-xl font-semibold px-4 pb-3 pt-6 text-slate-900">Interview Type</h2>
          <div className="flex items-center gap-4 bg-white px-4 py-3 border-b border-slate-100">
            <div className="flex-1">
              <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-semibold text-slate-900">
                {getFieldValue(interviewData?.interview_round)}
              </span>
            </div>
          </div>
        </section>

        {/* Preparation Materials */}
        <section>
          <h2 className="text-xl font-semibold px-4 pb-3 pt-6 text-slate-900">Preparation Materials</h2>
          <div 
           onClick={handleRedirect}
          className="flex items-center gap-4 bg-white px-4 py-3">
            <div
              className="flex items-center justify-center rounded-xl bg-slate-100 w-10 h-10 text-slate-900 cursor-pointer hover:bg-slate-200"
            >
              <FileText className="h-5 w-5" />
            </div>
            <p className="text-slate-900 text-base font-medium flex-1">Resume</p>
          </div>
        </section>

        {/* Rounds Information (if available) */}
        {rounds.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold px-4 pb-3 pt-6 text-slate-900">Interview Rounds</h2>
            {rounds.map((round, index: number) => (
              <div key={`round-${getFieldValue(round.round_name)}-${index}`} className="flex items-center gap-4 bg-white px-4 py-3 border-b border-slate-100">
                <div className="flex flex-col justify-center flex-1">
                  <p className="text-slate-900 text-base font-medium">{getFieldValue(round.round_name)}</p>
                  <p className="text-slate-600 text-sm">{getFieldValue(round.status)}</p>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      <footer className="sticky bottom-0 bg-white p-4 border-t border-slate-200">
        <button
          className="w-full bg-slate-900 text-white font-semibold py-3 px-4 rounded-xl hover:bg-slate-800 active:bg-slate-700 transition-colors duration-150"
          onClick={handleButtonClick}
        >
          Go to Feedback
        </button>
      </footer>
    </div>
  )
}

export default InterviewPage
