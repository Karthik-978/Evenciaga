import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import BackButton from "../components/BackButton";

function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadEvent = async () => {
      try {
        setLoading(true);

        if (!id) {
          setError("Event ID is missing.");
          return;
        }

        const eventRef = doc(db, "events", id);
        const snapshot = await getDoc(eventRef);

        if (!snapshot.exists()) {
          setError("Event not found.");
          return;
        }

        setEvent({
          id: snapshot.id,
          ...snapshot.data(),
        });
      } catch (err) {
        console.error("Load event:", err);
        setError(
          err?.message || "Unable to load event."
        );
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card loading-page">
          Loading event...
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">⚠️</div>
          <h2>Unable to Load Event</h2>
          <p>{error || "Event not found."}</p>

          <button
            className="primary-button"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const roles = Array.isArray(event.staffingPlan)
    ? event.staffingPlan
    : [];

  const primaryLimit =
    Number(event.primaryLimit || event.requiredVolunteers || 0);

  const standbyLimit =
    Number(event.standbyLimit || 0);

  const mapsUrl =
    event.mapsUrl ||
    event.googleMapsUrl ||
    (
      event.latitude != null &&
      event.longitude != null
        ? `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`
        : event.location
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
          : ""
    );

  const canApply =
    event.status === "active" &&
    event.staffingStatus === "approved";

  return (
    <div className="page-container event-details-page">

      <section className="page-card">
        <BackButton />

        <div className="event-details-hero">
          <div>
            <span className="dashboard-eyebrow">
              Volunteer Opportunity
            </span>

            <h1 className="page-title">
              {event.title}
            </h1>

            <p className="page-subtitle">
              {event.description ||
                "No event description provided."}
            </p>
          </div>

          <span
            className={`request-status ${
              event.status || "active"
            }`}
          >
            {event.status === "active"
              ? "Open"
              : event.status}
          </span>
        </div>

        <div className="event-context-grid">

          <div>
            <span>📅 Date</span>
            <strong>
              {event.date || "Not specified"}
            </strong>
          </div>

          <div>
            <span>📍 Location</span>
            <strong>
              {event.location || "Not specified"}
            </strong>
          </div>

          <div>
            <span>⏱️ Duration</span>
            <strong>
              {event.eventHours
                ? `${event.eventHours} hours`
                : "Not specified"}
            </strong>
          </div>

          <div>
            <span>👥 Primary Volunteers</span>
            <strong>
              {primaryLimit}
            </strong>
          </div>

        </div>

        {mapsUrl && (
          <div className="request-notes">
            <span>Event Location</span>

            <p>
              {event.location}
            </p>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="secondary-button"
            >
              📍 Open in Google Maps
            </a>
          </div>
        )}
      </section>

      <section className="page-card">

        <div className="panel-header">
          <div>
            <span className="dashboard-eyebrow">
              Staffing
            </span>

            <h2>
              Available Volunteer Roles
            </h2>

            <p>
              Choose the role you are interested in.
            </p>
          </div>

          <div className="live-total">
            <strong>{roles.length}</strong>
            <span>Roles</span>
          </div>
        </div>

        {roles.length === 0 ? (
          <div className="empty-staffing-state">
            <h3>
              No role breakdown available
            </h3>

            <p>
              This event does not have a detailed
              staffing plan yet.
            </p>
          </div>
        ) : (
          <div className="proposed-role-list">

            {roles.map((role, index) => (
              <div
                className="proposed-role-row"
                key={`${role.role}-${index}`}
              >
                <div className="role-index">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <strong>
                  {role.role}
                </strong>

                <span>
                  {Number(role.count || 0)} volunteers
                </span>

                {canApply && (
                  <button
                    className="primary-button"
                    onClick={() =>
                      navigate(
                        `/volunteer-role-apply/${event.id}/${index}`
                      )
                    }
                  >
                    Apply
                  </button>
                )}
              </div>
            ))}

          </div>
        )}

      </section>

      <section className="page-card">

        <div className="plan-total-card">

          <div>
            <span>Primary</span>
            <strong>{primaryLimit}</strong>
          </div>

          <div>
            <span>Standby</span>
            <strong>{standbyLimit}</strong>
          </div>

          <div>
            <span>Total Workforce</span>
            <strong>
              {primaryLimit + standbyLimit}
            </strong>
          </div>

        </div>

        {!canApply && (
          <div className="review-warning">
            <span>ⓘ</span>

            <p>
              Volunteer applications are not currently
              open for this event.
            </p>
          </div>
        )}

      </section>

    </div>
  );
}

export default EventDetails;