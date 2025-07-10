# FormIO Data Management Guide

## Overview
The enhanced FormWrapper component now provides comprehensive support for managing form data, including pre-populating forms with existing data and dynamically updating field values.

## 🚀 Key Features

### 1. **Initial Data Population**
- Pre-fill forms with existing user data
- Automatic field population on form load
- Support for all FormIO component types

### 2. **Dynamic Data Updates**
- Update form fields programmatically
- Real-time data synchronization
- Form instance reference management

### 3. **Form Ready Callback**
- Access to the FormIO instance
- Custom initialization logic
- Event listener setup

## 📋 FormWrapper Props

```typescript
interface FormWrapperProps {
  form: any;                                    // FormIO form schema
  onSubmit: (data: any) => void;               // Form submission handler
  initialData?: any;                           // Initial data to populate form
  className?: string;                          // CSS classes
  loading?: boolean;                           // Loading state
  readOnly?: boolean;                          // Read-only mode
  onFormReady?: (formInstance: any) => void;   // Form ready callback
}
```

## 🔧 Basic Usage

### Simple Form with Initial Data

```tsx
import FormWrapper from './components/FormWrapper';

const MyComponent = () => {
  const initialData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com'
  };

  const handleSubmit = (data) => {
    console.log('Submitted:', data);
  };

  return (
    <FormWrapper
      form={formSchema}
      onSubmit={handleSubmit}
      initialData={initialData}
    />
  );
};
```

### Advanced Usage with Form Instance Access

```tsx
import { useRef } from 'react';

const AdvancedFormComponent = () => {
  const formRef = useRef(null);
  
  const handleFormReady = (formInstance) => {
    formRef.current = formInstance;
    
    // Add custom event listeners
    formInstance.on('change', (event) => {
      console.log('Field changed:', event);
    });
    
    // Custom validation
    formInstance.on('submit', (submission) => {
      console.log('Before submit:', submission);
    });
  };

  const updateFormData = (newData) => {
    if (formRef.current) {
      // Method 1: Update submission data
      formRef.current.submission = { data: newData };
      
      // Method 2: Update individual components
      Object.keys(newData).forEach((key) => {
        const component = formRef.current.getComponent(key);
        if (component) {
          component.setValue(newData[key]);
          component.redraw();
        }
      });
      
      // Redraw entire form
      formRef.current.redraw();
    }
  };

  return (
    <FormWrapper
      form={formSchema}
      onSubmit={handleSubmit}
      initialData={initialData}
      onFormReady={handleFormReady}
    />
  );
};
```

## 🔄 Dynamic Data Updates

### Loading Data from API

```tsx
const DataDrivenForm = () => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const formRef = useRef(null);

  useEffect(() => {
    // Simulate API call
    fetchUserData(userId)
      .then(userData => {
        setFormData(userData);
        setLoading(false);
      });
  }, [userId]);

  const updateFormWithNewData = (newData) => {
    setFormData(newData);
    
    // Update form if it's already rendered
    if (formRef.current) {
      formRef.current.submission = { data: newData };
      formRef.current.redraw();
    }
  };

  return (
    <FormWrapper
      form={formSchema}
      onSubmit={handleSubmit}
      loading={loading}
      initialData={formData}
      onFormReady={(instance) => {
        formRef.current = instance;
      }}
    />
  );
};
```

### Real-time Form Updates

```tsx
const RealTimeForm = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const formRef = useRef(null);

  const switchUser = (userId) => {
    const userData = getUserData(userId);
    setCurrentUser(userData);
    
    // Immediately update form if ready
    if (formRef.current) {
      formRef.current.submission = { data: userData };
      
      // Update each component individually for better UX
      Object.keys(userData).forEach((key) => {
        const component = formRef.current.getComponent(key);
        if (component) {
          component.setValue(userData[key]);
          component.redraw();
        }
      });
      
      formRef.current.redraw();
    }
  };

  return (
    <div>
      <div className="user-switcher">
        <button onClick={() => switchUser('user1')}>Load User 1</button>
        <button onClick={() => switchUser('user2')}>Load User 2</button>
        <button onClick={() => switchUser('user3')}>Load User 3</button>
      </div>
      
      <FormWrapper
        form={formSchema}
        onSubmit={handleSubmit}
        initialData={currentUser}
        onFormReady={(instance) => {
          formRef.current = instance;
        }}
      />
    </div>
  );
};
```

## 🎯 FormIO Instance Methods

When you get access to the FormIO instance in `onFormReady`, you can use these methods:

### Data Management
```javascript
// Get form data
const data = formInstance.submission.data;

// Set form data
formInstance.submission = { data: newData };

// Get specific component
const component = formInstance.getComponent('fieldKey');

// Set component value
component.setValue(newValue);
component.redraw();
```

### Event Handling
```javascript
// Listen to form changes
formInstance.on('change', (event) => {
  console.log('Changed:', event);
});

// Listen to submissions
formInstance.on('submit', (submission) => {
  console.log('Submitted:', submission);
});

// Listen to component events
formInstance.on('componentChange', (changed) => {
  console.log('Component changed:', changed);
});
```

### Form State
```javascript
// Check if form is valid
const isValid = formInstance.isValid();

// Get form errors
const errors = formInstance.errors;

// Enable/disable form
formInstance.disabled = true;  // Disable
formInstance.disabled = false; // Enable

// Redraw form
formInstance.redraw();
```

## 🏗️ Common Patterns

### 1. Edit Mode vs Create Mode
```tsx
const EditCreateForm = ({ mode, entityId }) => {
  const [initialData, setInitialData] = useState({});
  
  useEffect(() => {
    if (mode === 'edit' && entityId) {
      fetchEntityData(entityId).then(setInitialData);
    } else {
      setInitialData({}); // Empty for create mode
    }
  }, [mode, entityId]);

  return (
    <FormWrapper
      form={formSchema}
      onSubmit={handleSubmit}
      initialData={initialData}
      onFormReady={(instance) => {
        // Set form title based on mode
        const title = mode === 'edit' ? 'Edit Record' : 'Create New Record';
        // Update form title if needed
      }}
    />
  );
};
```

### 2. Multi-step Form with Data Persistence
```tsx
const MultiStepForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const formRef = useRef(null);

  const nextStep = () => {
    if (formRef.current) {
      const currentData = formRef.current.submission.data;
      setFormData(prev => ({ ...prev, ...currentData }));
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <FormWrapper
      form={stepSchemas[currentStep]}
      onSubmit={currentStep === steps.length - 1 ? handleFinalSubmit : nextStep}
      initialData={formData}
      onFormReady={(instance) => {
        formRef.current = instance;
      }}
    />
  );
};
```

### 3. Form with Auto-save
```tsx
const AutoSaveForm = () => {
  const [formData, setFormData] = useState({});
  const formRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (formRef.current) {
        const currentData = formRef.current.submission.data;
        // Auto-save to localStorage or API
        localStorage.setItem('formDraft', JSON.stringify(currentData));
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <FormWrapper
      form={formSchema}
      onSubmit={handleSubmit}
      initialData={formData}
      onFormReady={(instance) => {
        formRef.current = instance;
        
        // Load saved draft
        const saved = localStorage.getItem('formDraft');
        if (saved) {
          const draftData = JSON.parse(saved);
          instance.submission = { data: draftData };
          instance.redraw();
        }
      }}
    />
  );
};
```

## 🔍 Debugging Tips

### 1. Console Logging
```javascript
onFormReady={(instance) => {
  console.log('Form instance:', instance);
  console.log('Initial data:', instance.submission.data);
  
  // Log all components
  instance.everyComponent((component) => {
    console.log('Component:', component.key, component.type);
  });
}}
```

### 2. Data Validation
```javascript
const validateFormData = (data) => {
  Object.keys(data).forEach(key => {
    if (data[key] === undefined || data[key] === null) {
      console.warn(`Field ${key} has null/undefined value`);
    }
  });
};
```

### 3. Component Not Found Issues
```javascript
const updateFieldSafely = (formInstance, key, value) => {
  const component = formInstance.getComponent(key);
  if (component) {
    component.setValue(value);
    component.redraw();
  } else {
    console.warn(`Component '${key}' not found in form`);
  }
};
```

## 📚 Best Practices

1. **Always check if form instance exists** before calling methods
2. **Use useRef for form instance storage** to persist across re-renders
3. **Call component.redraw()** after setValue for immediate visual updates
4. **Handle async data loading** with loading states
5. **Validate data structure** before setting form data
6. **Use event listeners** for real-time form monitoring
7. **Clean up event listeners** in useEffect cleanup

---

This comprehensive data management system gives you full control over FormIO forms with existing data integration! 🎉 