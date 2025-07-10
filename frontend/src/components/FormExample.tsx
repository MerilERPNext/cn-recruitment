import React, { useState } from 'react';
import FormWrapper from './FormWrapper';

const FormExample: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  
  // Example initial data to populate the form
  const initialData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    message: 'This is pre-filled content from existing data.',
    country: 'us',
    newsletter: true
  };

    // Example form schema
    const exampleForm = {
        display: 'form',
        components: [
            {
                type: 'textfield',
                key: 'firstName',
                label: 'First Name',
                placeholder: 'Enter your first name',
                input: true,
                required: true,
            },
            {
                type: 'textfield',
                key: 'lastName',
                label: 'Last Name',
                placeholder: 'Enter your last name',
                input: true,
                required: true,
            },
            {
                type: 'email',
                key: 'email',
                label: 'Email Address',
                placeholder: 'Enter your email address',
                input: true,
                required: true,
            },
            {
                type: 'textarea',
                key: 'message',
                label: 'Message',
                placeholder: 'Enter your message',
                input: true,
                rows: 4,
            },
            {
                type: 'select',
                key: 'country',
                label: 'Country',
                placeholder: 'Select your country',
                input: true,
                data: {
                    values: [
                        { label: 'United States', value: 'us' },
                        { label: 'Canada', value: 'ca' },
                        { label: 'United Kingdom', value: 'uk' },
                        { label: 'Australia', value: 'au' },
                    ],
                },
            },
            {
                type: 'checkbox',
                key: 'newsletter',
                label: 'Subscribe to newsletter',
                input: true,
            },
            {
                key: 'submit',
                type: 'button',
                action: 'submit',
                label: 'Submit',
                theme: 'primary',
            },
        ],
    };

    const handleSubmit = async (data: any) => {
        setLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setFormData(data);
            console.log('Form submitted:', data);
        } catch (error) {
            console.error('Form submission error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">


                          <FormWrapper
        form={exampleForm}
        onSubmit={handleSubmit}
        loading={loading}
        initialData={initialData}
        onFormReady={(formInstance) => {
          console.log('Form is ready:', formInstance);
          // You can add custom logic here when form is ready
        }}
      />

            {formData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-green-800 mb-2">
                        Form Submitted Successfully!
                    </h3>
                    <pre className="text-sm text-green-700 bg-green-100 p-3 rounded overflow-auto">
                        {JSON.stringify(formData, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default FormExample; 