// Common Formio configurations and form schemas for recruitment

export const FORMIO_CONFIG = {
  // Base configuration for all forms
  base: {
    noAlerts: false,
    readOnly: false,
    language: 'en',
    i18n: {
      en: {
        'Complete': 'Submit',
        'Submit': 'Submit Application',
        'Cancel': 'Cancel'
      }
    }
  },
  
  // Configuration for job application forms
  jobApplication: {
    noAlerts: false,
    readOnly: false,
    language: 'en',
    i18n: {
      en: {
        'Complete': 'Submit',
        'Submit': 'Submit Application',
        'Cancel': 'Cancel'
      }
    },
    theme: 'bootstrap3',
    cssClasses: {
      form: 'form-horizontal',
      field: 'form-group',
      input: 'form-control',
      button: 'btn btn-primary'
    }
  },
  
  // Configuration for candidate evaluation forms
  evaluation: {
    noAlerts: false,
    readOnly: false,
    language: 'en',
    i18n: {
      en: {
        'Complete': 'Submit',
        'Submit': 'Submit Application',
        'Cancel': 'Cancel'
      }
    },
    theme: 'bootstrap3',
    cssClasses: {
      form: 'form-horizontal',
      field: 'form-group',
      input: 'form-control',
      button: 'btn btn-success'
    }
  },

  // Configuration for interview feedback forms
  interview: {
    noAlerts: false,
    readOnly: false,
    language: 'en',
    i18n: {
      en: {
        'Complete': 'Submit',
        'Submit': 'Submit Feedback',
        'Cancel': 'Cancel'
      }
    },
    theme: 'bootstrap3',
    cssClasses: {
      form: 'form-horizontal',
      field: 'form-group',
      input: 'form-control',
      button: 'btn btn-primary'
    }
  }
};

// Pre-built form schemas for common recruitment use cases
export const FORM_SCHEMAS = {
  // Basic job application form
  jobApplication: {
    display: 'form',
    title: 'Job Application',
    name: 'jobApplication',
    path: 'job-application',
    components: [
      {
        type: 'textfield',
        input: true,
        label: 'Full Name',
        key: 'fullName',
        placeholder: 'Enter your full name',
        validate: {
          required: true
        }
      },
      {
        type: 'email',
        input: true,
        label: 'Email Address',
        key: 'email',
        placeholder: 'Enter your email address',
        validate: {
          required: true
        }
      },
      {
        type: 'phoneNumber',
        input: true,
        label: 'Phone Number',
        key: 'phone',
        placeholder: 'Enter your phone number'
      },
      {
        type: 'select',
        input: true,
        label: 'Position Applied For',
        key: 'position',
        dataSrc: 'values',
        data: {
          values: [
            { label: 'Software Engineer', value: 'software_engineer' },
            { label: 'Product Manager', value: 'product_manager' },
            { label: 'UI/UX Designer', value: 'designer' },
            { label: 'Marketing Specialist', value: 'marketing_specialist' },
            { label: 'Sales Representative', value: 'sales_rep' },
            { label: 'Human Resources', value: 'hr' }
          ]
        },
        validate: {
          required: true
        }
      },
      {
        type: 'textarea',
        input: true,
        label: 'Cover Letter',
        key: 'coverLetter',
        placeholder: 'Tell us why you\'re interested in this position...',
        rows: 5
      },
      {
        type: 'file',
        input: true,
        label: 'Resume/CV',
        key: 'resume',
        filePattern: '*.pdf,*.doc,*.docx',
        fileMaxSize: '10MB',
        validate: {
          required: true
        }
      },
      {
        type: 'button',
        action: 'submit',
        label: 'Submit Application',
        theme: 'primary'
      }
    ]
  },

  // Candidate evaluation form
  candidateEvaluation: {
    display: 'form',
    title: 'Candidate Evaluation',
    name: 'candidateEvaluation',
    path: 'candidate-evaluation',
    components: [
      {
        type: 'textfield',
        input: true,
        label: 'Candidate Name',
        key: 'candidateName',
        validate: {
          required: true
        }
      },
      {
        type: 'select',
        input: true,
        label: 'Position',
        key: 'position',
        dataSrc: 'values',
        data: {
          values: [
            { label: 'Software Engineer', value: 'software_engineer' },
            { label: 'Product Manager', value: 'product_manager' },
            { label: 'UI/UX Designer', value: 'designer' },
            { label: 'Marketing Specialist', value: 'marketing_specialist' }
          ]
        },
        validate: {
          required: true
        }
      },
      {
        type: 'select',
        input: true,
        label: 'Overall Rating',
        key: 'overallRating',
        dataSrc: 'values',
        data: {
          values: [
            { label: 'Excellent', value: 'excellent' },
            { label: 'Good', value: 'good' },
            { label: 'Average', value: 'average' },
            { label: 'Below Average', value: 'below_average' },
            { label: 'Poor', value: 'poor' }
          ]
        },
        validate: {
          required: true
        }
      },
      {
        type: 'textarea',
        input: true,
        label: 'Technical Skills Assessment',
        key: 'technicalSkills',
        placeholder: 'Evaluate the candidate\'s technical skills...',
        rows: 4
      },
      {
        type: 'textarea',
        input: true,
        label: 'Communication Skills',
        key: 'communicationSkills',
        placeholder: 'Evaluate the candidate\'s communication skills...',
        rows: 4
      },
      {
        type: 'textarea',
        input: true,
        label: 'Cultural Fit',
        key: 'culturalFit',
        placeholder: 'Evaluate the candidate\'s cultural fit...',
        rows: 4
      },
      {
        type: 'textarea',
        input: true,
        label: 'Recommendation',
        key: 'recommendation',
        placeholder: 'Your recommendation and next steps...',
        rows: 4
      },
      {
        type: 'select',
        input: true,
        label: 'Hiring Decision',
        key: 'hiringDecision',
        dataSrc: 'values',
        data: {
          values: [
            { label: 'Hire', value: 'hire' },
            { label: 'Consider for other positions', value: 'consider_other' },
            { label: 'Reject', value: 'reject' },
            { label: 'Need more information', value: 'more_info' }
          ]
        },
        validate: {
          required: true
        }
      },
      {
        type: 'button',
        action: 'submit',
        label: 'Submit Evaluation',
        theme: 'primary'
      }
    ]
  },

  // Interview feedback form
  interviewFeedback: {
    display: 'form',
    title: 'Interview Feedback',
    name: 'interviewFeedback',
    path: 'interview-feedback',
    components: [
      {
        type: 'textfield',
        input: true,
        label: 'Candidate Name',
        key: 'candidateName',
        validate: {
          required: true
        }
      },
      {
        type: 'textfield',
        input: true,
        label: 'Interviewer Name',
        key: 'interviewerName',
        validate: {
          required: true
        }
      },
      {
        type: 'datetime',
        input: true,
        label: 'Interview Date & Time',
        key: 'interviewDateTime',
        validate: {
          required: true
        }
      },
      {
        type: 'select',
        input: true,
        label: 'Interview Type',
        key: 'interviewType',
        dataSrc: 'values',
        data: {
          values: [
            { label: 'Phone Screen', value: 'phone' },
            { label: 'Video Call', value: 'video' },
            { label: 'On-site', value: 'onsite' },
            { label: 'Technical', value: 'technical' },
            { label: 'Final Round', value: 'final' }
          ]
        },
        validate: {
          required: true
        }
      },
      {
        type: 'textarea',
        input: true,
        label: 'Interview Notes',
        key: 'interviewNotes',
        placeholder: 'Detailed notes from the interview...',
        rows: 6
      },
      {
        type: 'textarea',
        input: true,
        label: 'Strengths',
        key: 'strengths',
        placeholder: 'Candidate\'s strengths...',
        rows: 4
      },
      {
        type: 'textarea',
        input: true,
        label: 'Areas for Improvement',
        key: 'improvements',
        placeholder: 'Areas where the candidate can improve...',
        rows: 4
      },
      {
        type: 'select',
        input: true,
        label: 'Recommendation',
        key: 'recommendation',
        dataSrc: 'values',
        data: {
          values: [
            { label: 'Strong Yes', value: 'strong_yes' },
            { label: 'Yes', value: 'yes' },
            { label: 'Maybe', value: 'maybe' },
            { label: 'No', value: 'no' },
            { label: 'Strong No', value: 'strong_no' }
          ]
        },
        validate: {
          required: true
        }
      },
      {
        type: 'button',
        action: 'submit',
        label: 'Submit Feedback',
        theme: 'primary'
      }
    ]
  }
};

// Utility functions for working with Formio
export const formioUtils = {
  // Create a new form schema
  createFormSchema: (title: string, components: any[] = []) => ({
    display: 'form',
    title,
    name: title.toLowerCase().replace(/\s+/g, '_'),
    path: title.toLowerCase().replace(/\s+/g, '-'),
    components
  }),

  // Validate form submission
  validateSubmission: (submission: any, requiredFields: string[]) => {
    const errors: string[] = [];
    
    requiredFields.forEach(field => {
      if (!submission.data[field] || submission.data[field].trim() === '') {
        errors.push(`${field} is required`);
      }
    });
    
    return errors;
  },

  // Format form data for API submission
  formatFormData: (submission: any) => {
    return {
      formData: submission.data,
      metadata: {
        submittedAt: new Date().toISOString(),
        formName: submission.form.name,
        formPath: submission.form.path
      }
    };
  },

  // Get form configuration based on type
  getFormConfig: (formType: 'jobApplication' | 'evaluation' | 'interview') => {
    return FORMIO_CONFIG[formType as keyof typeof FORMIO_CONFIG] || FORMIO_CONFIG.base;
  }
};

export default formioUtils; 