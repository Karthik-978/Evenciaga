// ==========================================================
// REACT AND ROUTER IMPORTS
// ==========================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import "./OrganizerDashboard.css";


// ==========================================================
// INITIAL DASHBOARD VALUES
// ==========================================================

const INITIAL_STATS = {
  totalEvents: 0,
  activeEvents: 0,
  completedEvents: 0,
  paidEvents: 0,
  pendingRequests: 0,
  approvedVolunteers: 0,
  certificatesIssued: 0,
  plannedPayments: 0,
  averageRating: "0.0",
};


// ==========================================================
// QUICK ACTION CONFIGURATION
// ==========================================================

const QUICK_ACTIONS = [
  {
    title: "Create Event",
    description: "Create a volunteer or paid event.",
    icon: "➕",
    route: "/create-event",
    primary: true,
  },
  {
    title: "My Events",
    description: "View and manage your events.",
    icon: "📅",
    route: "/my-events",
  },
  {
    title: "Requests",
    description: "Review volunteer applications.",
    icon: "📩",
    route: "/event-requests",
  },
   {
    title: "Analytics",
    description: "View event, volunteer, payment, certificate and trust analytics.",
    icon: "📊",
    route: "/organizer-analytics",
  },

  {
    title: "Volunteers",
    description: "View approved volunteers.",
    icon: "👥",
    route: "/approved-volunteers",
  },
  {
    title: "Message Volunteers",
    description:
      "Send updates to primary, standby, confirmed, or declined volunteers.",
    icon: "📢",
    route: "/organizer-broadcast",
  },
  {
    title: "Attendance",
    description: "Manage volunteer attendance.",
    icon: "✅",
    route: "/attendance",
  },
  {
    title: "Ratings",
    description: "Rate volunteer performance.",
    icon: "⭐",
    route: "/ratings",
  },
  {
    title: "Certificates",
    description: "Issue and review certificates.",
    icon: "🏆",
    route: "/certificates",
  },
  {
    title: "Payments",
    description: "Manage paid-event payments.",
    icon: "💰",
    route: "/payment-management",
  },
  {
  title: "Global Search",
  description:
    "Search events, volunteers, organizers, certificates, and reports.",
  icon: "🔎",
  route: "/global-search",
},

];


// ==========================================================
// ORGANIZER DASHBOARD COMPONENT
// ==========================================================

function OrganizerDashboard() {
  // --------------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------------

  const navigate = useNavigate();


  // --------------------------------------------------------
  // COMPONENT STATE
  // --------------------------------------------------------

  const [userData, setUserData] = useState(null);
  const [events, setEvents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(INITIAL_STATS);

  // Number displayed on the organizer notification bell.
  const [unreadNotifications, setUnreadNotifications] =
    useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  // --------------------------------------------------------
  // LOAD ORGANIZER DASHBOARD DATA
  // --------------------------------------------------------

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const currentUser = auth.currentUser;

        if (!currentUser) {
          setError(
            "You must be logged in to open the organizer dashboard."
          );
          return;
        }

        // ORGANIZER PROFILE
        const userSnapshot = await getDoc(
          doc(db, "users", currentUser.uid)
        );

        if (!userSnapshot.exists()) {
          setError("Organizer profile was not found.");
          return;
        }

        const organizerData = userSnapshot.data();
        setUserData(organizerData);

        // UNREAD ORGANIZER NOTIFICATIONS
        const organizerNotificationsSnapshot = await getDocs(
          query(
            collection(db, "notifications"),
            where("organizerId", "==", currentUser.uid),
            where("isRead", "==", false)
          )
        );

        setUnreadNotifications(
          organizerNotificationsSnapshot.size
        );

        // ORGANIZER EVENTS
        const eventsSnapshot = await getDocs(
          query(
            collection(db, "events"),
            where("organizerId", "==", currentUser.uid)
          )
        );

        const organizerEvents = eventsSnapshot.docs.map(
          (eventDocument) => ({
            id: eventDocument.id,
            ...eventDocument.data(),
          })
        );

        setEvents(organizerEvents);

        const organizerEventIds = organizerEvents.map(
          (event) => event.id
        );

        // JOIN REQUESTS FOR THIS ORGANIZER'S EVENTS
        const joinRequestsSnapshot = await getDocs(
          collection(db, "joinRequests")
        );

        const organizerRequests = joinRequestsSnapshot.docs
          .map((requestDocument) => ({
            id: requestDocument.id,
            ...requestDocument.data(),
          }))
          .filter((request) =>
            organizerEventIds.includes(request.eventId)
          );

        setRequests(organizerRequests);

        // CERTIFICATES ISSUED BY THIS ORGANIZER
        const certificatesSnapshot = await getDocs(
          query(
            collection(db, "certificates"),
            where("organizerId", "==", currentUser.uid)
          )
        );

        // RATINGS CONNECTED TO THIS ORGANIZER'S EVENTS
        const ratingsSnapshot = await getDocs(
          collection(db, "ratings")
        );

        const organizerRatings = ratingsSnapshot.docs
          .map((ratingDocument) => ({
            id: ratingDocument.id,
            ...ratingDocument.data(),
          }))
          .filter((ratingRecord) =>
            organizerEventIds.includes(ratingRecord.eventId)
          );

        const validRatings = organizerRatings
          .map((ratingRecord) => Number(ratingRecord.rating || 0))
          .filter(
            (ratingValue) =>
              Number.isFinite(ratingValue) && ratingValue > 0
          );

        const averageRating =
          validRatings.length > 0
            ? (
                validRatings.reduce(
                  (total, ratingValue) =>
                    total + ratingValue,
                  0
                ) / validRatings.length
              ).toFixed(1)
            : "0.0";

        // REQUEST COUNTS
        const pendingRequests = organizerRequests.filter(
          (request) => request.status === "pending"
        ).length;

        const approvedVolunteers = organizerRequests.filter(
          (request) => request.status === "approved"
        ).length;

        // PLANNED PAYMENT ESTIMATE
        const approvedCountByEvent = {};

        organizerRequests.forEach((request) => {
          if (request.status !== "approved") {
            return;
          }

          approvedCountByEvent[request.eventId] =
            (approvedCountByEvent[request.eventId] || 0) + 1;
        });

        const plannedPayments = organizerEvents.reduce(
          (total, event) => {
            if (event.eventType !== "paid") {
              return total;
            }

            const paymentPerPerson = Number(
              event.paymentPerPerson || 0
            );

            const approvedCount =
              approvedCountByEvent[event.id] || 0;

            return total + paymentPerPerson * approvedCount;
          },
          0
        );

        // SAVE DASHBOARD STATISTICS
        setStats({
          totalEvents: organizerEvents.length,

          activeEvents: organizerEvents.filter(
            (event) => event.status === "active"
          ).length,

          completedEvents: organizerEvents.filter(
            (event) => event.status === "completed"
          ).length,

          paidEvents: organizerEvents.filter(
            (event) => event.eventType === "paid"
          ).length,

          pendingRequests,

          approvedVolunteers,

          certificatesIssued: certificatesSnapshot.size,

          plannedPayments,

          averageRating,
        });
      } catch (dashboardError) {
        console.error(
          "Organizer dashboard error:",
          dashboardError
        );

        setError(
          dashboardError?.message ||
            "Unable to load the organizer dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);


  // --------------------------------------------------------
  // DERIVED DATA
  // --------------------------------------------------------

  const organizerStatus =
    userData?.organizerStatus ||
    userData?.organizerApplicationStatus ||
    (userData?.organizerApproved
      ? "approved"
      : "pending");

  const isApproved = organizerStatus === "approved";

  const profileInitial =
    userData?.organizationName?.charAt(0)?.toUpperCase() ||
    userData?.name?.charAt(0)?.toUpperCase() ||
    "O";

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

      return secondDate - firstDate;
    });
  }, [events]);

  const recentEvents = sortedEvents.slice(0, 3);

  const latestPendingRequests = requests
    .filter((request) => request.status === "pending")
    .slice(0, 4);


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


  // --------------------------------------------------------
  // LOADING SCREEN
  // --------------------------------------------------------

  if (loading) {
    return (
      <div className="page-container">
        <div className="organizer-dashboard-state">
          <div className="organizer-loading-spinner" />

          <h2>Loading organizer workspace</h2>

          <p>
            Fetching your events, volunteers, requests,
            and statistics.
          </p>
        </div>
      </div>
    );
  }


  // --------------------------------------------------------
  // ERROR SCREEN
  // --------------------------------------------------------

  if (error) {
    return (
      <div className="page-container">
        <div className="organizer-dashboard-state error">
          <div className="organizer-state-icon">⚠️</div>

          <h2>Unable to load organizer dashboard</h2>

          <p>{error}</p>

          <button
            type="button"
            className="primary-action-button"
            onClick={() => navigate("/dashboard")}
          >
            Return to Volunteer Dashboard
          </button>
        </div>
      </div>
    );
  }


  // ========================================================
  // DASHBOARD UI
  // ========================================================

  return (
    <div className="page-container organizer-dashboard-page">

      {/* ====================================================
          TOP NAVIGATION
      ==================================================== */}

      <header className="organizer-dashboard-topbar">
        <div className="organizer-dashboard-brand">
          <div className="organizer-dashboard-logo">
            E
          </div>

          <div>
            <h2>Evenciaga</h2>
            <p>Organizer Workspace</p>
          </div>
        </div>

        <div className="organizer-dashboard-top-actions">
          <button
            type="button"
            className="organizer-topbar-button organizer-notification-button"
            onClick={() =>
              navigate("/organizer-notifications")
            }
            aria-label={`Open organizer notifications. ${unreadNotifications} unread.`}
          >
            <span aria-hidden="true">🔔</span>

            {unreadNotifications > 0 && (
              <span className="organizer-notification-count">
                {unreadNotifications > 99
                  ? "99+"
                  : unreadNotifications}
              </span>
            )}
          </button>

          <button
            type="button"
            className="organizer-profile-control"
            onClick={() => navigate("/organizer-profile")}
          >
            {userData?.organizationLogo ||
            userData?.photoURL ? (
              <img
                src={
                  userData.organizationLogo ||
                  userData.photoURL
                }
                alt="Organizer"
              />
            ) : (
              <span>{profileInitial}</span>
            )}

            <div>
              <strong>
                {userData?.organizationName ||
                  userData?.name ||
                  "Organizer"}
              </strong>

              <small>
                {isApproved
                  ? "Verified organizer"
                  : "Verification pending"}
              </small>
            </div>
          </button>
        </div>
      </header>


      {/* ====================================================
          HERO SECTION
      ==================================================== */}

      <section className="organizer-dashboard-hero">
        <div className="organizer-hero-main">
          <p className="dashboard-eyebrow">
            Organizer Dashboard
          </p>

          <h1>
            Welcome back,{" "}
            {userData?.name || "Organizer"}
          </h1>

          <p>
            Manage events, volunteer applications,
            attendance, ratings, certificates, and
            payments from one professional workspace.
          </p>

          <div className="organizer-hero-actions">
            <button
              type="button"
              className="organizer-primary-cta"
              onClick={() => navigate("/create-event")}
            >
              ➕ Create New Event
            </button>

            <button
              type="button"
              className="organizer-secondary-cta"
              onClick={() => navigate("/my-events")}
            >
              View My Events
            </button>
          </div>
        </div>

        <div className="organizer-hero-profile">
          <div className="organizer-hero-profile-avatar">
            {userData?.organizationLogo ||
            userData?.photoURL ? (
              <img
                src={
                  userData.organizationLogo ||
                  userData.photoURL
                }
                alt="Organizer"
              />
            ) : (
              <span>{profileInitial}</span>
            )}
          </div>

          <div>
            <strong>
              {userData?.organizationName ||
                "Organization profile pending"}
            </strong>

            <span
              className={
                isApproved
                  ? "organizer-verification-badge approved"
                  : "organizer-verification-badge pending"
              }
            >
              {isApproved
                ? "✓ Verified Organizer"
                : "Verification Pending"}
            </span>
          </div>
        </div>
      </section>


      {/* ====================================================
          KEY STATISTICS
      ==================================================== */}

      <section className="organizer-dashboard-section">
        <div className="organizer-section-heading">
          <div>
            <p className="dashboard-eyebrow">
              Performance Overview
            </p>

            <h2>Key Statistics</h2>
          </div>

          <button
            type="button"
            className="organizer-text-link"
            onClick={() => navigate("/my-events")}
          >
            View events →
          </button>
        </div>

        <div className="organizer-kpi-grid">
          <div className="organizer-kpi-card primary">
            <span>📅</span>

            <div>
              <small>Total Events</small>
              <strong>{stats.totalEvents}</strong>
            </div>
          </div>

          <div className="organizer-kpi-card success">
            <span>🟢</span>

            <div>
              <small>Active Events</small>
              <strong>{stats.activeEvents}</strong>
            </div>
          </div>

          <div className="organizer-kpi-card warning">
            <span>📩</span>

            <div>
              <small>Pending Requests</small>
              <strong>{stats.pendingRequests}</strong>
            </div>
          </div>

          <div className="organizer-kpi-card neutral">
            <span>👥</span>

            <div>
              <small>Approved Volunteers</small>
              <strong>{stats.approvedVolunteers}</strong>
            </div>
          </div>

          <div className="organizer-kpi-card accent">
            <span>⭐</span>

            <div>
              <small>Average Rating</small>
              <strong>{stats.averageRating}</strong>
            </div>
          </div>

          <div className="organizer-kpi-card money">
            <span>💰</span>

            <div>
              <small>Planned Payments</small>
              <strong>₹{stats.plannedPayments}</strong>
            </div>
          </div>
        </div>
      </section>


      {/* ====================================================
          MAIN CONTENT GRID
      ==================================================== */}

      <div className="organizer-dashboard-main-grid">

        {/* ==================================================
            LEFT COLUMN
        ================================================== */}

        <div className="organizer-dashboard-main-column">

          {/* ================================================
              QUICK ACTIONS
          ================================================ */}

          <section className="organizer-dashboard-panel">
            <div className="organizer-section-heading">
              <div>
                <p className="dashboard-eyebrow">
                  Quick Actions
                </p>

                <h2>Manage Your Workflow</h2>
              </div>
            </div>

            <div className="organizer-quick-actions-grid">
              {QUICK_ACTIONS.map((action) => (
                <button
                  type="button"
                  key={action.title}
                  className={
                    action.primary
                      ? "organizer-quick-action primary"
                      : "organizer-quick-action"
                  }
                  onClick={() => navigate(action.route)}
                >
                  <span>{action.icon}</span>

                  <div>
                    <h3>{action.title}</h3>
                    <p>{action.description}</p>
                  </div>

                  <strong>→</strong>
                </button>
              ))}
            </div>
          </section>


          {/* ================================================
              RECENT EVENTS
          ================================================ */}

          <section className="organizer-dashboard-panel">
            <div className="organizer-section-heading">
              <div>
                <p className="dashboard-eyebrow">
                  Event Activity
                </p>

                <h2>Recent Events</h2>
              </div>

              <button
                type="button"
                className="organizer-text-link"
                onClick={() => navigate("/my-events")}
              >
                View all →
              </button>
            </div>

            {recentEvents.length > 0 ? (
              <div className="organizer-recent-events">
                {recentEvents.map((event) => (
                  <article
                    className="organizer-recent-event-card"
                    key={event.id}
                  >
                    <div className="organizer-event-date-box">
                      <span>📅</span>

                      <strong>
                        {formatEventDate(event.date)}
                      </strong>
                    </div>

                    <div className="organizer-event-summary">
                      <div>
                        <h3>
                          {event.title || "Untitled Event"}
                        </h3>

                        <p>
                          📍{" "}
                          {event.location ||
                            "Location pending"}
                        </p>
                      </div>

                      <span
                        className={`organizer-event-status ${
                          event.status || "active"
                        }`}
                      >
                        {event.status || "active"}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="organizer-event-open-button"
                      onClick={() => navigate("/my-events")}
                    >
                      Open
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="organizer-panel-empty-state">
                <span>📅</span>

                <h3>No events created yet</h3>

                <p>
                  Create your first event to start
                  managing volunteers.
                </p>

                <button
                  type="button"
                  className="primary-action-button"
                  onClick={() =>
                    navigate("/create-event")
                  }
                >
                  Create Event
                </button>
              </div>
            )}
          </section>
        </div>


        {/* ==================================================
            RIGHT COLUMN
        ================================================== */}

        <aside className="organizer-dashboard-side-column">

          {/* ================================================
              ACTION REQUIRED
          ================================================ */}

          <section className="organizer-dashboard-panel sticky-panel">
            <div className="organizer-section-heading compact">
              <div>
                <p className="dashboard-eyebrow">
                  Action Required
                </p>

                <h2>Needs Attention</h2>
              </div>
            </div>

            <div className="organizer-attention-list">
              <button
                type="button"
                onClick={() =>
                  navigate("/event-requests")
                }
              >
                <span className="attention-icon warning">
                  📩
                </span>

                <div>
                  <strong>
                    {stats.pendingRequests} pending
                    requests
                  </strong>

                  <p>Review volunteer applications.</p>
                </div>

                <b>→</b>
              </button>

              <button
                type="button"
                onClick={() => navigate("/attendance")}
              >
                <span className="attention-icon success">
                  ✅
                </span>

                <div>
                  <strong>
                    Attendance management
                  </strong>

                  <p>
                    Record event participation.
                  </p>
                </div>

                <b>→</b>
              </button>

              <button
                type="button"
                onClick={() => navigate("/ratings")}
              >
                <span className="attention-icon accent">
                  ⭐
                </span>

                <div>
                  <strong>Volunteer ratings</strong>

                  <p>
                    Rate completed participation.
                  </p>
                </div>

                <b>→</b>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/payment-management")
                }
              >
                <span className="attention-icon money">
                  💰
                </span>

                <div>
                  <strong>
                    Payment management
                  </strong>

                  <p>
                    Review paid-event records.
                  </p>
                </div>

                <b>→</b>
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate("/issue-certificates")
                }
              >
                <span className="attention-icon accent">
                  🏆
                </span>

                <div>
                  <strong>
                    Issue certificates
                  </strong>

                  <p>
                    Issue certificates to eligible volunteers.
                  </p>
                </div>

                <b>→</b>
              </button>
            </div>
          </section>


          {/* ================================================
              LATEST REQUESTS
          ================================================ */}

          <section className="organizer-dashboard-panel">
            <div className="organizer-section-heading compact">
              <div>
                <p className="dashboard-eyebrow">
                  Applications
                </p>

                <h2>Latest Requests</h2>
              </div>
            </div>

            {latestPendingRequests.length > 0 ? (
              <div className="organizer-latest-requests">
                {latestPendingRequests.map((request) => (
                  <article key={request.id}>
                    <div className="request-avatar">
                      {request.volunteerName
                        ?.charAt(0)
                        ?.toUpperCase() || "V"}
                    </div>

                    <div>
                      <strong>
                        {request.volunteerName ||
                          "Volunteer"}
                      </strong>

                      <p>
                        {request.eventTitle ||
                          "Event application"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate("/event-requests")
                      }
                    >
                      Review
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="organizer-small-empty-state">
                <span>📩</span>
                <p>No pending requests.</p>
              </div>
            )}
          </section>


          {/* ================================================
              ACCOUNT SHORTCUTS
          ================================================ */}

          <section className="organizer-dashboard-panel">
            <div className="organizer-section-heading compact">
              <div>
                <p className="dashboard-eyebrow">
                  Account
                </p>

                <h2>Organizer Controls</h2>
              </div>
            </div>

            <div className="organizer-account-links">
              <button
                type="button"
                onClick={() =>
                  navigate("/organizer-profile")
                }
              >
                <span>🏢</span>
                Organizer Profile
                <strong>→</strong>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/payment-history")
                }
              >
                <span>🧾</span>
                Payment History
                <strong>→</strong>
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                <span>🔄</span>
                Volunteer Mode
                <strong>→</strong>
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default OrganizerDashboard;