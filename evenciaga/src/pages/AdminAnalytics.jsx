import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

const INITIAL_ANALYTICS = {
  totalUsers: 0,
  volunteers: 0,
  organizers: 0,
  verifiedOrganizers: 0,
  suspendedUsers: 0,
  blockedUsers: 0,

  totalEvents: 0,
  activeEvents: 0,
  completedEvents: 0,
  cancelledEvents: 0,

  totalApplications: 0,
  pendingApplications: 0,
  primaryVolunteers: 0,
  standbyVolunteers: 0,
  rejectedApplications: 0,

  attendanceRate: 0,
  completedAttendance: 0,
  noShows: 0,

  certificatesIssued: 0,

  paidEvents: 0,
  completedPayments: 0,
  pendingPayments: 0,

  openReports: 0,

  averageTrustScore: 0,
  highTrust: 0,
  mediumTrust: 0,
  lowTrust: 0,
};

function AdminAnalytics() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const loadAnalytics = async () => {
      if (!currentUser) {
        setError("You must be logged in as an admin.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [
          usersSnapshot,
          eventsSnapshot,
          requestsSnapshot,
          attendanceSnapshot,
          certificatesSnapshot,
          paymentsSnapshot,
          reportsSnapshot,
        ] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "events")),
          getDocs(collection(db, "joinRequests")),
          getDocs(collection(db, "attendance")),
          getDocs(collection(db, "certificates")),
          getDocs(collection(db, "payments")),
          getDocs(collection(db, "reports")),
        ]);

        setUsers(
          usersSnapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );

        setEvents(
          eventsSnapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );

        setRequests(
          requestsSnapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );

        setAttendance(
          attendanceSnapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );

        setCertificates(
          certificatesSnapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );

        setPayments(
          paymentsSnapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );

        setReports(
          reportsSnapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          }))
        );
      } catch (loadError) {
        console.error("Admin analytics error:", loadError);
        setError(
          loadError?.message ||
            "Unable to load admin analytics."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [authReady, currentUser]);

  const getRequestStatus = (request) => {
    if (
      request.selectionType === "primary" ||
      (!request.selectionType &&
        request.status === "approved")
    ) {
      return "primary";
    }

    if (
      request.selectionType === "standby" ||
      request.status === "standby"
    ) {
      return "standby";
    }

    if (
      request.applicationStatus === "rejected" ||
      request.status === "rejected"
    ) {
      return "rejected";
    }

    return "pending";
  };

  const getAttendanceStatus = (record) =>
    String(
      record.attendanceStatus ||
        record.status ||
        ""
    ).toLowerCase();

  const getOrganizerStatus = (user) => {
    if (
      user.organizerStatus === "blocked" ||
      user.accountStatus === "blocked"
    ) {
      return "blocked";
    }

    if (
      user.organizerStatus === "suspended" ||
      user.accountStatus === "suspended"
    ) {
      return "suspended";
    }

    if (
      user.organizerApproved === true ||
      user.organizerStatus === "approved" ||
      user.organizerApplicationStatus === "approved"
    ) {
      return "verified";
    }

    return "pending";
  };

  const analytics = useMemo(() => {
    const organizers = users.filter(
      (user) =>
        user.role === "organizer" ||
        user.organizerApproved === true ||
        Boolean(user.organizationName) ||
        Boolean(user.organizerStatus) ||
        Boolean(user.organizerApplicationStatus)
    );

    const volunteers = users.filter(
      (user) =>
        !organizers.some(
          (organizer) => organizer.id === user.id
        )
    );

    const completedAttendance = attendance.filter((record) => {
      const status = getAttendanceStatus(record);
      return status === "completed" || status === "present";
    });

    const noShows = attendance.filter(
      (record) =>
        getAttendanceStatus(record) === "no-show"
    );

    const countableAttendance =
      completedAttendance.length + noShows.length;

    const attendanceRate =
      countableAttendance > 0
        ? (completedAttendance.length /
            countableAttendance) *
          100
        : 0;

    const completedPayments = payments
      .filter(
        (payment) =>
          payment.status === "completed" ||
          payment.status === "paid"
      )
      .reduce(
        (total, payment) =>
          total +
          Number(
            payment.amount ||
              payment.paymentAmount ||
              0
          ),
        0
      );

    const pendingPayments = payments
      .filter(
        (payment) =>
          payment.status !== "completed" &&
          payment.status !== "paid"
      )
      .reduce(
        (total, payment) =>
          total +
          Number(
            payment.amount ||
              payment.paymentAmount ||
              0
          ),
        0
      );

    const trustScores = users
      .map((user) => Number(user.trustScore || 0))
      .filter((score) => Number.isFinite(score));

    const averageTrustScore =
      trustScores.length > 0
        ? trustScores.reduce(
            (total, score) => total + score,
            0
          ) / trustScores.length
        : 0;

    return {
      totalUsers: users.length,
      volunteers: volunteers.length,
      organizers: organizers.length,

      verifiedOrganizers: organizers.filter(
        (organizer) =>
          getOrganizerStatus(organizer) === "verified"
      ).length,

      suspendedUsers: users.filter(
        (user) =>
          user.accountStatus === "suspended" ||
          user.organizerStatus === "suspended"
      ).length,

      blockedUsers: users.filter(
        (user) =>
          user.accountStatus === "blocked" ||
          user.organizerStatus === "blocked"
      ).length,

      totalEvents: events.length,

      activeEvents: events.filter(
        (event) => event.status === "active"
      ).length,

      completedEvents: events.filter(
        (event) => event.status === "completed"
      ).length,

      cancelledEvents: events.filter(
        (event) => event.status === "cancelled"
      ).length,

      totalApplications: requests.length,

      pendingApplications: requests.filter(
        (request) =>
          getRequestStatus(request) === "pending"
      ).length,

      primaryVolunteers: requests.filter(
        (request) =>
          getRequestStatus(request) === "primary"
      ).length,

      standbyVolunteers: requests.filter(
        (request) =>
          getRequestStatus(request) === "standby"
      ).length,

      rejectedApplications: requests.filter(
        (request) =>
          getRequestStatus(request) === "rejected"
      ).length,

      attendanceRate,
      completedAttendance: completedAttendance.length,
      noShows: noShows.length,

      certificatesIssued: certificates.length,

      paidEvents: events.filter(
        (event) => event.eventType === "paid"
      ).length,

      completedPayments,
      pendingPayments,

      openReports: reports.filter(
        (report) =>
          report.status !== "resolved" &&
          report.status !== "closed"
      ).length,

      averageTrustScore,

      highTrust: trustScores.filter(
        (score) => score >= 90
      ).length,

      mediumTrust: trustScores.filter(
        (score) => score >= 70 && score < 90
      ).length,

      lowTrust: trustScores.filter(
        (score) => score < 70
      ).length,
    };
  }, [
    users,
    events,
    requests,
    attendance,
    certificates,
    payments,
    reports,
  ]);

  const topOrganizers = useMemo(() => {
    const organizerMap = {};

    users.forEach((user) => {
      const isOrganizer =
        user.role === "organizer" ||
        user.organizerApproved === true ||
        Boolean(user.organizationName) ||
        Boolean(user.organizerStatus) ||
        Boolean(user.organizerApplicationStatus);

      if (!isOrganizer) {
        return;
      }

      organizerMap[user.id] = {
        id: user.id,
        name:
          user.organizationName ||
          user.name ||
          "Organizer",
        eventCount: 0,
      };
    });

    events.forEach((event) => {
      if (organizerMap[event.organizerId]) {
        organizerMap[event.organizerId].eventCount += 1;
      }
    });

    return Object.values(organizerMap)
      .sort(
        (first, second) =>
          second.eventCount - first.eventCount
      )
      .slice(0, 5);
  }, [users, events]);

  const topVolunteers = useMemo(() => {
    return users
      .filter((user) =>
        Number.isFinite(
          Number(user.trustScore || 0)
        )
      )
      .sort(
        (first, second) =>
          Number(second.trustScore || 0) -
          Number(first.trustScore || 0)
      )
      .slice(0, 5);
  }, [users]);

  const monthlyEvents = useMemo(() => {
    const monthMap = {};

    events.forEach((event) => {
      const date = new Date(
        event.date ||
          event.startDate ||
          event.createdAt?.toDate?.() ||
          0
      );

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const label = date.toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });

      monthMap[label] =
        (monthMap[label] || 0) + 1;
    });

    return Object.entries(monthMap).map(
      ([label, value]) => ({
        label,
        value,
      })
    );
  }, [events]);

  const maxMonthlyEvents = Math.max(
    1,
    ...monthlyEvents.map((item) => item.value)
  );

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const printReport = () => {
    window.print();
  };

  if (!authReady || loading) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">📊</div>
          <h2>Loading Admin Analytics</h2>
          <p>Calculating platform-wide statistics.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <BackButton />

        <div className="page-card empty-state">
          <div className="empty-icon">⚠️</div>
          <h2>Unable to Load Analytics</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <section className="page-card organizer-hero">
        <BackButton />

        <div>
          <p className="dashboard-eyebrow">
            Admin Workspace
          </p>

          <h1 className="page-title">
            Admin Analytics
          </h1>

          <p className="page-subtitle">
            Review platform growth, users, organizers,
            events, attendance, payments, certificates,
            reports, and trust scores.
          </p>
        </div>

        <button
          type="button"
          className="primary-action-button"
          onClick={printReport}
        >
          🖨 Print Report
        </button>
      </section>

      <AnalyticsSection title="Users and Organizers">
        <MetricCard
          icon="👥"
          label="Total Users"
          value={analytics.totalUsers}
        />

        <MetricCard
          icon="🙋"
          label="Volunteers"
          value={analytics.volunteers}
        />

        <MetricCard
          icon="🏢"
          label="Organizers"
          value={analytics.organizers}
        />

        <MetricCard
          icon="✅"
          label="Verified Organizers"
          value={analytics.verifiedOrganizers}
        />

        <MetricCard
          icon="⚠️"
          label="Suspended"
          value={analytics.suspendedUsers}
        />

        <MetricCard
          icon="⛔"
          label="Blocked"
          value={analytics.blockedUsers}
        />
      </AnalyticsSection>

      <AnalyticsSection title="Event Analytics">
        <MetricCard
          icon="📅"
          label="Total Events"
          value={analytics.totalEvents}
        />

        <MetricCard
          icon="🟢"
          label="Active"
          value={analytics.activeEvents}
        />

        <MetricCard
          icon="✅"
          label="Completed"
          value={analytics.completedEvents}
        />

        <MetricCard
          icon="❌"
          label="Cancelled"
          value={analytics.cancelledEvents}
        />
      </AnalyticsSection>

      <AnalyticsSection title="Applications and Attendance">
        <MetricCard
          icon="📩"
          label="Applications"
          value={analytics.totalApplications}
        />

        <MetricCard
          icon="⏳"
          label="Pending"
          value={analytics.pendingApplications}
        />

        <MetricCard
          icon="✅"
          label="Primary"
          value={analytics.primaryVolunteers}
        />

        <MetricCard
          icon="🧍"
          label="Standby"
          value={analytics.standbyVolunteers}
        />

        <MetricCard
          icon="❌"
          label="Rejected"
          value={analytics.rejectedApplications}
        />

        <MetricCard
          icon="📊"
          label="Attendance Rate"
          value={`${analytics.attendanceRate.toFixed(0)}%`}
        />

        <MetricCard
          icon="👣"
          label="Completed Attendance"
          value={analytics.completedAttendance}
        />

        <MetricCard
          icon="🚫"
          label="No-Shows"
          value={analytics.noShows}
        />
      </AnalyticsSection>

      <AnalyticsSection title="Payments, Certificates and Reports">
        <MetricCard
          icon="💰"
          label="Paid Events"
          value={analytics.paidEvents}
        />

        <MetricCard
          icon="✅"
          label="Completed Payments"
          value={formatCurrency(
            analytics.completedPayments
          )}
        />

        <MetricCard
          icon="⏳"
          label="Pending Payments"
          value={formatCurrency(
            analytics.pendingPayments
          )}
        />

        <MetricCard
          icon="🏆"
          label="Certificates"
          value={analytics.certificatesIssued}
        />

        <MetricCard
          icon="🚩"
          label="Open Reports"
          value={analytics.openReports}
        />
      </AnalyticsSection>

      <AnalyticsSection title="Trust Score Distribution">
        <MetricCard
          icon="🛡️"
          label="Average Trust"
          value={analytics.averageTrustScore.toFixed(1)}
        />

        <MetricCard
          icon="🌟"
          label="High Trust (90+)"
          value={analytics.highTrust}
        />

        <MetricCard
          icon="✅"
          label="Medium Trust (70–89)"
          value={analytics.mediumTrust}
        />

        <MetricCard
          icon="⚠️"
          label="Low Trust (<70)"
          value={analytics.lowTrust}
        />
      </AnalyticsSection>

      <section className="page-card">
        <h2 className="page-title">Events by Month</h2>

        {monthlyEvents.length === 0 ? (
          <div className="empty-state">
            <p>No dated events are available.</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            {monthlyEvents.map((item) => (
              <div
                key={item.label}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "90px 1fr 40px",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <strong>{item.label}</strong>

                <div
                  style={{
                    height: "14px",
                    borderRadius: "999px",
                    overflow: "hidden",
                    background: "#e9edf5",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${
                        (item.value /
                          maxMonthlyEvents) *
                        100
                      }%`,
                      borderRadius: "999px",
                      background:
                        "linear-gradient(90deg, #4f46e5, #0ea5e9)",
                    }}
                  />
                </div>

                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="organizer-dashboard-main-grid">
        <section className="page-card">
          <h2 className="page-title">
            Top Organizers
          </h2>

          {topOrganizers.length === 0 ? (
            <p className="page-subtitle">
              No organizers found.
            </p>
          ) : (
            <div className="organizer-attention-list">
              {topOrganizers.map((organizer, index) => (
                <div
                  key={organizer.id}
                  className="event-meta-item"
                >
                  <span className="event-meta-icon">
                    {index + 1}
                  </span>

                  <div>
                    <small>
                      Events Created
                    </small>

                    <strong>
                      {organizer.name} —{" "}
                      {organizer.eventCount}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="page-card">
          <h2 className="page-title">
            Top Volunteers
          </h2>

          {topVolunteers.length === 0 ? (
            <p className="page-subtitle">
              No volunteer trust data found.
            </p>
          ) : (
            <div className="organizer-attention-list">
              {topVolunteers.map((volunteer, index) => (
                <div
                  key={volunteer.id}
                  className="event-meta-item"
                >
                  <span className="event-meta-icon">
                    {index + 1}
                  </span>

                  <div>
                    <small>
                      Trust Score
                    </small>

                    <strong>
                      {volunteer.name ||
                        volunteer.email ||
                        "Volunteer"}{" "}
                      —{" "}
                      {Number(
                        volunteer.trustScore || 0
                      )}
                      /100
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AnalyticsSection({
  title,
  children,
}) {
  return (
    <section className="page-card">
      <h2 className="page-title">{title}</h2>

      <div className="dashboard-stats-grid">
        {children}
      </div>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>

      <div>
        <p>{label}</p>
        <h2>{value}</h2>
      </div>
    </div>
  );
}

export default AdminAnalytics;