import React, { useState, useMemo } from "react";
import { MdArrowBackIosNew, MdCloudUpload } from "react-icons/md";
import { useNavigate } from "react-router";
import Select from "react-select";
import { useDesignations } from "../hooks/useReferralDetails";
import type { SelectOption } from "../types/referral";

type ModalProps = {
  show: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

const Modal: React.FC<ModalProps> = ({ show, title, message, onClose }) => {
  if (!show) return null;

  const isSuccess = title.toLowerCase() === "success";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-8 text-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isSuccess ? "bg-green-100" : "bg-red-100"}`}
          >
            {isSuccess ? (
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <button
            onClick={onClose}
            className={`text-white py-2 px-6 rounded-lg font-medium transition-colors ${isSuccess ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}`}
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
};

const AddNewReferral: React.FC = () => {
  const navigate = useNavigate();

  const [candidateName, setCandidateName] = useState("");
  const [candidateLastName, setCandidateLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [referrerName, setReferrerName] = useState("");
  const [referrerEmail, setReferrerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");

  const {
    data: designationsData,
    isLoading: isLoadingDesignations,
    error: designationsError,
  } = useDesignations();

  const positionOptions: SelectOption[] = useMemo(() => {
    if (!designationsData?.data) return [];

    return designationsData.data.map((designation) => ({
      label: designation.name,
      value: designation.name,
    }));
  }, [designationsData]);

  React.useEffect(() => {
    if (designationsError) {
      console.error("Error fetching designations:", designationsError);
      setModalTitle("Error");
      setModalMessage("Failed to load positions. Please try again.");
      setShowModal(true);
    }
  }, [designationsError]);

  const handleBackInterview = () => {
    navigate(-1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      setResumeFile(file);
    } else {
      setModalTitle("Error");
      setModalMessage("File too large. Max size 5MB");
      setShowModal(true);
    }
  };

  const uploadResume = async (): Promise<string | null> => {
    if (!resumeFile) return null;

    const formData = new FormData();
    formData.append("file", resumeFile);

    try {
      setUploading(true);
      const res = await fetch("/api/method/upload_file", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      setUploading(false);
      return result?.message?.file_url || null;
    } catch (error) {
      setUploading(false);
      console.error("Upload error", error);
      setModalTitle("Error");
      setModalMessage("Resume upload failed");
      setShowModal(true);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (
      !candidateName.trim() ||
      !candidateLastName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !position ||
      !resumeFile
    ) {
      setModalTitle("Error");
      setModalMessage("Please fill all required fields and upload a resume.");
      setShowModal(true);
      return;
    }

    const file_url = await uploadResume();
    if (!file_url) {
      setModalTitle("Error");
      setModalMessage("Resume upload failed. Cannot submit referral.");
      setShowModal(true);
      return;
    }

    const payload = {
      candidate_name: candidateName.trim(),
      last_name: candidateLastName.trim(),
      email: email.trim(),
      contact_no: phone.trim(),
      for_designation: position,
      referrer_name: referrerName.trim(),
      referrer_email: referrerEmail.trim(),
      notes: notes.trim(),
      resume: file_url,
      docstatus: 1,
    };

    try {
      const res = await fetch(
        "/api/method/recruitment.api.employee_referral.submit_employee_referral",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: payload,
          }),
        }
      );

      const result = await res.json();

      if (res.ok) {
        setModalTitle("Success");
        setModalMessage("Referral submitted successfully!");
        setShowModal(true);
      } else {
        setModalTitle("Error");
        setModalMessage(result?.message || "Submission failed.");
        setShowModal(true);
      }
    } catch (err) {
      console.error("Submit error", err);
      setModalTitle("Error");
      setModalMessage("Error submitting referral");
      setShowModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (modalTitle === "Success") {
      navigate("/webapp/recruitment-app");
    }
  };

  return (
    <div
      className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-white"
      style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}
    >
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center px-4 py-10">
          <button
            onClick={handleBackInterview}
            className="text-[var(--text-primary)] flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-[var(--background-light)] transition-colors duration-200"
          >
            <MdArrowBackIosNew className="text-xl" />
          </button>
          <h1 className="text-[var(--text-primary)] text-xl font-semibold leading-tight tracking-tight flex-1 text-center pr-10">
            Add New Referral
          </h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <section>
          <h2 className="text-black text-xl font-semibold mb-4">
            Candidate Information
          </h2>
          <div className="space-y-6">
            <div>
              <label
                htmlFor="candidateName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Candidate First Name*
              </label>
              <input
                id="candidateName"
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label
                htmlFor="candidateLastName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Candidate Last Name*
              </label>
              <input
                id="candidateLastName"
                type="text"
                value={candidateLastName}
                onChange={(e) => setCandidateLastName(e.target.value)}
                className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email*
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone*
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label
                htmlFor="position"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Position*
              </label>
              <Select
                id="position"
                options={positionOptions}
                value={positionOptions.find((opt) => opt.value === position)}
                onChange={(selected) => setPosition(selected?.value || "")}
                placeholder={
                  isLoadingDesignations
                    ? "Loading positions..."
                    : "Select position"
                }
                className="react-select-container"
                classNamePrefix="react-select"
                isSearchable
                isLoading={isLoadingDesignations}
                isDisabled={isLoadingDesignations}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-[var(--text-primary)] text-lg font-semibold mb-3">
            Resume*
          </h2>
          <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-[var(--border-color)] px-6 py-10 bg-white hover:border-[var(--primary-color)]">
            <MdCloudUpload className="text-5xl text-[var(--text-secondary)]" />
            <div className="text-center">
              <p className="text-[var(--text-primary)] text-base font-medium">
                Drag and drop or browse
              </p>
              <p className="text-[var(--text-secondary)] text-sm">
                PDF, DOCX, or TXT (max 5MB)
              </p>
            </div>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="resume_file"
            />
            <label
              htmlFor="resume_file"
              className="btn btn-secondary cursor-pointer"
            >
              <span className="truncate">
                {resumeFile ? resumeFile.name : "Browse Files"}
              </span>
            </label>
            {uploading && <p className="text-sm text-blue-500">Uploading...</p>}
          </div>
        </section>

        <section>
          <h2 className="text-black text-xl font-semibold mb-4">
            Referrer Information
          </h2>
          <div className="space-y-6">
            <div>
              <label
                htmlFor="referrerName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Referrer Name
              </label>
              <input
                id="referrerName"
                type="text"
                value={referrerName}
                onChange={(e) => setReferrerName(e.target.value)}
                className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3"
              />
            </div>
            <div>
              <label
                htmlFor="referrerEmail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Referrer Email
              </label>
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

        <section>
          <h2 className="text-black text-xl font-semibold mb-4">
            Additional Notes
          </h2>
          <textarea
            placeholder="Add any additional notes about the referral"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3 min-h-[150px]"
          />
        </section>
      </main>

      <footer className="sticky bottom-0 w-full justify-between bg-white border-t border-gray-200 p-4">
        <div className="flex justify-between gap-4 sm:px-8">
          <button
            type="button"
            className="w-auto bg-gray-100 text-black font-medium py-3 px-6 rounded-lg hover:bg-gray-200 transition"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading}
            className="w-auto bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 transition"
          >
            {uploading ? "Submitting..." : "Submit Referral"}
          </button>
        </div>
      </footer>

      <Modal
        show={showModal}
        title={modalTitle}
        message={modalMessage}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default AddNewReferral;
