import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";
// import Navigation from './components/Navigation';
import { useRouteInfo } from "./hooks/useRouter";
import { QueryProvider } from "./providers/QueryProvider";
import "./App.css";

import { AppRoute, routesConfig } from "./routesConfig";
// @ts-expect-error ignore
import { Form } from "@tsed/react-formio";

// Home/Dashboard component
const Dashboard: React.FC = () => {
  const routeInfo = useRouteInfo();

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: "var(--background-medium)" }}
    >
      <Form
        form={{
          display: "form",
          settings: {
            pdf: {
              id: "1ec0f8ee-6685-5d98-a847-26f67b67d6f0",
              src: "https://files.form.io/pdf/5692b91fd1028f01000407e3/file/1ec0f8ee-6685-5d98-a847-26f67b67d6f0",
            },
          },
          components: [
            {
              label: "Text Field",
              applyMaskOn: "change",
              tableView: true,
              validateWhenHidden: false,
              key: "textField",
              type: "textfield",
              input: true,
            },
            {
              type: "button",
              label: "Submit",
              key: "submit",
              disableOnInvalid: true,
              input: true,
              tableView: false,
            },
          ],
        }}
      />
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Recruitment Portal Dashboard
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Current path: {routeInfo.pathname}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg shadow-md p-6" style={{ backgroundColor: 'var(--background-light)' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recruitment</h2>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              Streamline your recruitment process and manage job applicants with ease.
            </p>
            <Link
              to="/webapp/recruitment-app"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Recruitment-app
            </Link>
          </div>
          <div
            className="rounded-lg shadow-md p-6"
            style={{ backgroundColor: "var(--background-light)" }}
          >
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Search Members
            </h2>
            <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
              Find and manage employee information quickly and efficiently.
            </p>
            <Link
              to="/webapp/search-members"
              className="inline-block text-white px-4 py-2 rounded-md transition-colors"
              style={{ backgroundColor: "var(--primary-color)" }}
            >
              Go to Search
            </Link>
          </div>

          <div
            className="rounded-lg shadow-md p-6"
            style={{ backgroundColor: "var(--background-light)" }}
          >
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Notices
            </h2>
            <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
              View and manage company announcements and important notices.
            </p>
            <Link
              to="/webapp/notices"
              className="inline-block bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              View Notices
            </Link>
          </div>

          <div
            className="rounded-lg shadow-md p-6"
            style={{ backgroundColor: "var(--background-light)" }}
          >
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              ID Cards
            </h2>
            <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
              Generate, view, and manage employee identification cards.
            </p>
            <Link
              to="/webapp/id-card"
              className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Manage ID Cards
            </Link>
          </div>
          <div className="rounded-lg shadow-md p-6" style={{ backgroundColor: 'var(--background-light)' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Salary slip</h2>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              Generate, view, and manage employee salary slip cards.
            </p>
            <Link
              to="/webapp/salary-slip-app"
              className="inline-block bg-black text-white px-4 py-2 rounded-md  transition-colors"
            >
              Salary Slips
            </Link>
          </div>
          <div className="rounded-lg shadow-md p-6" style={{ backgroundColor: 'var(--background-light)' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Shift Management</h2>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              Generate, view, and manage employee shift management cards.
            </p>
            <Link
              to="/webapp/shift-request"
              className="inline-block bg-red-500 text-white px-4 py-2 rounded-md  transition-colors"
            >
              Shift Management
            </Link>
          </div>

          <div
            className="rounded-lg shadow-md p-6"
            style={{ backgroundColor: "var(--background-light)" }}
          >
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              My Profile
            </h2>
            <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
              Profile Details
            </p>
            <Link
              to="/webapp/my-profile"
              className="inline-block bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Manage Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const renderRoutes = (routes: AppRoute[]) =>
    routes.map(({ path, element, children }, index) =>
      children ? (
        <Route key={`${index}-${path}`} path={path} element={element}>
          {renderRoutes(children)}
        </Route>
      ) : (
        <Route key={`${index}-${path}`} path={path} element={element} />
      )
    );

  return (
    <QueryProvider>
      <Router>
        <div
          className="min-h-screen"
          style={{ backgroundColor: "var(--background-medium)" }}
        >
          <Routes>
            <Route path="/webapp/" element={<Dashboard />} />
            {renderRoutes(routesConfig)}
            <Route path="*" element={<Navigate to="/webapp/" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryProvider>
  );
};

export default App;
