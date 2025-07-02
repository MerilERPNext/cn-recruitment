import React, { useState } from 'react';
import { MdArrowBackIosNew, MdCloudUpload } from 'react-icons/md';
import { useNavigate } from 'react-router';

const AddNewReferral: React.FC = () => {
  const navigate = useNavigate();

  const [candidateName, setCandidateName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [referrerEmail, setReferrerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleBackInterview = () => {
    navigate(-1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      setResumeFile(file);
    } else {
      alert("File too large. Max size 5MB");
    }
  };

  const uploadResume = async (): Promise<string | null> => {
    if (!resumeFile) return null;

    const formData = new FormData();
    formData.append("file", resumeFile);

    try {
      setUploading(true);
      const res = await fetch('/api/method/upload_file', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      console.log("Upload Response:", result);
      setUploading(false);
      return result?.message?.file_url || null;
    } catch (error) {
      setUploading(false);
      console.error("Upload error", error);
      alert("Resume upload failed");
      return null;
    }
  };

  const handleSubmit = async () => {
    const file_url = await uploadResume();
    console.log("Uploaded Resume URL:", file_url);

    const payload = {
      candidate_name: candidateName.trim(),
      email: email.trim(),
      contact_no: phone.trim(),
      for_designation: position,
      referrer_name: referrerName.trim(),
      referrer_email: referrerEmail.trim(),
      notes: notes.trim(),
      resume: file_url,
    };

    try {
      const res = await fetch('/api/method/recruitment.api.employee_referral.submit_employee_referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: JSON.stringify(payload)
        })
      });

      const result = await res.json();
      console.log("Submit Response:", result);

     if (res.ok) {
  alert("Referral submitted successfully!");
  navigate('/webapp/recruitment-app');
} else {
  alert(result?.message || "Submission failed.");
}

    } catch (err) {
      console.error("Submit error", err);
      alert("Error submitting referral");
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-white" style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}>
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center px-4 py-10">
          <button
            onClick={handleBackInterview}
            className="text-[var(--text-primary)] flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-[var(--background-light)] transition-colors duration-200">
            <MdArrowBackIosNew className="text-xl" />
          </button>
          <h1 className="text-[var(--text-primary)] text-xl font-semibold leading-tight tracking-tight flex-1 text-center pr-10">Add New Referral</h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Candidate Info */}
        <section>
          <h2 className="text-black text-xl font-semibold mb-4">Candidate Information</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700 mb-1">Candidate Name</label>
              <input
                id="candidateName"
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <select
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full border border-gray-300 bg-white rounded-lg px-4 py-3"
              >
                <option disabled value="">Select position</option>


                <option value="President">President</option>
                <option value="Product Manager">Product Manager</option>
                <option value="Project Manager">Project Manager</option>
                <option value="Researcher">Researcher</option>
                <option value="Sales Representative">Sales Representative</option>
                <option value="Secretary">Secretary</option>
                <option value="Software Developer">Software Developer</option>

              </select>
            </div>
          </div>
        </section>

        {/* Resume Upload */}
        <section>
          <h2 className="text-[var(--text-primary)] text-lg font-semibold mb-3">Resume</h2>
          <div className="flex flex-col items-center bg-[var(--background-medium)] gap-4 rounded-xl border-2 border-dashed border-[var(--border-color)] px-6 py-10 bg-white hover:border-[var(--primary-color)]">
            <MdCloudUpload className="text-5xl text-[var(--text-secondary)]" />
            <div className="text-center">
              <p className="text-[var(--text-primary)] text-base font-medium">Drag and drop or browse</p>
              <p className="text-[var(--text-secondary)] text-sm">PDF, DOCX, or TXT (max 5MB)</p>
            </div>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="resume_file"
            />
            <label htmlFor="resume_file" className="btn btn-secondary cursor-pointer">
              <span className="truncate">{resumeFile ? resumeFile.name : "Browse Files"}</span>
            </label>
            {uploading && <p className="text-sm text-blue-500">Uploading...</p>}
          </div>
        </section>

        {/* Referrer Info */}
        <section>
          <h2 className="text-black text-xl font-semibold mb-4">Referrer Information</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="referrerName" className="block text-sm font-medium text-gray-700 mb-1">Referrer Name</label>
              <input
                id="referrerName"
                type="text"
                value={referrerName}
                onChange={(e) => setReferrerName(e.target.value)}
                className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label htmlFor="referrerEmail" className="block text-sm font-medium text-gray-700 mb-1">Referrer Email</label>
              <input
                id="referrerEmail"
                type="email"
                value={referrerEmail}
                onChange={(e) => setReferrerEmail(e.target.value)}
                className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3"
              />
            </div>
          </div>
        </section>

        {/* Notes */}
        <section>
          <h2 className="text-black text-xl font-semibold mb-4">Additional Notes</h2>
          <textarea
            placeholder="Add any additional notes about the referral"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3 min-h-[150px]"
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 w-full justify-between bg-white border-t border-gray-200 p-4">
        <div className="flex justify-between gap-4">
          <button type="button" className="w-[40%] bg-gray-100 text-black font-medium py-3 rounded-full hover:bg-gray-200 transition">
            Save as Draft
          </button>
          <button type="button" onClick={handleSubmit} disabled={uploading} className="w-[40%] bg-blue-600 text-white font-medium py-3 rounded-full hover:bg-blue-700 transition">
            {uploading ? "Submitting..." : "Submit Referral"}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default AddNewReferral;
