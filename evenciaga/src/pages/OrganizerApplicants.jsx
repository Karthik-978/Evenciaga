import { useEffect, useMemo, useState } from "react";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

function OrganizerApplicants() {
  const [applications, setApplications] =
    useState([]);

  const [events, setEvents] =
    useState([]);

  const [selectedEventId, setSelectedEventId] =
    useState("all");

  const [selectedRole, setSelectedRole] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const loadApplications = async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user) return;

      const eventsQuery = query(
        collection(db, "events"),
        where(
          "organizerId",
          "==",
          user.uid
        )
      );

      const eventsSnapshot =
        await getDocs(eventsQuery);

      const organizerEvents =
        eventsSnapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      setEvents(organizerEvents);

      if (!organizerEvents.length) {
        setApplications([]);
        return;
      }

      const applicationsQuery =
        query(
          collection(
            db,
            "volunteerApplications"
          ),
          where(
            "organizerId",
            "==",
            user.uid
          )
        );

      const applicationsSnapshot =
        await getDocs(
          applicationsQuery
        );

      const data =
        applicationsSnapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      setApplications(data);
    } catch (error) {
      console.error(
        "Load applicants:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const roles = useMemo(() => {
    const roleSet = new Set();

    applications.forEach(
      (application) => {
        if (application.role) {
          roleSet.add(
            application.role
          );
        }
      }
    );

    return Array.from(roleSet);
  }, [applications]);

  const filteredApplications =
    applications.filter(
      (application) => {
        const eventMatch =
          selectedEventId === "all" ||
          application.eventId ===
            selectedEventId;

        const roleMatch =
          selectedRole === "all" ||
          application.role ===
            selectedRole;

        return eventMatch && roleMatch;
      }
    );

  const pendingCount =
    applications.filter(
      (item) =>
        item.status === "pending"
    ).length;

  const selectedCount =
    applications.filter(
      (item) =>
        item.status === "selected"
    ).length;

  const standbyCount =
    applications.filter(
      (item) =>
        item.status === "standby"
    ).length;

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card loading-page">
          Loading applicants...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">

      <section className="page-card">

        <BackButton />

        <div className="review-hero">

          <div>
            <span className="dashboard-eyebrow">
              Organizer Panel
            </span>

            <h1>
              Volunteer Applicants
            </h1>

            <p>
              Review volunteers who applied to
              your event staffing roles.
            </p>
          </div>

          <div className="review-count">
            <strong>
              {pendingCount}
            </strong>

            <span>
              Pending
            </span>
          </div>

        </div>

      </section>

      <section className="dashboard-stats-grid">

        <Metric
          label="Applications"
          value={applications.length}
          icon="📨"
        />

        <Metric
          label="Pending"
          value={pendingCount}
          icon="⏳"
        />

        <Metric
          label="Selected"
          value={selectedCount}
          icon="✅"
        />

        <Metric
          label="Standby"
          value={standbyCount}
          icon="🔄"
        />

      </section>

      <section className="page-card">

        <div className="panel-header">

          <div>
            <h2>
              Applicant List
            </h2>

            <p>
              Filter applicants by event or role.
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={loadApplications}
          >
            ↻ Refresh
          </button>

        </div>

        <div className="event-context-grid">

          <div>
            <label>
              Event
            </label>

            <select
              className="modern-input"
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(
                  e.target.value
                );
                setSelectedRole("all");
              }}
            >
              <option value="all">
                All Events
              </option>

              {events.map(
                (event) => (
                  <option
                    key={event.id}
                    value={event.id}
                  >
                    {event.title}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label>
              Role
            </label>

            <select
              className="modern-input"
              value={selectedRole}
              onChange={(e) =>
                setSelectedRole(
                  e.target.value
                )
              }
            >
              <option value="all">
                All Roles
              </option>

              {roles.map(
                (role) => (
                  <option
                    key={role}
                    value={role}
                  >
                    {role}
                  </option>
                )
              )}
            </select>
          </div>

        </div>

      </section>

      <section className="page-card">

        {filteredApplications.length === 0 ? (
          <div className="empty-review-state">

            <div className="large-panel-icon">
              👥
            </div>

            <h2>
              No applicants found
            </h2>

            <p>
              Applications matching your filters
              will appear here.
            </p>

          </div>
        ) : (
          <div className="staffing-request-cards">

            {filteredApplications.map(
              (application) => (
                <ApplicantCard
                  key={application.id}
                  application={application}
                />
              )
            )}

          </div>
        )}

      </section>

    </div>
  );
}

function ApplicantCard({
  application,
}) {
  const skills = Array.isArray(
    application.skills
  )
    ? application.skills.join(", ")
    : application.skills ||
      "Not provided";

  return (
    <div className="staffing-request-card">

      <div className="request-card-top">

        <span
          className={`request-status ${
            application.status ||
            "pending"
          }`}
        >
          {application.status ||
            "pending"}
        </span>

        <span>
          {application.eventDate}
        </span>

      </div>

      <div className="request-card-meta">

        <strong>
          {application.volunteerName}
        </strong>

        <span>
          {application.role}
        </span>

      </div>

      <div className="event-context-grid">

        <div>
          <span>
            Rating
          </span>

          <strong>
            ⭐ {application.rating || 0}
          </strong>
        </div>

        <div>
          <span>
            Attendance
          </span>

          <strong>
            {application.attendancePercentage ||
              0}%
          </strong>
        </div>

        <div>
          <span>
            Skills
          </span>

          <strong>
            {skills}
          </strong>
        </div>

        <div>
          <span>
            Email
          </span>

          <strong>
            {application.volunteerEmail}
          </strong>
        </div>

      </div>

      {application.message && (
        <div className="request-notes">

          <span>
            Applicant Message
          </span>

          <p>
            {application.message}
          </p>

        </div>
      )}

    </div>
  );
}

function Metric({
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

export default OrganizerApplicants;