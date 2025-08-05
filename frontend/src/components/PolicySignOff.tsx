import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFrappeDocument, useUpdateFrappeDocument } from '../hooks/useFrappeQuery';
import toast from 'react-hot-toast';
import { Form } from '@tsed/react-formio';
import {queryClient} from '../providers/QueryProvider';
import SecurePdfViewer from './SecurePdfViewer_CookieAuth';

interface PolicyDetailsDocument {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  policy: string;
  employee_id: string;
  employee_name: string;
  sign_off_mandatory: number;
  due_date: string;
  status: string;
  allow_decline: number;
  doctype: string;
  policy_document: string;
  form_json: string;
}

const PolicySignOff: React.FC = () => {
  const navigate = useNavigate();
  const { policyId } = useParams<{ policyId: string }>();
  const [isAgreed, setIsAgreed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {mutateAsync: updatePolicy} = useUpdateFrappeDocument();
  // Fetch policy details using the API
  const { data: policyData, isLoading, error } = useFrappeDocument(
    'Policy Details',
    policyId || '',
    [
      'name',
      'policy',
      'employee_id', 
      'employee_name',
      'sign_off_mandatory',
      'due_date',
      'status',
      'allow_decline',
      'policy_document',
      'form_json'
    ]
  ) as { data: PolicyDetailsDocument | undefined; isLoading: boolean; error: any };

  const handleSignOff = () => {
    if (isAgreed) {
      setIsModalOpen(true);
    }
  };

  const handleFormSubmit = (formData: any) => {
    // Process the form submission with the provided data
    console.log('Form submitted with data:', formData);
    
    // Make API call to record the sign-off with form data
    updatePolicy({
      doctype: 'Policy Details',
      name: policyId || '',
      data: {
        status: "Acknowledged",
        response_json: JSON.stringify(formData) // Include the form data
      }
    }).then(() => {
      toast.success('Policy acknowledged successfully');
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["documents-infinite", "Policy Details"] });
      queryClient.invalidateQueries({ queryKey: ["document-count", "Policy Details"] });
      navigate('/webapp/policies-enforced');
    }).catch((error) => {
      toast.error('Failed to acknowledge policy');
      console.error(error);
    });
  };

  const handleDecline = () => {
    // In real app, this would make an API call to record the decline
    updatePolicy({
      doctype: 'Policy Details',
      name: policyId || '',
      data: {
        status: "Declined",
      }
    }).then(() => {
      toast.success('Policy declined successfully');
      navigate('/webapp/policies-enforced');
    }).catch((error) => {
      toast.error('Failed to decline policy');
      console.error(error);
    })
  };

  const handleBack = () => {
    navigate('/webapp/policies-enforced');
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading policy details...</p>
        </div>
      </div>
    );
  }

  if (error || !policyData) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Policy Not Found</h1>
          <p className="text-gray-600 mb-4">
            {error ? 'Error loading policy details.' : 'The requested policy could not be found.'}
          </p>
          <button 
            onClick={handleBack}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Back to Policies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Clean Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <button
          onClick={handleBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Policies
        </button>

        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">{policyData.policy}</h1>
        </div>

        <a
          href={policyData.policy_document}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-primary hover:text-primary-700 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download
        </a>
      </div>

      {/* Policy Document - Main Highlight */}
      {policyData.policy_document && (
        <div className="flex-1 min-h-0 p-0 m-0">
          <div className="h-full border border-gray-200 rounded bg-white overflow-hidden">
            <SecurePdfViewer
              fetchUrl={policyData.policy_document}
            />
          </div>
        </div>
      )}

      {/* Policy Info & Actions */}
      {policyData.status === 'Pending' && (
        <div className="border-t border-gray-200 bg-gray-50">
          {/* Policy Details Row */}
          <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-600 border-b border-gray-100">
            <div className="flex items-center space-x-6">
              <span><strong>Employee:</strong> {policyData.employee_name} ({policyData.employee_id})</span>
              <span><strong>Due Date:</strong> {new Date(policyData.due_date).toLocaleDateString()}</span>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              policyData.status === 'Pending'
                ? 'bg-yellow-100 text-yellow-800'
                : policyData.status === 'Acknowledged'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {policyData.status}
            </span>
          </div>

          {/* Action Row */}
          <div className="flex items-center space-x-3 p-3">
            <input
              type="checkbox"
              id="agreement"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="agreement" className="text-sm text-gray-700 flex-1">
              I acknowledge that I have read and understood this policy.
            </label>

            <div className="flex space-x-2">
              <button
                onClick={handleSignOff}
                disabled={!isAgreed}
                className={`font-medium py-2 px-4 rounded-md transition-colors text-sm ${
                  isAgreed
                    ? 'bg-primary hover:bg-primary-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Acknowledge
              </button>

              {policyData.allow_decline === 1 && (
                <button
                  onClick={handleDecline}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
                >
                  Decline
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info for non-pending policies */}
      {policyData.status !== 'Pending' && (
        <div className="border-t border-gray-200 bg-gray-50">
          {/* Policy Details Row */}
          <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-600 border-b border-gray-100">
            <div className="flex items-center space-x-6">
              <span><strong>Employee:</strong> {policyData.employee_name} ({policyData.employee_id})</span>
              <span><strong>Due Date:</strong> {new Date(policyData.due_date).toLocaleDateString()}</span>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              policyData.status === 'Pending'
                ? 'bg-yellow-100 text-yellow-800'
                : policyData.status === 'Acknowledged'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {policyData.status}
            </span>
          </div>

          {/* Message Row */}
          <div className="p-3 text-center">
            <p className="text-gray-600 text-sm">
              This policy has already been {policyData.status.toLowerCase()}.
            </p>
          </div>
        </div>
      )}

      {/* Full Screen Modal with FormIO Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen">
            <div className="bg-white rounded-lg shadow-xl w-full h-screen overflow-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  Complete Policy Acknowledgment
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body with FormIO Form */}
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-gray-600">
                    Please complete the following form to acknowledge your understanding of the policy: <strong>{policyData.policy}</strong>
                  </p>
                </div>
                
                {policyData.form_json ? (
                  (() => {
                    try {
                      const formConfig = JSON.parse(policyData.form_json);
                      console.log('Parsed form config:', formConfig);
                      
                      // Validate and ensure proper form structure
                      if (!formConfig || typeof formConfig !== 'object') {
                        throw new Error('Invalid form configuration: not an object');
                      }

                      // Ensure components array exists
                      if (!formConfig.components || !Array.isArray(formConfig.components)) {
                        formConfig.components = [];
                      }

                      // Pre-fill employee data in the form if the fields exist
                      formConfig.components.forEach((component: any) => {
                        if (!component || typeof component !== 'object') return;
                        
                        // Ensure component has required properties
                        if (!component.key) {
                          console.warn('Component missing key:', component);
                          return;
                        }

                        if (component.key === 'employeeName' || component.key === 'employee_name') {
                          component.defaultValue = policyData.employee_name;
                        } else if (component.key === 'employeeId' || component.key === 'employee_id') {
                          component.defaultValue = policyData.employee_id;
                        } else if (component.key === 'acknowledgedDate' || component.key === 'acknowledged_date') {
                          component.defaultValue = new Date().toISOString();
                        }
                      });

                      // Ensure form has required properties
                      const validatedForm = {
                        display: 'form',
                        type: 'form',
                        ...formConfig,
                        components: formConfig.components
                      };

                      console.log('Validated form config:', validatedForm);

                      return (
                        <Form
                          form={validatedForm}
                          onSubmit={(data: any) => handleFormSubmit(data.data)}
                          options={{
                            noAlerts: true,
                            readOnly: false,
                          }}
                        />
                      );
                    } catch (error) {
                      console.error('Error parsing or rendering form_json:', error);
                      console.error('Raw form_json:', policyData.form_json);
                      
                      return (
                        <div className="text-center py-8">
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                            <p className="text-red-700 text-sm">
                              Error loading form configuration. Please contact support.
                            </p>
                            <details className="mt-2">
                              <summary className="text-red-600 cursor-pointer text-xs">
                                Technical Details
                              </summary>
                              <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap">
                                {error instanceof Error ? error.message : String(error)}
                              </pre>
                            </details>
                          </div>
                          <button
                            onClick={() => handleFormSubmit({})}
                            className="bg-primary hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                          >
                            Acknowledge Policy (Fallback)
                          </button>
                        </div>
                      );
                    }
                  })()
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No form configuration available for this policy.</p>
                    <button
                      onClick={() => handleFormSubmit({})}
                      className="mt-4 bg-primary hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      Acknowledge Policy
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicySignOff;
