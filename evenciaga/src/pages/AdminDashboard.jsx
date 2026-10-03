import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { signOut } from "firebase/auth";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { auth, db } from "../firebase";

const ADMIN_ACTIONS = [
  {
    title: "Manage Users",
    description:
      "Review volunteer and user accounts.",
    icon: "👥",
    route: "/manage-users",
  },
  {
    title: "Manage Organizers",
    description:
      "Verify, suspend, block, or review organizers.",
    icon: "🏢",
    route: "/manage-organizers",
  },
  {
    title: "Manage Events",
    description:
      "Review and control platform events.",
    icon: "📅",
    route: "/manage-events",
  },
  {
  title: "Staffing Requests",
  description:
    "Review events that need Evenciaga staffing assistance.",
  icon: "🧑‍💼",
  route: "/admin/staffing-requests",
},
  {
    title: "Organizer Applications",
    description:
      "Approve or reject organizer applications.",
    icon: "📝",
    route: "/admin-applications",
  },
  {
    title: "Reports",
    description:
      "Review unresolved event and user reports.",
    icon: "🚩",
    route: "/reports",
  },
  {
  title: "Global Search",
  description:
    "Search platform events, users, organizers, certificates, and reports.",
  icon: "🔎",
  route: "/global-search",
  },
  {
    title: "Admin Analytics",
    description:
      "Review platform-wide growth and performance.",
    icon: "📊",
    route: "/admin-analytics",
  },
];

function AdminDashboard() {
  const navigate =
    useNavigate();

  const [stats, setStats] =
    useState({
      totalUsers: 0,
      volunteers: 0,
      organizers: 0,
      suspendedUsers: 0,
      totalEvents: 0,
      activeEvents: 0,
      completedEvents: 0,
      pendingReports: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats =
    async () => {
      try {
        setLoading(true);
        setError("");

        const [
          usersSnapshot,
          eventsSnapshot,
          reportsSnapshot,
        ] = await Promise.all([
          getDocs(
            collection(db, "users")
          ),

          getDocs(
            collection(db, "events")
          ),

          getDocs(
            collection(db, "reports")
          ),
        ]);

        const users =
          usersSnapshot.docs.map(
            (document) => ({
              id: document.id,
              ...document.data(),
            })
          );

        const events =
          eventsSnapshot.docs.map(
            (document) => ({
              id: document.id,
              ...document.data(),
            })
          );

        const reports =
          reportsSnapshot.docs.map(
            (document) => ({
              id: document.id,
              ...document.data(),
            })
          );

        const organizers =
          users.filter(
            (user) =>
              user.role ===
                "organizer" ||
              user.organizerApproved ===
                true ||
              Boolean(
                user.organizationName
              ) ||
              Boolean(
                user.organizerStatus
              ) ||
              Boolean(
                user
                  .organizerApplicationStatus
              )
          );

        const organizerIds =
          new Set(
            organizers.map(
              (organizer) =>
                organizer.id
            )
          );

        const volunteers =
          users.filter(
            (user) =>
              !organizerIds.has(
                user.id
              )
          );

        setStats({
          totalUsers:
            users.length,

          volunteers:
            volunteers.length,

          organizers:
            organizers.length,

          suspendedUsers:
            users.filter(
              (user) =>
                user.accountStatus ===
                  "suspended" ||
                user.organizerStatus ===
                  "suspended"
            ).length,

          totalEvents:
            events.length,

          activeEvents:
            events.filter(
              (event) =>
                event.status ===
                "active"
            ).length,

          completedEvents:
            events.filter(
              (event) =>
                event.status ===
                "completed"
            ).length,

          pendingReports:
            reports.filter(
              (report) =>
                report.status !==
                  "resolved" &&
                report.status !==
                  "closed"
            ).length,
        });
      } catch (dashboardError) {
        console.error(
          "Admin dashboard error:",
          dashboardError
        );

        setError(
          dashboardError?.message ||
            "Unable to load admin dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

  const handleLogout =
    async () => {
      await signOut(auth);
      navigate("/");
    };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">
            🛡️
          </div>

          <h2>
            Loading Admin Dashboard
          </h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">
            ⚠️
          </div>

          <h2>
            Unable to Load Dashboard
          </h2>

          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <section className="page-card organizer-hero">
        <div>
          <p className="dashboard-eyebrow">
            Platform Administration
          </p>

          <h1 className="page-title">
            🛡 Admin Dashboard
          </h1>

          <p className="page-subtitle">
            Manage users, organizers, events,
            applications, reports, and platform analytics.
          </p>
        </div>

        <button
          type="button"
          className="delete-action-button"
          onClick={handleLogout}
        >
          🚪 Logout
        </button>
      </section>

      <section className="dashboard-stats-grid">
        <MetricCard
          icon="👥"
          label="Total Users"
          value={stats.totalUsers}
        />

        <MetricCard
          icon="🙋"
          label="Volunteers"
          value={stats.volunteers}
        />

        <MetricCard
          icon="🏢"
          label="Organizers"
          value={stats.organizers}
        />

        <MetricCard
          icon="🚫"
          label="Suspended"
          value={stats.suspendedUsers}
        />

        <MetricCard
          icon="📅"
          label="Total Events"
          value={stats.totalEvents}
        />

        <MetricCard
          icon="🟢"
          label="Active Events"
          value={stats.activeEvents}
        />

        <MetricCard
          icon="✅"
          label="Completed"
          value={stats.completedEvents}
        />

        <MetricCard
          icon="🚩"
          label="Open Reports"
          value={stats.pendingReports}
        />
      </section>

      <section className="page-card">
        <p className="dashboard-eyebrow">
          Admin Controls
        </p>

        <h2 className="page-title">
          Manage Platform
        </h2>

        <div className="organizer-quick-actions-grid">
          {ADMIN_ACTIONS.map(
            (action) => (
              <button
                key={action.title}
                type="button"
                className="organizer-quick-action"
                onClick={() =>
                  navigate(
                    action.route
                  )
                }
              >
                <span>
                  {action.icon}
                </span>

                <div>
                  <h3>
                    {action.title}
                  </h3>

                  <p>
                    {
                      action.description
                    }
                  </p>
                </div>

                <strong>
                  →
                </strong>
              </button>
            )
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        {icon}
      </div>

      <div>
        <p>{label}</p>
        <h2>{value}</h2>
      </div>
    </div>
  );
}

export default AdminDashboard;