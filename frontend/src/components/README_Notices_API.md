# Notices API Integration

This document explains how the Notices component has been integrated with the Frappe API.

## Overview

The Notices component has been completely refactored to use a proper API-driven architecture with:

- **Real-time data fetching** using React Query
- **Optimistic updates** for better UX
- **Loading states and error handling**
- **Automatic cache management**
- **Fallback to mock data** during development

## Architecture

### Frontend Components

1. **Types** (`types/notice.ts`)
   - `Notice` - Main notice interface
   - `NoticeAction` - Action button configuration
   - `NoticeFilters` - Filter options for API queries
   - `CreateNoticeData` - Data structure for creating notices

2. **Service** (`services/noticeService.ts`)
   - `NoticeService.getNoticeList()` - Fetch notices with filters
   - `NoticeService.markAsRead()` - Mark notice as read
   - `NoticeService.archiveNotice()` - Archive a notice
   - `NoticeService.dismissNotice()` - Dismiss a notice
   - `NoticeService.getUnreadCount()` - Get unread count

3. **Hooks** (`hooks/useNotices.ts`)
   - `useAllNotices()` - Fetch all active notices
   - `useUnreadNotices()` - Fetch unread notices only
   - `useArchivedNotices()` - Fetch archived notices
   - `useMarkNoticeAsRead()` - Mutation to mark as read
   - `useArchiveNotice()` - Mutation to archive
   - `useDismissNotice()` - Mutation to dismiss

4. **Component** (`components/Notices.tsx`)
   - Integrated with hooks for data fetching
   - Loading skeletons and error states
   - Automatic mark-as-read functionality
   - Optimistic UI updates

### Backend API

#### Frappe DocType: Notice (Existing)

This integration uses the existing Notice doctype from the NextAI module, which includes:

Fields:
- `title` (Data) - Notice title
- `content` (Text Editor) - Notice content
- `notice_type` (Select) - Type (Announcement, Alert, Information, Policy Update, System Notice, Emergency)
- `priority` (Select) - Priority level (Low, Medium, High, Critical)
- `status` (Select) - Notice status (Draft, Published, Expired, Archived)
- `publish_date` (Date) - Publication date
- `expiry_date` (Date) - Optional expiry date
- `is_global` (Check) - Show to all users
- `target_users` (Table) - Specific target users
- `target_roles` (Table) - Target roles
- `target_departments` (Table) - Target departments
- `allow_acknowledgment` (Check) - Require user acknowledgment
- `send_email` (Check) - Send email notification
- `show_popup` (Check) - Show as popup
- `attachments` (Attach) - File attachments

The Notice doctype also includes child tables for:
- `Notice Target User` - Specific user targeting
- `Notice Target Role` - Role-based targeting  
- `Notice Target Department` - Department-based targeting
- `Notice Read Status` - User read/acknowledgment tracking

#### API Endpoints

All endpoints are in `recruitment/api.py`:

1. **GET /api/method/recruitment.api.get_user_notices**
   - Fetches notices for current user with filters
   - Integrates with existing Notice doctype
   - Supports status, priority filtering
   - Returns transformed notice data for frontend

2. **GET /api/method/recruitment.api.get_unread_notices_count**
   - Returns count of unread notices for current user
   - Based on Notice Read Status tracking

3. **POST /api/method/recruitment.api.mark_notice_as_read**
   - Parameters: `notice_id`
   - Uses existing Notice.mark_notice_as_read API
   - Creates/updates Notice Read Status record

4. **POST /api/method/recruitment.api.archive_notice**
   - Parameters: `notice_id`
   - Updates Notice status to 'Archived'
   - Requires write permission on Notice

5. **POST /api/method/recruitment.api.dismiss_notice**
   - Parameters: `notice_id`
   - Marks notice as acknowledged for current user
   - Uses existing Notice.acknowledge_notice API

**Notice Creation:**
- Notices are created through the standard Frappe Notice form
- Use `/app/notice/new` to create new notices
- Full targeting and notification options available

## Features

### Real-time Updates
- Uses React Query for automatic cache invalidation
- Optimistic updates for immediate UI feedback
- Background refetching to keep data fresh

### Loading States
- Skeleton loading cards while fetching
- Loading spinners on action buttons
- Graceful error handling with retry options

### Auto Mark as Read
- Notices automatically marked as read after 2 seconds of viewing
- Silent API calls to avoid UI disruption

### Error Handling
- API errors fall back to mock data
- Error messages with retry functionality
- Graceful degradation

### Filtering
- Tab-based filtering (All, Unread, Archived)
- Real-time unread count in navigation
- Server-side filtering for performance

## Usage

### Basic Usage
```tsx
import NoticesApp from './components/Notices';

function App() {
  return <NoticesApp />;
}
```

### Creating Notices (Backend)
```python
# Create a notice using the existing Notice doctype
notice = frappe.get_doc({
    'doctype': 'Notice',
    'title': 'System Maintenance',
    'content': 'Scheduled maintenance tonight from 2-4 AM. Please save your work.',
    'notice_type': 'Alert',
    'priority': 'High',
    'status': 'Published',
    'publish_date': frappe.utils.today(),
    'is_global': 1,  # For all users
    'allow_acknowledgment': 1,
    'send_email': 1,
    'show_popup': 1
})
notice.insert()

# Or create for specific users/roles/departments
notice = frappe.get_doc({
    'doctype': 'Notice',
    'title': 'Department Meeting',
    'content': 'Monthly department meeting scheduled for next Friday.',
    'notice_type': 'Announcement',
    'priority': 'Medium',
    'status': 'Published',
    'is_global': 0,
    'target_departments': [{'department': 'HR'}],
    'allow_acknowledgment': 1
})
notice.insert()
```

### Custom Actions
The component supports action types based on Notice requirements:
- `dismiss` - Acknowledge/dismiss the notice (when allow_acknowledgment is enabled)
- `view_details` - View full notice details
- `mark_as_read` - Mark notice as read (automatic)

Notice actions are determined by the Notice doctype configuration:
- If `allow_acknowledgment` is enabled and notice not yet acknowledged → Shows "Acknowledge" button
- All notices support view details and mark as read functionality

## Installation

1. **Ensure Notice DocType exists:**
   The Notice doctype should already exist from the NextAI module. If not:
   ```bash
   bench --site your-site install-app nextai
   bench --site your-site migrate
   ```

2. **Frontend Dependencies:**
   The component uses React Query, which should already be installed in the project.

3. **Permissions:**
   Verify permissions for the Notice DocType:
   - System Manager: Full access to create/manage notices
   - HR Manager: Can create and manage notices
   - Employee: Read-only access to notices targeted to them
   - Users automatically see notices based on targeting rules (global, role, department, user-specific)

## Customization

### Adding New Icon Types
1. Add the icon to the frontend icon map in `Notices.tsx`
2. Update the DocType select field options
3. Update the TypeScript interface

### Custom Action Types
1. Add the action type to the backend API
2. Update the frontend action handler
3. Implement the specific action logic

### Styling
The component uses Tailwind CSS classes and can be customized by modifying the class names in the component file.

## Development Notes

- The service includes mock data fallback for development
- API calls are wrapped in try-catch for graceful error handling
- React Query handles caching and background updates automatically
- The component is fully responsive and mobile-friendly

## Security

- All API endpoints verify user permissions
- Users can only modify their own notices
- Action data is validated as JSON
- CSRF protection through Frappe's built-in mechanisms 