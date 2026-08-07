import {
  Routes,
  Route
} from "react-router-dom";

import Login from "./pages/Login";

import Guidelines from "./pages/Guidelines";

import ProfileSetup from "./pages/ProfileSetup";

import Dashboard from "./pages/Dashboard";

import ProtectedRoute from "./components/ProtectedRoute";

import Profile from "./pages/Profile";
import BecomeOrganizer from "./pages/BecomeOrganizer";
import AdminApplications from "./pages/AdminApplications";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import CreateEvent from "./pages/CreateEvent";
import EventRequests from "./pages/EventRequests";
import MyRequests from "./pages/MyRequests";
import MyEvents from "./pages/MyEvents";
import ApprovedVolunteers from "./pages/ApprovedVolunteers";
import Attendance from "./pages/Attendance";
import Ratings from "./pages/Ratings";
import VolunteerHistory from "./pages/VolunteerHistory";
import MyApplications from "./pages/MyApplications";
import EditEvent from "./pages/EditEvent";
import PaymentManagement from "./pages/PaymentManagement";
import PaymentHistory from "./pages/PaymentHistory";
import Certificates from "./pages/Certificates";
import CertificateViewer from "./pages/CertificateViewer";
import Notifications from "./pages/Notifications";
import AdminDashboard from "./pages/AdminDashboard";
import ManageUsers from "./pages/ManageUsers";
import ManageEvents from "./pages/ManageEvents";
import UserDetails from "./pages/UserDetails";
import ReportEvent from "./pages/ReportEvent";
import Reports from "./pages/Reports";
import ForgotPassword from "./pages/ForgotPassword";
import VolunteerDetails from "./pages/VolunteerDetails";
import EditProfile from "./pages/EditProfile";
import OrganizerNotifications from "./pages/OrganizerNotifications";
import OrganizerProfile from "./pages/OrganizerProfile";
import EditOrganizerProfile from "./pages/EditOrganizerProfile";
import IssueCertificates from "./pages/IssueCertificates";
import OrganizerBroadcast from "./pages/OrganizerBroadcast";
import OrganizerAnalytics from "./pages/OrganizerAnalytics";
import ManageOrganizers from "./pages/ManageOrganizers";
import AdminAnalytics from "./pages/AdminAnalytics";
import GlobalSearch from "./pages/GlobalSearch";
function App() {

  return (

    <Routes>

      <Route
        path="/"
        element={<Login />}
      />

      <Route
        path="/guidelines"
        element={
          <ProtectedRoute>
            <Guidelines />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile-setup"
        element={
          <ProtectedRoute>
            <ProfileSetup />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
  path="/profile"
  element={
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  }
/>
  <Route
  path="/become-organizer"
  element={
    <ProtectedRoute>
      <BecomeOrganizer />
    </ProtectedRoute>
  }
/>
<Route
  path="/admin-applications"
  element={
    <ProtectedRoute>
      <AdminApplications />
    </ProtectedRoute>
  }
/>
<Route
  path="/organizer-dashboard"
  element={
    <ProtectedRoute>
      <OrganizerDashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/create-event"
  element={
    <ProtectedRoute>
      <CreateEvent />
    </ProtectedRoute>
  }
/>
<Route
  path="/event-requests"
  element={
    <ProtectedRoute>
      <EventRequests />
    </ProtectedRoute>
  }
/>
<Route
  path="/my-requests"
  element={
    <ProtectedRoute>
      <MyRequests />
    </ProtectedRoute>
  }
/>

<Route
  path="/my-events"
  element={
    <ProtectedRoute>
      <MyEvents />
    </ProtectedRoute>
  }
/>
<Route
  path="/approved-volunteers"
  element={
    <ProtectedRoute>
      <ApprovedVolunteers />
    </ProtectedRoute>
  }
/>
<Route
  path="/attendance"
  element={
    <ProtectedRoute>
      <Attendance />
    </ProtectedRoute>
  }
/>
<Route
  path="/ratings"
  element={
    <ProtectedRoute>
      <Ratings />
    </ProtectedRoute>
  }
/>
<Route
  path="/volunteer-history"
  element={
    <ProtectedRoute>
      <VolunteerHistory />
    </ProtectedRoute>
  }
/>
<Route
  path="/my-applications"
  element={
    <ProtectedRoute>
      <MyApplications />
    </ProtectedRoute>
  }
/>
<Route
  path="/edit-event/:id"
  element={<EditEvent />}
/>
<Route
  path="/payment-management"
  element={<PaymentManagement />}
/>
<Route
  path="/payment-history"
  element={<PaymentHistory />}
/>
<Route
  path="/certificates"
  element={<Certificates />}
/>
<Route
  path="/certificate/:id"
  element={<CertificateViewer />}
/>
<Route
  path="/notifications"
  element={<Notifications />}
/>
<Route
  path="/admin-dashboard"
  element={<AdminDashboard />}
/>
<Route
  path="/manage-users"
  element={<ManageUsers />}
/>
<Route
  path="/manage-events"
  element={<ManageEvents />}
/>
<Route
  path="/user-details/:id"
  element={<UserDetails />}
/>
<Route
  path="/report-event/:id"
  element={<ReportEvent />}
/>
<Route
  path="/reports"
  element={<Reports />}
/>
<Route
  path="/forgot-password"
  element={<ForgotPassword />}
/>
<Route
  path="/volunteer-details/:id"
  element={
    <ProtectedRoute>
      <VolunteerDetails />
    </ProtectedRoute>
  }
/>
<Route
  path="/edit-profile"
  element={
    <ProtectedRoute>
      <EditProfile />
    </ProtectedRoute>
  }
/>
<Route
  path="/organizer-notifications"
  element={
    <ProtectedRoute>
      <OrganizerNotifications />
    </ProtectedRoute>
  }
/>
<Route
  path="/organizer-profile"
  element={
    <ProtectedRoute>
      <OrganizerProfile />
    </ProtectedRoute>
  }
/>
<Route
  path="/edit-organizer-profile"
  element={
    <ProtectedRoute>
      <EditOrganizerProfile />
    </ProtectedRoute>
  }
/>
<Route
  path="/issue-certificates"
  element={
    <ProtectedRoute>
      <IssueCertificates />
    </ProtectedRoute>
  }
/>
<Route
  path="/organizer-broadcast"
  element={
    <ProtectedRoute>
      <OrganizerBroadcast />
    </ProtectedRoute>
  }
/>
<Route
  path="/organizer-analytics"
  element={
    <ProtectedRoute>
      <OrganizerAnalytics />
    </ProtectedRoute>
  }
/>
    <Route
  path="/manage-organizers"
  element={
    <ProtectedRoute>
      <ManageOrganizers />
    </ProtectedRoute>
  }
/>
<Route
  path="/admin-analytics"
  element={
    <ProtectedRoute>
      <AdminAnalytics />
    </ProtectedRoute>
  }
/>
 <Route
  path="/global-search"
  element={
    <ProtectedRoute>
      <GlobalSearch />
    </ProtectedRoute>
  }
/>
    </Routes>
  );
 
}


export default App;