# React Router Implementation for Recruitment Frontend

This implementation provides a complete React Router setup with path-based component rendering for the recruitment portal.

## 🚀 Features

- **React Router DOM** with dynamic path-based routing
- **useLocation()** hook for getting current DOM path
- **useParams()** hook for extracting URL parameters  
- **Dynamic component rendering** based on current path
- **Custom hooks** for route management and path utilities
- **Navigation component** with active state indicators
- **Responsive UI** with Tailwind CSS styling
- **Path-based component mapping** utilities
- **Breadcrumb navigation** support
- **404 error handling** with fallback routing

## 📁 File Structure

```
frontend/src/
├── components/
│   ├── Navigation.tsx          # Main navigation bar
│   ├── SearchMembers.tsx       # Search members page
│   ├── Notices.tsx            # Notices & announcements page
│   ├── IdCard.tsx             # ID card management page
│   └── DynamicRouter.tsx      # Advanced dynamic routing component
├── hooks/
│   └── useRouter.ts           # Custom routing hooks
├── utils/
│   └── routeUtils.ts          # Path mapping and utilities
├── App.tsx                    # Main app with router setup
└── main.tsx                   # Entry point
```

## 🛠️ Implementation Details

### 1. Route Configuration

The app supports these routes:
- `/` - Dashboard (home page)
- `/search-members` - Member search functionality
- `/notices` - Company notices and announcements  
- `/id-card` - ID card management
- `/id-card/:id` - ID card for specific employee

### 2. Path-Based Component Rendering

```typescript
// Get current path
const currentPath = useCurrentPath();

// Render component based on path
const Component = getComponentByPath(currentPath);
```

### 3. Custom Hooks

```typescript
// Get current path
const currentPath = useCurrentPath();

// Get route information
const routeInfo = useRouteInfo();

// Check path pattern matching
const isMatching = usePathMatcher('/search-*');

// Get component for current path
const Component = usePathBasedComponent();
```

### 4. Dynamic Routing

```typescript
// Switch-based rendering
const renderComponentByPath = () => {
  switch (currentPath) {
    case '/search-members':
      return <SearchMembers />;
    case '/notices':
      return <Notices />;
    case '/id-card':
      return <IdCard />;
    default:
      return <Dashboard />;
  }
};
```

## 🚦 Usage

### Standard React Router Approach

```tsx
<Router>
  <Routes>
    <Route path="/search-members" element={<SearchMembers />} />
    <Route path="/notices" element={<Notices />} />
    <Route path="/id-card" element={<IdCard />} />
    <Route path="/id-card/:id" element={<IdCard />} />
  </Routes>
</Router>
```

### Dynamic Path-Based Approach

```tsx
const DynamicApp = () => {
  const Component = usePathBasedComponent();
  return Component ? <Component /> : <NotFound />;
};
```

### Advanced Dynamic Router

```tsx
<DynamicRouter 
  showBreadcrumb={true}
  showPathInfo={true}
  fallbackComponent={CustomNotFound}
/>
```

## 🔧 Setup Instructions

1. **Install dependencies** (already done):
   ```bash
   cd frontend
   yarn install
   ```

2. **Start development server**:
   ```bash
   yarn dev
   ```

3. **Build for production**:
   ```bash
   yarn build
   ```

4. **Test the implementation**:
   ```bash
   chmod +x test-router.sh
   ./test-router.sh
   ```

## 📋 Available Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production with HTML file copying
- `yarn copy-html-entry` - Copy index.html to www directory files

## 🎯 Key Components

### Navigation Component
- Active route highlighting
- Responsive design
- User authentication status

### SearchMembers Component  
- Employee search functionality
- Filter and sorting options
- Results display with pagination

### Notices Component
- Company announcements
- Priority-based categorization
- Create new notice functionality

### IdCard Component
- Employee ID card preview
- Downloadable/printable cards
- Employee details management

## 🔍 Path Detection

The implementation uses multiple methods to detect and handle paths:

1. **useLocation()** - React Router's built-in hook
2. **Custom path utilities** - Helper functions for path manipulation
3. **Component mapping** - Direct path-to-component mapping
4. **Route configuration** - Centralized route definitions

## 📱 Responsive Design

All components are built with mobile-first responsive design using Tailwind CSS:
- Mobile: Single column layouts
- Tablet: 2-column grids  
- Desktop: 3-column layouts with sidebars

## 🚨 Error Handling

- **404 Not Found** - Automatic redirect to dashboard
- **Invalid routes** - Fallback component rendering  
- **Missing components** - Graceful error boundaries

## 🔗 Integration

The frontend integrates with the Frappe backend and copies built files to:
- `../recruitment/www/search-members.html`
- `../recruitment/www/notices.html`
- `../recruitment/www/id-card.html`

This allows the React app to be served through Frappe's web interface while maintaining full React Router functionality.