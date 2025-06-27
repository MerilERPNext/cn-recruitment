import { useState } from "react"
import { X, Star, Upload, Plus } from "lucide-react"
import { useNavigate } from 'react-router-dom';

interface CompetencyRating {
  name: string
  description: string
  rating: number
}

interface FeedbackForm {
  competencies: CompetencyRating[]
  technicalFeedback: string
  communicationFeedback: string
  culturalFitFeedback: string
  overallImpression: string
  recommendation: string
  detailedComments: string
  nextSteps: string
}

export default function InterviewFeedbackForm() {
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<FeedbackForm>({
    competencies: [
      { name: "Technical Skills", description: "Problem Solving, Coding Ability", rating: 4 },
      { name: "Communication", description: "Verbal Clarity, Written Skills", rating: 3 },
      { name: "Cultural Fit", description: "Teamwork, Adaptability", rating: 4 },
    ],
    technicalFeedback: "",
    communicationFeedback: "",
    culturalFitFeedback: "",
    overallImpression: "",
    recommendation: "",
    detailedComments: "",
    nextSteps: "",
  })

  const updateCompetencyRating = (index: number, rating: number) => {
    const updatedCompetencies = [...formData.competencies]
    updatedCompetencies[index].rating = rating
    setFormData({ ...formData, competencies: updatedCompetencies })
  }

  const handleTextareaChange = (field: keyof FeedbackForm, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleRecommendationChange = (value: string) => {
    setFormData({ ...formData, recommendation: value })
  }

  const handleSubmit = () => {
    console.log("Form submitted:", formData)
    // Handle form submission logic here
  }
  const handleInterviewFeedbackclose= () => {
    navigate(-1);
  };
  

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const StarRating = ({ rating, onRatingChange }: { rating: number; onRatingChange: (rating: number) => void }) => {
   
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 cursor-pointer transition-colors duration-200 ${
              star <= rating ? "fill-blue-500 text-blue-500" : "text-gray-400 hover:text-gray-600"
            }`}
            onClick={() => onRatingChange(star)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen bg-[var(--background-light)] flex-col justify-between font-sans">
      <div className="flex-grow pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md">
          <div className="flex items-center p-4 justify-between border-b border-gray-300">
            <button
            onClick={handleInterviewFeedbackclose} 
            className="text-gray-900 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h1 className="text-gray-900 text-xl font-semibold leading-tight tracking-tight">Interview Feedback</h1>
            <div className="size-10 shrink-0"></div>
          </div>
        </header>

        <main className="px-4 pt-6 space-y-6">
          {/* Competency Ratings */}
          <section>
            <h2 className="text-gray-900 text-lg font-semibold leading-tight tracking-tight mb-3">
              Competency Ratings
            </h2>
            <div className="space-y-1">
              {formData.competencies.map((competency, index) => (
                <div
                  key={competency.name}
                  className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-300 justify-between"
                >
                  <div className="flex flex-col justify-center flex-1">
                    <p className="text-gray-900 text-base font-medium leading-normal">{competency.name}</p>
                    <p className="text-gray-600 text-sm font-normal leading-normal">{competency.description}</p>
                  </div>
                  <div className="shrink-0">
                    <StarRating
                      rating={competency.rating}
                      onRatingChange={(rating) => updateCompetencyRating(index, rating)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Structured Feedback */}
          <section>
            <h2 className="text-gray-900 text-lg font-semibold leading-tight tracking-tight mb-3">
              Structured Feedback
            </h2>
            <div className="space-y-4">
              <label className="flex flex-col">
                <span className="text-gray-600 text-sm font-medium mb-1">Technical Skills</span>
                <textarea
                  className="min-h-[100px] w-full resize-none rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 bg-white placeholder:text-gray-600 p-3 text-base font-normal leading-normal"
                  placeholder="Observations on technical proficiency..."
                  value={formData.technicalFeedback}
                  onChange={(e) => handleTextareaChange("technicalFeedback", e.target.value)}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-gray-600 text-sm font-medium mb-1">Communication</span>
                <textarea
                  className="min-h-[100px] w-full resize-none rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 bg-white placeholder:text-gray-600 p-3 text-base font-normal leading-normal"
                  placeholder="Effectiveness in conveying ideas..."
                  value={formData.communicationFeedback}
                  onChange={(e) => handleTextareaChange("communicationFeedback", e.target.value)}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-gray-600 text-sm font-medium mb-1">Cultural Fit</span>
                <textarea
                  className="min-h-[100px] w-full resize-none rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 bg-white placeholder:text-gray-600 p-3 text-base font-normal leading-normal"
                  placeholder="Alignment with company values and team dynamics..."
                  value={formData.culturalFitFeedback}
                  onChange={(e) => handleTextareaChange("culturalFitFeedback", e.target.value)}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-gray-600 text-sm font-medium mb-1">Overall Impression</span>
                <textarea
                  className="min-h-[100px] w-full resize-none rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 bg-white placeholder:text-gray-600 p-3 text-base font-normal leading-normal"
                  placeholder="General thoughts and observations..."
                  value={formData.overallImpression}
                  onChange={(e) => handleTextareaChange("overallImpression", e.target.value)}
                />
              </label>
            </div>
          </section>

          {/* Recommendation */}
          <section>
            <h2 className="text-gray-900 text-lg font-semibold leading-tight tracking-tight mb-3">Recommendation</h2>
            <div className="grid grid-cols-2 gap-3">
              {["Strong Hire", "Hire", "No Hire", "Strong No Hire"].map((option) => (
                <label
                  key={option}
                  className={`text-sm font-medium leading-normal flex items-center justify-center rounded-xl border-2 px-4 py-3 text-center cursor-pointer transition-all hover:border-blue-500 ${
                    formData.recommendation === option
                      ? "bg-blue-100 border-blue-500 text-blue-500 font-semibold"
                      : "border-gray-300 text-gray-900"
                  }`}
                >
                  <input
                    type="radio"
                    name="recommendation"
                    value={option}
                    checked={formData.recommendation === option}
                    onChange={(e) => handleRecommendationChange(e.target.value)}
                    className="sr-only"
                  />
                  {option}
                </label>
              ))}
            </div>
          </section>

          {/* Detailed Comments */}
          <section>
            <h2 className="text-gray-900 text-lg font-semibold leading-tight tracking-tight mb-3">Detailed Comments</h2>
            <label className="flex flex-col">
              <textarea
                className="min-h-[100px] w-full resize-none rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 bg-white placeholder:text-gray-600 p-3 text-base font-normal leading-normal"
                placeholder="Add any additional comments here..."
                value={formData.detailedComments}
                onChange={(e) => handleTextareaChange("detailedComments", e.target.value)}
              />
            </label>
          </section>

          {/* Next Steps Recommendations */}
          <section>
            <h2 className="text-gray-900 text-lg font-semibold leading-tight tracking-tight mb-3">
              Next Steps Recommendations
            </h2>
            <label className="flex flex-col">
              <textarea
                className="min-h-[100px] w-full resize-none rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 bg-white placeholder:text-gray-600 p-3 text-base font-normal leading-normal"
                placeholder="Suggest next actions, e.g., further interviews, background check..."
                value={formData.nextSteps}
                onChange={(e) => handleTextareaChange("nextSteps", e.target.value)}
              />
            </label>
          </section>

          {/* Attachments */}
          <section>
      <h2 className="text-gray-900 text-lg font-semibold leading-tight tracking-tight mb-3">
        Attachments
      </h2>

      <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center">
        <Upload className="w-10 h-10 text-gray-600" />
        <p className="text-gray-900 text-base font-medium">Attach Files</p>
        <p className="text-gray-600 text-sm">
          Add relevant documents or files (e.g., resume, portfolio)
        </p>

        <label className="flex items-center justify-center gap-2 rounded-full h-10 px-6 bg-gray-100 text-gray-900 text-sm font-semibold hover:bg-gray-200 transition-colors cursor-pointer">
          <Plus className="w-4 h-4" />
          <span className="truncate">Browse Files</span>
          <input type="file" onChange={handleFileChange} className="hidden" />
        </label>

        {selectedFile && (
          <div className="text-sm text-gray-800 mt-2">
            Selected File: <span className="font-medium">{selectedFile.name}</span>
          </div>
        )}
      </div>
    </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-300 p-4">
        <button
          onClick={handleSubmit}
          className="w-full flex items-center justify-center rounded-full h-12 px-6 bg-blue-500 text-white text-base font-semibold tracking-wide shadow-md hover:bg-blue-600 transition-colors"
        >
          <span className="truncate">Submit Feedback</span>
        </button>
      </footer>
    </div>
  )
}
