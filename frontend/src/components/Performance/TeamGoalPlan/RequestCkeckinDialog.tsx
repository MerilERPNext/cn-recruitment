import React, { useRef, useEffect } from 'react';
import { Form } from '@tsed/react-formio';
import 'formiojs/dist/formio.full.min.css';
import { useRequestCheckin } from '../../../hooks/useGoal';
import toast from 'react-hot-toast';
import { errorResponseFormater } from '../../../utils/errorResponseFormater';

interface RequestCheckinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
  goalPlan: string;
}

const RequestCheckinDialog: React.FC<RequestCheckinDialogProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  goalPlan,
}) => {
  const formRef = useRef<any>(null);
  const isFormReady = useRef(false);

  const formSchema = {
    display: 'form',
    components: [
      {
        key: 'goal_plan',
        type: 'textfield',
        label: 'Goal Plan',
        placeholder: 'E.g., Q4 Marketing Strategy',
        disabled: true,
        validate: { required: true },
        customClass: 'mb-4',
      },
      {
        key: 'due_date',
        type: 'datetime',
        label: 'Due Date',
        enableTime: false,
        format: 'yyyy-MM-dd',
        widget: {
          type: 'calendar',
          displayMode: 'calendar',
          mode: 'date',                 
        },
        validate: { required: true },
        defaultValue: new Date().toISOString().split('T')[0],
        customClass: 'mb-4',
      },
      {
        key: 'message',
        type: 'textarea',
        label: 'Message',
        placeholder: 'What would you like to discuss?',
        rows: 4,
        validate: { required: true },
        customClass: 'mb-6',
      },
    ],
  };

  function handleFormReady(instance: any) {
      if (!instance) return;
  formRef.current = instance;
  isFormReady.current = true;

  // set default value once form is ready
  try {
    instance.setSubmission({
      data: {
        goal_plan: goalPlan,
      },
    });
  } catch (e) {
    console.warn("Failed to set default values", e);
  }
  }

  useEffect(() => {
  if (!isOpen) return;
  if (!isFormReady.current) return;

  try {
    formRef.current?.setSubmission?.({
      data: { goal_plan: goalPlan }
    });
  } catch (e) {
    console.warn("Failed to set default values", e);
  }
}, [isOpen, goalPlan]);

  const { mutate: CheckinRequest } = useRequestCheckin();

  async function programmaticSubmit() {
    try {
      if (!formRef.current) {
        console.warn('Form instance not ready');
        return null;
      }

      const submitFn =
        formRef.current.submit?.bind(formRef.current) ??
        formRef.current.formio?.submit?.bind(formRef.current.formio);

      if (!submitFn) {
        console.error('No submit function found on form instance', formRef.current);
        return null;
      }

      const submission = await submitFn();
      return submission;
    } catch (err) {
      console.warn('Form validation / submit failed', err);
      return null;
    }
  }

  const handleSubmit = async () => {
    const submission = await programmaticSubmit();

    if (!submission) {
      // invalid or nothing returned — do not close modal
      return;
    }

    // successful submission
    const data = submission.data ?? {};
    console.log('Form submitted successfully with data:', data);
    CheckinRequest(data, {
            onSuccess: () => {
              onClose();
              toast.success("Checkin Reaquest Sended successfully!");
              onSubmitSuccess();
            },
            onError: (error: any) => {
              const formatedError = errorResponseFormater(error, "Failed to send Checkin Request.");
              toast.error(formatedError);
            },
          });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900 bg-opacity-50 backdrop-blur-sm p-4 transition-opacity">
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-gray-200">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h3 className="text-xl font-semibold text-gray-800">Request Check-in</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <Form
            form={formSchema}
            onFormReady={handleFormReady}
            options={{
              submitButton: false,
               noAlerts: true ,
              highlightErrors: true,
              showErrors: true,
              errors: { inline: true },
            }}
            onSubmitDone={(submission: any) => {
              console.log('onSubmitDone', submission);
            }}
            onSubmitError={(err: any) => {
              console.warn('onSubmitError', err);
            }}
          />
        </div>

        {/* Buttons */}
        <div className="p-5 border-t border-gray-100">
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Send Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestCheckinDialog;
