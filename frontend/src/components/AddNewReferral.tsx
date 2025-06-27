import React from 'react';
import { MdArrowBackIosNew, MdCloudUpload } from 'react-icons/md';
import { useNavigate } from 'react-router';

const AddNewReferral: React.FC = () => {
    const navigate = useNavigate();

    const handleBackInterview= () => {
        navigate(-1);
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
                        {/* Candidate Name */}
                        <div>
                            <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700 mb-1">Candidate Name</label>
                            <input
                                id="candidateName"
                                type="text"
                                placeholder="Enter candidate name"
                                className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="Enter email"
                                className="w-full border bg-[var(--primary-light)] border-gray-300 bg- rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                id="phone"
                                type="tel"
                                placeholder="Enter phone number"
                                className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Position */}
                        <div>
                            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                            <select
                                id="position"
                                defaultValue=""
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option disabled value="">Select position</option>
                                <option value="frontend_developer">Frontend Developer</option>
                                <option value="backend_developer">Backend Developer</option>
                                <option value="product_manager">Product Manager</option>
                                <option value="ux_designer">UX Designer</option>
                            </select>
                        </div>

                    </div>
                </section>

                {/* Resume Upload */}
                <section>
                    <h2 className="text-[var(--text-primary)] text-lg font-semibold mb-3">Resume</h2>
                    <div className="flex flex-col items-center bg-[var(--background-medium)] gap-4 rounded-xl border-2 border-dashed border-[var(--border-color)] px-6 py-10 bg-white hover:border-[var(--primary-color)] transition-colors duration-200">
                        <MdCloudUpload className="text-5xl text-[var(--text-secondary)]" />
                        <div className="text-center">
                            <p className="text-[var(--text-primary)] text-base font-medium">Drag and drop or browse</p>
                            <p className="text-[var(--text-secondary)] text-sm">PDF, DOCX, or TXT (max 5MB)</p>
                        </div>
                        <button className="btn btn-secondary">
                            <span className="truncate">Browse Files</span>
                        </button>
                    </div>
                </section>

                {/* Referrer Info */}
                <section>
                    <h2 className="text-black text-xl font-semibold mb-4">Referrer Information</h2>
                    <div className="space-y-6">
                        {/* Referrer Name */}
                        <div>
                            <label htmlFor="referrerName" className="block text-sm font-medium text-gray-700 mb-1">
                                Referrer Name <span className="text-gray-400">(Auto-populated if internal)</span>
                            </label>
                            <input
                                id="referrerName"
                                type="text"
                                placeholder="Enter referrer name"
                                className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Referrer Email */}
                        <div>
                            <label htmlFor="referrerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                                Referrer Email <span className="text-gray-400">(Auto-populated if internal)</span>
                            </label>
                            <input
                                id="referrerEmail"
                                type="email"
                                placeholder="Enter referrer email"
                                className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </section>

                {/* Additional Notes */}
                <section>
                    <h2 className="text-black text-xl font-semibold mb-4">Additional Notes</h2>
                    <div>
                        <textarea
                            placeholder="Add any additional notes about the referral"
                            className="w-full border border-gray-300 bg-[var(--primary-light)] rounded-lg px-4 py-3 min-h-[150px] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        ></textarea>
                    </div>
                </section>

            </main>

            <footer className="sticky bottom-0 w-full justify-between bg-white border-t border-gray-200 p-4">
                <div className="flex justify-between gap-4 ">
                    {/* Save as Draft */}
                    <button
                        type="button"
                        className="w-[40%] bg-gray-100 text-black font-medium py-3 rounded-full hover:bg-gray-200 transition"
                    >
                        Save as Draft
                    </button>

                    {/* Submit Referral */}
                    <button
                        type="submit"
                        className="w-[40%] bg-blue-600 text-white font-medium py-3 rounded-full hover:bg-blue-700 transition"
                    >
                        Submit Referral
                    </button>
                </div>
            </footer>

        </div>
    );
};


export default AddNewReferral;