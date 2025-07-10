# Formio Integration in Recruitment App

This document explains how to use Formio forms in the recruitment application.

## Installation

Formio has been installed with the following packages:
- `formiojs` - Core Formio library
- `react-formio` - React wrapper for Formio

## Components

### 1. FormioWrapper Component (Recommended)
A comprehensive wrapper component that handles all form rendering with consistent props and configurations.

**Location:** `src/components/FormioWrapper.tsx`

**Features:**
- ✅ Auto-save functionality
- ✅ Built-in validation
- ✅ Error handling
- ✅ Loading states
- ✅ Custom styling
- ✅ File upload support
- ✅ Form transformation
- ✅ Success/Error messages
- ✅ Redirect after submission
- ✅ Custom actions
- ✅ Theme support
- ✅ Internationalization

**Usage:**
```tsx
import FormioWrapper from './components/FormioWrapper';
import { FORM_SCHEMAS } from './utils/formioUtils';

// Basic usage
<FormioWrapper
  formSchema={FORM_SCHEMAS.jobApplication}
  onSubmit={handleSubmit}
/>

// Advanced usage with all features
<FormioWrapper
  formSchema={FORM_SCHEMAS.jobApplication}
  title="Job Application Form"
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  onError={handleError}
  submitButtonText="Submit Application"
  cancelButtonText="Cancel"
  autoSave={true}
  autoSaveInterval={30000}
  validationRules={['fullName', 'email', 'position']}
  successMessage="Application submitted successfully!"
  errorMessage="Failed to submit application"
  redirectUrl="/success"
  loading={isLoading}
  className="custom-form-class"
  config={{
    theme: 'bootstrap3',
    cssClasses: {
      form: 'form-horizontal',
      field: 'form-group',
      input: 'form-control',
      button: 'btn btn-primary'
    }
  }}
/>
```

### 2. FormioExample Component
A simple example component that demonstrates basic Formio usage.

**Location:** `src/components/FormioExample.tsx`

**Usage:**
```tsx
import FormioExample from './components/FormioExample';

// Basic usage
<FormioExample />
```

### 3. DynamicFormBuilder Component
A form builder component that allows creating and editing forms dynamically.

**Location:** `src/components/DynamicFormBuilder.tsx`

**Usage:**
```tsx
import DynamicFormBuilder from './components/DynamicFormBuilder';

<DynamicFormBuilder
  initialForm={existingForm}
  onSave={(schema) => saveFormSchema(schema)}
  onCancel={() => navigate('/')}
  title="Create Job Application Form"
/>
```

### 4. FormioExamples Component
A comprehensive examples page showing different form types and usage patterns.

**Location:** `src/components/FormioExamples.tsx`

**Usage:**
```tsx
import FormioExamples from './components/FormioExamples';

<FormioExamples />
```

## Utilities

### FormioUtils
**Location:** `src/utils/formioUtils.ts`

Provides common configurations and pre-built form schemas.

**Available Configurations:**
- `FORMIO_CONFIG.base` - Base configuration
- `FORMIO_CONFIG.jobApplication` - Job application specific config
- `FORMIO_CONFIG.evaluation` - Evaluation form config

**Pre-built Form Schemas:**
- `FORM_SCHEMAS.jobApplication` - Job application form
- `FORM_SCHEMAS.candidateEvaluation` - Candidate evaluation form
- `FORM_SCHEMAS.interviewFeedback` - Interview feedback form

**Usage:**
```tsx
import { FORM_SCHEMAS, formioUtils } from './utils/formioUtils';

// Use pre-built schema
const jobAppForm = FORM_SCHEMAS.jobApplication;

// Create custom schema
const customForm = formioUtils.createFormSchema('Custom Form', [
  // form components
]);

// Validate submission
const errors = formioUtils.validateSubmission(submission, ['fullName', 'email']);

// Format data for API
const formattedData = formioUtils.formatFormData(submission);
```

## FormioWrapper Props Reference

### Core Props
- `formSchema` (required) - The form schema to render
- `formData` - Initial form data for editing
- `config` - Formio configuration object

### Event Handlers
- `onSubmit` - Called when form is submitted
- `onCancel` - Called when form is cancelled
- `onChange` - Called when form data changes
- `onError` - Called when validation errors occur
- `onComponentChange` - Called when individual components change

### Form Options
- `readOnly` - Make form read-only
- `noAlerts` - Disable Formio alerts
- `language` - Form language (default: 'en')
- `theme` - Form theme (default: 'bootstrap3')
- `validateOnChange` - Validate on field change
- `validateOnBlur` - Validate on field blur

### Styling & UI
- `className` - Custom CSS classes
- `style` - Inline styles
- `title` - Form title
- `submitButtonText` - Submit button text
- `cancelButtonText` - Cancel button text
- `showSubmitButton` - Show/hide submit button
- `showCancelButton` - Show/hide cancel button

### Advanced Features
- `loading` - Show loading state
- `autoSave` - Enable auto-save
- `autoSaveInterval` - Auto-save interval (ms)
- `validationRules` - Custom validation rules
- `transformSubmission` - Transform submission data
- `successMessage` - Success message
- `errorMessage` - Error message
- `redirectUrl` - Redirect after submission
- `submissionUrl` - API endpoint for submission
- `submissionMethod` - HTTP method for submission
- `submissionHeaders` - Headers for submission
- `fileService` - Custom file upload service
- `fileOptions` - File upload options
- `actions` - Custom form actions
- `components` - Custom form components
- `permissions` - Form permissions
- `settings` - Form settings

## Common Use Cases

### 1. Job Application Form
```tsx
import FormioWrapper from './components/FormioWrapper';
import { FORM_SCHEMAS } from './utils/formioUtils';

const JobApplicationForm = () => {
  const handleSubmit = async (submission) => {
    try {
      const response = await axios.post('/api/applications', submission.data);
      console.log('Application submitted:', response.data);
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  return (
    <FormioWrapper
      formSchema={FORM_SCHEMAS.jobApplication}
      title="Job Application"
      onSubmit={handleSubmit}
      autoSave={true}
      validationRules={['fullName', 'email', 'position']}
      successMessage="Application submitted successfully!"
    />
  );
};
```

### 2. Dynamic Form Builder
```tsx
import DynamicFormBuilder from './components/DynamicFormBuilder';

const FormBuilderPage = () => {
  const handleSave = (schema) => {
    // Save form schema to database
    saveFormSchema(schema);
  };

  return (
    <DynamicFormBuilder
      onSave={handleSave}
      title="Create Custom Form"
    />
  );
};
```

### 3. Form with Auto-save
```tsx
<FormioWrapper
  formSchema={customFormSchema}
  onSubmit={handleSubmit}
  autoSave={true}
  autoSaveInterval={30000} // 30 seconds
  onError={handleError}
/>
```

### 4. Form with Custom Validation
```tsx
<FormioWrapper
  formSchema={formSchema}
  onSubmit={handleSubmit}
  validationRules={['name', 'email', 'phone']}
  onError={(errors) => {
    console.error('Validation errors:', errors);
    // Show custom error messages
  }}
/>
```

### 5. Form with File Upload
```tsx
<FormioWrapper
  formSchema={formSchema}
  onSubmit={handleSubmit}
  fileService={{
    uploadFile: (file, options) => {
      // Custom file upload logic
      return uploadToServer(file);
    }
  }}
  fileOptions={{
    maxSize: '10MB',
    allowedTypes: ['pdf', 'doc', 'docx']
  }}
/>
```

### 6. Form with Custom Styling
```tsx
<FormioWrapper
  formSchema={formSchema}
  onSubmit={handleSubmit}
  className="custom-form-container"
  config={{
    theme: 'bootstrap3',
    cssClasses: {
      form: 'form-horizontal',
      field: 'form-group',
      input: 'form-control',
      button: 'btn btn-primary'
    }
  }}
/>
```

## Form Components Available

### Basic Components
- Text Field
- Email Field
- Phone Number
- Number Field
- Password Field
- Textarea
- Select Dropdown
- Radio Buttons
- Checkboxes
- File Upload
- Button

### Advanced Components
- Date/Time Picker
- Signature Pad
- Address Field
- Currency Field
- Panel/Container
- Tabs
- Table
- Data Grid

### Premium Components
- Location Picker
- Rating
- Survey
- NPS (Net Promoter Score)
- Tags
- Tree View

## API Integration

Forms can be integrated with your backend API:

```tsx
const handleSubmit = async (submission) => {
  try {
    const response = await axios.post('/api/recruitment/applications', {
      formData: submission.data,
      metadata: {
        submittedAt: new Date().toISOString(),
        formName: submission.form.name
      }
    });
    
    // Handle success
    showSuccessMessage('Application submitted successfully!');
  } catch (error) {
    // Handle error
    showErrorMessage('Failed to submit application');
  }
};
```

## Best Practices

1. **Use FormioWrapper**: Always use the FormioWrapper component for consistent behavior
2. **Form Validation**: Always validate form submissions on both client and server side
3. **Error Handling**: Implement proper error handling for form submissions
4. **Loading States**: Show loading indicators during form submission
5. **Auto-save**: Enable auto-save for long forms to prevent data loss
6. **Accessibility**: Ensure forms are accessible with proper labels and ARIA attributes
7. **Mobile Responsive**: Test forms on mobile devices
8. **File Uploads**: Implement proper file size and type validation
9. **Data Security**: Sanitize and validate all form inputs
10. **User Feedback**: Provide clear success and error messages

## Troubleshooting

### Common Issues

1. **Form not rendering**: Check if Formio CSS is properly imported
2. **Validation not working**: Ensure validation rules are properly configured
3. **File upload issues**: Check file size limits and allowed file types
4. **Styling issues**: Verify CSS classes and theme configuration
5. **Auto-save not working**: Check auto-save configuration and browser storage

### Debug Tips

1. Check browser console for JavaScript errors
2. Verify form schema structure
3. Test form submission with console.log
4. Check network tab for API calls
5. Use FormioWrapper's built-in error handling

## Resources

- [Formio Documentation](https://form.io/docs)
- [React Formio Documentation](https://form.io/docs/react)
- [Form Builder Guide](https://form.io/docs/formbuilder)
- [Form Components Reference](https://form.io/docs/components) 