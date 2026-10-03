import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import BackButton from "../components/BackButton";

function VolunteerEventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [application, setApplication] = useState(null);

  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError("");

      const user = auth.currentUser;

      if (!user) {
        navigate("/");
        return;
      }

      const eventSnapshot = await getDoc(
        doc(db, "events", id)
      );

      if (!eventSnapshot.exists()) {
        setError("Event not found.");
        return;
      }

      const eventData = {
        id: eventSnapshot.id,
        ...eventSnapshot.data(),
      };

      setEvent(eventData);

      const staffingPlan =
        Array.isArray(eventData.staffingPlan)
          ? eventData.staffingPlan
          : [];

      setRoles(staffingPlan);

      if (staffingPlan.length > 0) {
        setSelectedRole(staffingPlan[0].role);
      }

      const applicationQuery = query(
        collection(db, "staffingApplications"),
        where("eventId", "==", id),
        where("volunteerId", "==", user.uid)
      );

      const applicationSnapshot =
        await getDocs(applicationQuery);

      if (!applicationSnapshot.empty) {
        const existing =
          applicationSnapshot.docs[0];

        setApplication({
          id: existing.id,
          ...existing.data(),
        });
      }
    } catch (err) {
      console.error(
        "Load volunteer event:",
        err
      );

      setError(
        err?.message ||
          "Unable to load this event."
      );
    } finally {
      setLoading(false);
    }
  };

  const applyForEvent = async () => {
    const user = auth.currentUser;

    if (!user) {
      navigate("/");
      return;
    }

    if (!event) return;

    if (!selectedRole) {
      alert("Please select a role.");
      return;
    }

    if (application) {
      alert(
        "You have already applied for this event."
      );
      return;
    }

    try {
      setApplying(true);

      const userSnapshot = await getDoc(
        doc(db, "users", user.uid)
      );

      const userData = userSnapshot.exists()
        ? userSnapshot.data()
        : {};

      const conflictQuery = query(
        collection(db, "staffingApplications"),
        where("volunteerId", "==", user.uid),
        where("selectionStatus", "==", "primary")
      );

      const conflictSnapshot =
        await getDocs(conflictQuery);

      const hasConflict =
        conflictSnapshot.docs.some((item) => {
          const data = item.data();

          return (
            data.eventId !== id &&
            data.eventDate === event.date
          );
        });

      if (hasConflict) {
        alert(
          "You already have a primary assignment on this date."
        );
        return;
      }

      const applicationData = {
        eventId: id,

        eventTitle:
          event.title || "Untitled Event",

        eventDate:
          event.date || "",

        eventLocation:
          event.location || "",

        volunteerId:
          user.uid,

        volunteerName:
          userData.name ||
          user.displayName ||
          "Volunteer",

        volunteerEmail:
          user.email || "",

        volunteerRating:
          Number(userData.rating || 0),

        volunteerAttendance:
          Number(
            userData.attendancePercentage ||
              userData.attendance ||
              0
          ),

        volunteerSkills:
          Array.isArray(userData.skills)
            ? userData.skills
            : [],

        requestedRole:
          selectedRole,

        status: "pending",

        selectionStatus:
          "unselected",

        appliedAt:
          serverTimestamp(),
      };

      const created =
        await addDoc(
          collection(
            db,
            "staffingApplications"
          ),
          applicationData
        );

      await addDoc(
        collection(db, "notifications"),
        {
          recipientId: user.uid,

          eventId: id,

          type: "staffing_application",

          title: "Application Submitted",

          message: `Your application for ${event.title} has been submitted.`,

          isRead: false,

          createdAt:
            serverTimestamp(),
        }
      );

      setApplication({
        id: created.id,
        ...applicationData,
      });

      alert(
        "Application submitted successfully."
      );
    } catch (err) {
      console.error(
        "Apply for staffing:",
        err
      );

      alert(
        err?.message ||
          "Failed to submit application."
      );
    } finally {
      setApplying(false);
    }
  };

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
          <div className="empty-icon">
            ⚠️
          </div>

          <h2>
            {error || "Event not found"}
          </h2>

          <button
            className="primary-button"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <section className="page-card">
        <BackButton />

        <span className="dashboard-eyebrow">
          Volunteer Opportunity
        </span>

        <h1 className="page-title">
          {event.title}
        </h1>

        <p className="page-subtitle">
          {event.description}
        </p>

        <div className="event-context-grid">
          <div>
            <span>Date</span>
            <strong>
              {event.date || "Not specified"}
            </strong>
          </div>

          <div>
            <span>Location</span>
            <strong>
              {event.location ||
                "Not specified"}
            </strong>
          </div>

          <div>
            <span>Duration</span>
            <strong>
              {event.eventHours || 0} hrs
            </strong>
          </div>

          <div>
            <span>Staffing</span>
            <strong>
              {event.requiredVolunteers ||
                0}{" "}
              primary
            </strong>
          </div>
        </div>

        {event.location && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              event.location
            )}`}
            target="_blank"
            rel="noreferrer"
            className="secondary-button"
          >
            📍 Open Location in Google Maps
          </a>
        )}
      </section>

      <section className="page-card">
        <div className="panel-header">
          <div>
            <span className="dashboard-eyebrow">
              Staffing Plan
            </span>

            <h2>
              Available Positions
            </h2>

            <p>
              Choose the role you want to apply
              for.
            </p>
          </div>
        </div>

        {roles.length === 0 ? (
          <div className="empty-staffing-state">
            <h3>
              No positions available
            </h3>

            <p>
              This event does not currently
              have an approved staffing plan.
            </p>
          </div>
        ) : (
          <div className="proposed-role-list">
            {roles.map((role, index) => (
              <label
                className={`proposed-role-row ${
                  selectedRole === role.role
                    ? "selected"
                    : ""
                }`}
                key={`${role.role}-${index}`}
              >
                <input
                  type="radio"
                  name="staffingRole"
                  value={role.role}
                  checked={
                    selectedRole ===
                    role.role
                  }
                  onChange={() =>
                    setSelectedRole(
                      role.role
                    )
                  }
                />

                <div className="role-index">
                  {String(index + 1).padStart(
                    2,
                    "0"
                  )}
                </div>

                <strong>
                  {role.role}
                </strong>

                <span>
                  {role.count} positions
                </span>
              </label>
            ))}

            {Number(
              event.standbyLimit || 0
            ) > 0 && (
              <div className="proposed-role-row standby-row">
                <div className="role-index">
                  ST
                </div>

                <strong>
                  Standby Team
                </strong>

                <span>
                  {event.standbyLimit}{" "}
                  positions
                </span>
              </div>
            )}
          </div>
        )}

        {application ? (
          <div className="review-warning">
            <span>✓</span>

            <p>
              You have already applied for this
              event as{" "}
              <strong>
                {application.requestedRole}
              </strong>
              . Your current status is{" "}
              <strong>
                {application.selectionStatus ||
                  application.status}
              </strong>
              .
            </p>
          </div>
        ) : (
          <button
            className="primary-button"
            disabled={
              applying ||
              roles.length === 0
            }
            onClick={applyForEvent}
          >
            {applying
              ? "Submitting..."
              : "Apply for This Position"}
          </button>
        )}
      </section>
    </div>
  );
}

export default VolunteerEventDetails;