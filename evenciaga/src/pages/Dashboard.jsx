// ==========================================================
// REACT AND ROUTER IMPORTS
// ==========================================================

import { useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import "./Dashboard.css";
import EventCard from "../components/events/EventCard";

// ==========================================================
// VOLUNTEER DASHBOARD COMPONENT
// ==========================================================

function Dashboard() {
  // --------------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------------

  const navigate = useNavigate();


  // --------------------------------------------------------
  // USER AND UI STATE
  // --------------------------------------------------------

  const [userData, setUserData] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [events, setEvents] = useState([]);
  const [eventsJoined, setEventsJoined] = useState(0);
  const [volunteerHours, setVolunteerHours] = useState(0);
  const [certificatesEarned, setCertificatesEarned] =
    useState(0);
  const [unreadNotifications, setUnreadNotifications] =
    useState(0);
  const [totalPayments, setTotalPayments] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  // --------------------------------------------------------
  // LOAD DASHBOARD DATA
  // --------------------------------------------------------

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const currentUser = auth.currentUser;

        if (!currentUser) {
          setError("You must be logged in to view the dashboard.");
          return;
        }

        // VOLUNTEER PROFILE
        const userSnapshot = await getDoc(
          doc(db, "users", currentUser.uid)
        );

        if (!userSnapshot.exists()) {
          setError("Volunteer profile was not found.");
          return;
        }

        const volunteerProfile = userSnapshot.data();
        setUserData(volunteerProfile);

        // AVAILABLE EVENTS
        const eventsSnapshot = await getDocs(
          collection(db, "events")
        );

        const eventsData = eventsSnapshot.docs.map(
          (eventDocument) => ({
            id: eventDocument.id,
            ...eventDocument.data(),
          })
        );

        setEvents(eventsData);

        // APPROVED EVENTS
        const joinedSnapshot = await getDocs(
          query(
            collection(db, "joinRequests"),
            where("volunteerId", "==", currentUser.uid),
            where("status", "==", "approved")
          )
        );

        setEventsJoined(joinedSnapshot.size);

        // CERTIFICATES
        const certificateSnapshot = await getDocs(
          query(
            collection(db, "certificates"),
            where("volunteerId", "==", currentUser.uid)
          )
        );

        setCertificatesEarned(certificateSnapshot.size);

        const totalHours = certificateSnapshot.docs.reduce(
          (total, certificateDocument) => {
            const hours = Number(
              certificateDocument.data().hours || 0
            );

            return total + (Number.isFinite(hours) ? hours : 0);
          },
          0
        );

        setVolunteerHours(totalHours);

        // UNREAD VOLUNTEER NOTIFICATIONS
        const notificationSnapshot = await getDocs(
          query(
            collection(db, "notifications"),
            where("volunteerId", "==", currentUser.uid),
            where("isRead", "==", false)
          )
        );

        setUnreadNotifications(notificationSnapshot.size);

        // PAID JOIN REQUESTS
        const paymentSnapshot = await getDocs(
          query(
            collection(db, "joinRequests"),
            where("volunteerId", "==", currentUser.uid),
            where("paymentStatus", "==", "paid")
          )
        );

        let totalAmount = 0;

        for (const paymentDocument of paymentSnapshot.docs) {
          const payment = paymentDocument.data();

          if (!payment.eventId) {
            continue;
          }

          const eventSnapshot = await getDoc(
            doc(db, "events", payment.eventId)
          );

          if (eventSnapshot.exists()) {
            totalAmount += Number(
              eventSnapshot.data().paymentPerPerson || 0
            );
          }
        }

        setTotalPayments(totalAmount);
      } catch (dashboardError) {
        console.error("Volunteer dashboard error:", dashboardError);

        setError(
          dashboardError?.message ||
            "Unable to load the volunteer dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);


  // --------------------------------------------------------
  // DERIVED DATA
  // --------------------------------------------------------

  const sortedEvents = useMemo(() => {
    return [...events].sort((firstEvent, secondEvent) => {
      const firstDate = new Date(
        firstEvent.date ||
          firstEvent.startDate ||
          firstEvent.createdAt?.toDate?.() ||
          0
      );

      const secondDate = new Date(
        secondEvent.date ||
          secondEvent.startDate ||
          secondEvent.createdAt?.toDate?.() ||
          0
      );

      return firstDate - secondDate;
    });
  }, [events]);

  const activeEvents = sortedEvents.filter(
    (event) => event.status !== "completed"
  );

  const completedEvents = sortedEvents.filter(
    (event) => event.status === "completed"
  );

  const displayEvents = [...activeEvents, ...completedEvents];

  const isOrganizer =
    userData?.role === "organizer" ||
    userData?.organizerStatus === "approved" ||
    userData?.organizerApproved === true;

  const profileCompletion = useMemo(() => {
    if (!userData) {
      return 0;
    }

    const profileFields = [
      userData.photoURL,
      userData.name,
      userData.phone,
      userData.age,
      userData.city,
      userData.state,
      userData.college,
      userData.degree,
      userData.bio,
      Array.isArray(userData.skills) &&
        userData.skills.length > 0,
      Array.isArray(userData.languages) &&
        userData.languages.length > 0,
      Array.isArray(userData.interests) &&
        userData.interests.length > 0,
      Array.isArray(userData.availability) &&
        userData.availability.length > 0,
      Array.isArray(userData.preferredRoles) &&
        userData.preferredRoles.length > 0,
    ];

    const completedFields = profileFields.filter(Boolean).length;

    return Math.round(
      (completedFields / profileFields.length) * 100
    );
  }, [userData]);


  // --------------------------------------------------------
  // HELPER FUNCTIONS
  // --------------------------------------------------------

  const formatEventDate = (value) => {
    if (!value) {
      return "Date not available";
    }

    if (value?.toDate) {
      return value.toDate().toLocaleDateString();
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return String(value);
    }

    return parsedDate.toLocaleDateString();
  };

  const closeMenuAndNavigate = (route) => {
    setMenuOpen(false);
    navigate(route);
  };


  // --------------------------------------------------------
  // LOGOUT
  // --------------------------------------------------------

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (logoutError) {
      console.error("Logout error:", logoutError);
    }
  };


  // --------------------------------------------------------
  // REQUEST TO JOIN EVENT
  // --------------------------------------------------------




  // --------------------------------------------------------
  // LOADING SCREEN
  // --------------------------------------------------------

  if (loading) {
    return (
      <div className="page-container">
        <div className="volunteer-dashboard-state">
          <div className="volunteer-loading-spinner" />

          <h2>Loading volunteer dashboard</h2>

          <p>
            Fetching your profile, events, notifications,
            certificates, and payments.
          </p>
        </div>
      </div>
    );
  }


  // --------------------------------------------------------
  // ERROR SCREEN
  // --------------------------------------------------------

  if (error || !userData) {
    return (
      <div className="page-container">
        <div className="volunteer-dashboard-state error">
          <div className="volunteer-state-icon">⚠️</div>

          <h2>Unable to load dashboard</h2>

          <p>{error || "Volunteer profile was not found."}</p>

          <button
            type="button"
            className="primary-action-button"
            onClick={() => navigate("/")}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }


  // ========================================================
  // DASHBOARD UI
  // ========================================================

  return (
    <div className="page-container volunteer-dashboard-page">

      {/* ====================================================
          TOP NAVIGATION
      ==================================================== */}

      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <button
            type="button"
            className="menu-toggle-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open dashboard menu"
          >
            ☰
          </button>

          <div className="dashboard-logo">E</div>

          <div>
            <h2>Evenciaga</h2>
            <p>Volunteer Workspace</p>
          </div>
        </div>

        <div className="dashboard-top-actions">
          <button
            type="button"
            className="notification-button"
            onClick={() => navigate("/notifications")}
            aria-label={`Open notifications. ${unreadNotifications} unread.`}
          >
            <span aria-hidden="true">🔔</span>

            {unreadNotifications > 0 && (
              <span className="notification-count">
                {unreadNotifications > 99
                  ? "99+"
                  : unreadNotifications}
              </span>
            )}
          </button>

          <button
            type="button"
            className="profile-button"
            onClick={() => navigate("/profile")}
          >
            <div className="dashboard-avatar">
              {userData.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt={`${userData.name} profile`}
                />
              ) : (
                userData.name?.charAt(0)?.toUpperCase() || "V"
              )}
            </div>

            <span>{userData.name}</span>
          </button>
        </div>
      </header>


      {/* ====================================================
          SIDEBAR MENU
      ==================================================== */}

      {menuOpen && (
        <>
          <div
            className="sidebar-backdrop"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="dashboard-sidebar">
            <div className="sidebar-header">
              <div className="dashboard-logo">E</div>

              <div>
                <h2>Evenciaga</h2>
                <p>Volunteer Workspace</p>
              </div>

              <button
                type="button"
                className="sidebar-close-button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close dashboard menu"
              >
                ✕
              </button>
            </div>

            <nav className="sidebar-navigation">
              <button
                type="button"
                className="sidebar-link"
                onClick={() =>
                  closeMenuAndNavigate("/dashboard")
                }
              >
                <span>🏠</span>
                Dashboard
              </button>

              <button
                type="button"
                className="sidebar-link"
                onClick={() =>
                  closeMenuAndNavigate("/profile")
                }
              >
                <span>👤</span>
                My Profile
              </button>

              {!isOrganizer && (
                <button
                  type="button"
                  className="sidebar-link"
                  onClick={() =>
                    closeMenuAndNavigate("/become-organizer")
                  }
                >
                  <span>🏢</span>
                  Become Organizer
                </button>
              )}

              {isOrganizer && (
                <button
                  type="button"
                  className="sidebar-link"
                  onClick={() =>
                    closeMenuAndNavigate(
                      "/organizer-dashboard"
                    )
                  }
                >
                  <span>🔄</span>
                  Organizer Mode
                </button>
              )}

              <button
                type="button"
                className="sidebar-link"
                onClick={() =>
                  closeMenuAndNavigate("/my-applications")
                }
              >
                <span>📄</span>
                My Applications
              </button>

              <button
                type="button"
                className="sidebar-link"
                onClick={() =>
                  closeMenuAndNavigate("/volunteer-history")
                }
              >
                <span>📜</span>
                Volunteer History
              </button>

              <button
                type="button"
                className="sidebar-link"
                onClick={() =>
                  closeMenuAndNavigate("/certificates")
                }
              >
                <span>🏆</span>
                Certificates
              </button>

              <button
                type="button"
                className="sidebar-link"
                onClick={() =>
                  closeMenuAndNavigate("/notifications")
                }
              >
                <span>🔔</span>
                Notifications
              </button>

              <button
                type="button"
                className="sidebar-link"
                onClick={() =>
                  closeMenuAndNavigate("/payment-history")
                }
              >
                <span>💰</span>
                Payment History
              </button>

              <button
                type="button"
                className="sidebar-link sidebar-logout"
                onClick={handleLogout}
              >
                <span>🚪</span>
                Logout
              </button>
            </nav>
          </aside>
        </>
      )}


      {/* ====================================================
          WELCOME HERO
      ==================================================== */}

      <section className="page-card dashboard-header">
        <div>
          <p className="dashboard-eyebrow">
            Volunteer Dashboard
          </p>

          <h1 className="page-title">
            Welcome back, {userData.name}
          </h1>

          <p className="page-subtitle">
            Discover opportunities, track your applications,
            manage certificates, and grow your volunteer
            reputation.
          </p>

          <div className="volunteer-hero-actions">
            <button
              type="button"
              className="volunteer-primary-cta"
              onClick={() => navigate("/my-applications")}
            >
              📄 My Applications
            </button>

            <button
              type="button"
              className="volunteer-secondary-cta"
              onClick={() => navigate("/profile")}
            >
              View Profile
            </button>
          </div>
        </div>

        <div className="volunteer-hero-side">
          <div className="rating-badge">
            <span>⭐</span>

            <div>
              <small>Your Rating</small>
              <strong>{userData.rating || 0}</strong>
            </div>
          </div>

          <div className="profile-completion-card">
            <div className="profile-completion-header">
              <span>Profile completion</span>
              <strong>{profileCompletion}%</strong>
            </div>

            <div className="profile-completion-track">
              <span
                style={{
                  width: `${profileCompletion}%`,
                }}
              />
            </div>

            {profileCompletion < 100 && (
              <button
                type="button"
                onClick={() => navigate("/edit-profile")}
              >
                Complete Profile →
              </button>
            )}
          </div>
        </div>
      </section>


      {/* ====================================================
          VOLUNTEER STATISTICS
      ==================================================== */}

      <section className="volunteer-dashboard-section">
        <div className="volunteer-section-heading">
          <div>
            <p className="dashboard-eyebrow">
              Your Progress
            </p>

            <h2>Volunteer Overview</h2>
          </div>
        </div>

        <div className="dashboard-stats-grid">
          <button
            type="button"
            className="stat-card volunteer-stat-button"
            onClick={() => navigate("/my-applications")}
          >
            <div className="stat-icon">📅</div>

            <div>
              <p>Events Joined</p>
              <h2>{eventsJoined}</h2>
            </div>
          </button>

          <button
            type="button"
            className="stat-card volunteer-stat-button"
            onClick={() => navigate("/volunteer-history")}
          >
            <div className="stat-icon">⏰</div>

            <div>
              <p>Volunteer Hours</p>
              <h2>{volunteerHours}</h2>
            </div>
          </button>

          <button
            type="button"
            className="stat-card volunteer-stat-button"
            onClick={() => navigate("/certificates")}
          >
            <div className="stat-icon">🏆</div>

            <div>
              <p>Certificates</p>
              <h2>{certificatesEarned}</h2>
            </div>
          </button>

          <button
            type="button"
            className="stat-card volunteer-stat-button"
            onClick={() => navigate("/notifications")}
          >
            <div className="stat-icon">🔔</div>

            <div>
              <p>Unread Notifications</p>
              <h2>{unreadNotifications}</h2>
            </div>
          </button>

          <button
            type="button"
            className="stat-card volunteer-stat-button"
            onClick={() => navigate("/payment-history")}
          >
            <div className="stat-icon">💰</div>

            <div>
              <p>Total Payments</p>
              <h2>₹{totalPayments}</h2>
            </div>
          </button>
        </div>
      </section>


      {/* ====================================================
          QUICK LINKS
      ==================================================== */}

      <section className="volunteer-dashboard-section">
        <div className="volunteer-section-heading">
          <div>
            <p className="dashboard-eyebrow">
              Quick Access
            </p>

            <h2>Manage Your Journey</h2>
          </div>
        </div>

        <div className="volunteer-quick-links-grid">
          <button
            type="button"
            onClick={() => navigate("/my-applications")}
          >
            <span>📄</span>

            <div>
              <h3>My Applications</h3>
              <p>Track pending, approved, and rejected requests.</p>
            </div>

            <strong>→</strong>
          </button>

          <button
            type="button"
            onClick={() => navigate("/volunteer-history")}
          >
            <span>📜</span>

            <div>
              <h3>Volunteer History</h3>
              <p>Review your completed event participation.</p>
            </div>

            <strong>→</strong>
          </button>

          <button
            type="button"
            onClick={() => navigate("/certificates")}
          >
            <span>🏆</span>

            <div>
              <h3>Certificates</h3>
              <p>Open your verified participation certificates.</p>
            </div>

            <strong>→</strong>
          </button>

          <button
            type="button"
            onClick={() => navigate("/payment-history")}
          >
            <span>💰</span>

            <div>
              <h3>Payment History</h3>
              <p>Review paid-event payment records.</p>
            </div>

            <strong>→</strong>
          </button>
        </div>
      </section>


      {/* ====================================================
          AVAILABLE EVENTS
      ==================================================== */}

      <section className="volunteer-events-section">
        <div className="volunteer-events-header">
          <div>
            <p className="dashboard-eyebrow">
              Opportunities
            </p>

            <h2>Available Events</h2>

            <p>
              Browse active volunteer and paid opportunities.
            </p>
          </div>

          <span className="volunteer-event-count">
            {activeEvents.length} Active
          </span>
        </div>

        {displayEvents.length === 0 ? (
          <div className="volunteer-events-empty">
            <span>📅</span>

            <h3>No events available</h3>

            <p>
              New volunteering opportunities will appear here.
            </p>
          </div>
        ) : (
          <div className="volunteer-events-list">

  {displayEvents.map((event) => (

    <EventCard
      key={event.id}
      event={event}
      userData={userData}
      onApplicationSuccess={() => {

        console.log(
          "Application Submitted"
        );

      }}
    />

  ))}

</div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;