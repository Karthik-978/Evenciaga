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

function VolunteerRoleApply() {
  const { eventId, roleIndex } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const user = auth.currentUser;

        if (!user) {
          navigate("/");
          return;
        }

        const [
          eventSnapshot,
          profileSnapshot,
        ] = await Promise.all([
          getDoc(
            doc(db, "events", eventId)
          ),
          getDoc(
            doc(db, "users", user.uid)
          ),
        ]);

        if (!eventSnapshot.exists()) {
          setError("Event not found.");
          return;
        }

        const eventData = {
          id: eventSnapshot.id,
          ...eventSnapshot.data(),
        };

        const roles = Array.isArray(
          eventData.staffingPlan
        )
          ? eventData.staffingPlan
          : [];

        const selectedRole =
          roles[Number(roleIndex)];

        if (!selectedRole) {
          setError("Selected role was not found.");
          return;
        }

        setEvent(eventData);
        setRole(selectedRole);

        if (profileSnapshot.exists()) {
          setProfile(profileSnapshot.data());
        }
      } catch (err) {
        console.error("Load application:", err);

        setError(
          err?.message ||
            "Unable to load application."
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, roleIndex, navigate]);

  const checkExistingApplication = async (
    volunteerId
  ) => {
    const q = query(
      collection(db, "volunteerApplications"),
      where("eventId", "==", eventId),
      where("volunteerId", "==", volunteerId)
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));
  };

  const submitApplication = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const user = auth.currentUser;

      if (!user) {
        navigate("/");
        return;
      }

      if (!event || !role) {
        setError("Event information is missing.");
        return;
      }

      if (
        event.status !== "active" ||
        event.staffingStatus !== "approved"
      ) {
        setError(
          "Applications are not open for this event."
        );
        return;
      }

      const existing =
        await checkExistingApplication(
          user.uid
        );

      const activeApplications =
        existing.filter(
          (item) =>
            item.status !== "rejected" &&
            item.status !== "withdrawn"
        );

      if (activeApplications.length > 0) {
        setError(
          "You already have an application for this event."
        );
        return;
      }

      const application = {
        eventId: event.id,
        eventTitle: event.title || "",
        eventDate: event.date || "",
        eventLocation: event.location || "",

        organizerId:
          event.organizerId || "",

        organizerEmail:
          event.organizerEmail || "",

        volunteerId: user.uid,

        volunteerName:
          profile?.name ||
          user.displayName ||
          "Volunteer",

        volunteerEmail:
          user.email || "",

        volunteerPhoto:
          profile?.photoURL ||
          user.photoURL ||
          "",

        role: role.role,

        roleIndex:
          Number(roleIndex),

        requestedRoleCount:
          Number(role.count || 0),

        rating:
          Number(profile?.rating || 0),

        attendancePercentage:
          Number(
            profile?.attendancePercentage ||
            profile?.attendance ||
            0
          ),

        skills:
          Array.isArray(profile?.skills)
            ? profile.skills
            : profile?.skills || "",

        interests:
          Array.isArray(profile?.interests)
            ? profile.interests
            : profile?.interests || "",

        message:
          message.trim(),

        status: "pending",

        requestedAt:
          serverTimestamp(),

        reviewedAt: null,

        reviewedBy: null,

        selectionType: null,
      };

      await addDoc(
        collection(db, "volunteerApplications"),
        application
      );

      await addDoc(
        collection(db, "notifications"),
        {
          recipientId:
            event.organizerId,

          eventId: event.id,

          type: "volunteer_application",

          title:
            "New Volunteer Application",

          message: `${
            application.volunteerName
          } applied for ${
            role.role
          } at ${
            event.title
          }.`,
          
          isRead: false,

          createdAt:
            serverTimestamp(),
        }
      );

      alert(
        "Application submitted successfully."
      );

      navigate(
        `/event-details/${event.id}`
      );
    } catch (err) {
      console.error(
        "Submit application:",
        err
      );

      setError(
        err?.message ||
          "Failed to submit application."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card loading-page">
          Loading application...
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">⚠️</div>
          <h2>Unable to Apply</h2>
          <p>{error}</p>
          <button
            className="primary-button"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">

      <section className="page-card">

        <BackButton />

        <div className="plan-header">

          <div>
            <span className="dashboard-eyebrow">
              Volunteer Application
            </span>

            <h1>
              {event.title}
            </h1>

            <p>
              {event.location}
            </p>
          </div>

          <span className="review-pill">
            {role.role}
          </span>

        </div>

        <div className="event-context-grid">

          <div>
            <span>Role</span>
            <strong>
              {role.role}
            </strong>
          </div>

          <div>
            <span>Available Positions</span>
            <strong>
              {role.count}
            </strong>
          </div>

          <div>
            <span>Date</span>
            <strong>
              {event.date}
            </strong>
          </div>

          <div>
            <span>Duration</span>
            <strong>
              {event.eventHours || "—"} hrs
            </strong>
          </div>

        </div>

      </section>

      <section className="page-card">

        <div className="panel-header">
          <div>
            <span className="dashboard-eyebrow">
              Your Application
            </span>

            <h2>
              Apply for {role.role}
            </h2>

            <p>
              Your profile information will be
              provided to the organizer for selection.
            </p>
          </div>
        </div>

        <div className="event-context-grid">

          <div>
            <span>Name</span>
            <strong>
              {profile?.name ||
                auth.currentUser?.displayName ||
                "Not provided"}
            </strong>
          </div>

          <div>
            <span>Rating</span>
            <strong>
              ⭐ {profile?.rating || 0}
            </strong>
          </div>

          <div>
            <span>Attendance</span>
            <strong>
              {profile?.attendancePercentage ||
                profile?.attendance ||
                0}%
            </strong>
          </div>

          <div>
            <span>Experience</span>
            <strong>
              {profile?.eventsCompleted || 0}
              {" "}events
            </strong>
          </div>

        </div>

        <form
          onSubmit={submitApplication}
        >

          <div className="request-notes">

            <label>
              Message to Organizer
            </label>

            <textarea
              className="modern-input"
              rows="5"
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              placeholder="Tell the organizer why you are suitable for this role..."
            />

          </div>

          {error && (
            <div className="review-warning">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="primary-button plan-submit-button"
            disabled={submitting}
          >
            {submitting
              ? "Submitting..."
              : "✓ Submit Application"}
          </button>

        </form>

      </section>

    </div>
  );
}

export default VolunteerRoleApply;