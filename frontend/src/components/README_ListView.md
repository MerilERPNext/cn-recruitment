# ListView Component - Permission Error Handling

## Overview

The `FrappeListView` component now includes comprehensive permission error handling to gracefully manage 403 errors and other API failures. This ensures a better user experience when users don't have the necessary permissions to access certain data.

## Key Features

### 1. Automatic Permission Error Detection
- Detects 403 HTTP status codes from Frappe API responses
- Identifies permission-related error messages in API responses
- Handles both HTTP status codes and Frappe-specific error formats

### 2. User-Friendly Error Messages
- Shows clear, actionable error messages for permission issues
- Differentiates between permission errors and other types of errors
- Provides context-specific error messages

### 3. Retry Logic
- Automatically retries failed requests (up to 3 times with exponential backoff)
- **Does not retry permission errors** to avoid unnecessary API calls
- Implements smart retry delays (1s, 2s, 4s, up to 30s max)

### 4. Error Recovery Options
- "Try Again" button to retry the current request
- "Refresh Page" button for session-related issues
- Automatic query invalidation for fresh data

## Usage

### Basic Usage
```tsx
import FrappeListView from './ListView';

const MyComponent = () => {
  const JobItem = ({ item }) => (
    <div className="p-4 border rounded">
      <h3>{item.title}</h3>
      <p>{item.status}</p>
    </div>
  );

  return (
    <FrappeListView
      doctype="Job Opening"
      ItemComponent={JobItem}
      isSearch={true}
      isFilter={true}
    />
  );
};
```

### With Custom Permission Error Message
```tsx
<FrappeListView
  doctype="Job Opening"
  ItemComponent={JobItem}
  permissionErrorMessage="You don't have access to view job openings. Please contact HR for assistance."
/>
```

## Error Handling Details

### Permission Error Flow
1. **API Call Fails**: When a 403 status code is received
2. **Error Detection**: `PermissionError` is thrown with context-specific message
3. **No Retry**: Permission errors are not retried automatically
4. **User Display**: Shows permission-specific UI with shield icon
5. **Recovery Options**: Provides "Try Again" and "Refresh Page" buttons

### Other Error Types
- **401 Unauthorized**: Session expired message with refresh option
- **404 Not Found**: Resource not found message
- **500+ Server Errors**: Generic server error message
- **Network Errors**: Connection failure messages

## API Error Handling

### HTTP Status Codes
- `403 Forbidden`: Permission denied (no retry)
- `401 Unauthorized`: Session expired (no retry)
- `404 Not Found`: Resource not found (retry allowed)
- `500+ Server Error`: Server issues (retry allowed)

### Frappe-Specific Errors
The component also handles Frappe-specific error responses that may not have standard HTTP status codes but contain permission-related error messages.

## Customization

### Custom Error Messages
Use the `permissionErrorMessage` prop to provide context-specific error messages:

```tsx
<FrappeListView
  doctype="Employee"
  ItemComponent={EmployeeItem}
  permissionErrorMessage="You don't have permission to view employee records. Please contact your manager."
/>
```

### Retry Configuration
The component uses React Query's retry configuration:
- **Permission Errors**: No retry (immediate failure)
- **Other Errors**: Up to 3 retries with exponential backoff
- **Retry Delay**: 1s, 2s, 4s, capped at 30s

## Error UI Components

### Permission Error Display
- **Icon**: Shield icon with yellow background
- **Title**: "Access Restricted"
- **Message**: Custom or default permission message
- **Actions**: "Try Again" and "Refresh Page" buttons

### General Error Display
- **Icon**: Alert circle with red background
- **Title**: "Error Loading Data"
- **Message**: Error-specific message
- **Actions**: "Try Again" button

## Best Practices

1. **Provide Context**: Use `permissionErrorMessage` to give users specific guidance
2. **Test Permissions**: Test with users who have different permission levels
3. **Monitor Errors**: Log permission errors for security monitoring
4. **User Guidance**: Ensure error messages guide users to the right person for help

## Technical Implementation

### Error Classes
```typescript
class PermissionError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message);
    this.name = 'PermissionError';
  }
}
```

### Error Detection
```typescript
const isPermissionError = (error: unknown): error is PermissionError => {
  return error instanceof PermissionError || 
         (error instanceof Error && 
          (error.message.includes('permission') || 
           error.message.includes('403') || 
           error.message.includes('Access Restricted')));
};
```

### API Error Handler
```typescript
const handleApiError = async (response: Response, context: string): Promise<never> => {
  if (response.status === 403) {
    throw new PermissionError(
      `You don't have permission to access ${context}. Please contact your administrator for access.`,
      403
    );
  }
  // ... handle other status codes
};
```

## Migration Notes

If you're upgrading from an older version of the ListView component:

1. **No Breaking Changes**: All existing props continue to work
2. **New Feature**: `permissionErrorMessage` prop is optional
3. **Enhanced Error Handling**: Better error messages and recovery options
4. **Improved UX**: More user-friendly error displays

## Troubleshooting

### Common Issues

1. **Permission errors still retrying**: Ensure you're using the latest version
2. **Custom error messages not showing**: Check that `permissionErrorMessage` prop is passed correctly
3. **Error UI not displaying**: Verify that the error is being caught by the component

### Debug Mode
To debug error handling, you can temporarily modify the retry logic:

```typescript
retry: (failureCount, error) => {
  console.log('Error occurred:', error);
  if (error instanceof PermissionError) {
    console.log('Permission error detected, not retrying');
    return false;
  }
  return failureCount < 3;
}
``` 