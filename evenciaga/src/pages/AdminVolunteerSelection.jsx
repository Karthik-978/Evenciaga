import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  addDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import BackButton from "../components/BackButton";

function AdminVolunteerSelection() {
  const { eventId } = useParams();

  const [event, setEvent] =
    useState(null);

  const [applications, setApplications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const eventSnapshot =
        await getDoc(
          doc(db, "events", eventId)
        );

      if (
        !eventSnapshot.exists()
      ) {
        setEvent(null);
        return;
      }

      setEvent({
        id: eventSnapshot.id,
        ...eventSnapshot.data(),
      });

      const q = query(
        collection(
          db,
          "staffingApplications"
        ),
        where(
          "eventId",
          "==",
          eventId
        )
      );

      const snapshot =
        await getDocs(q);

      const data =
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

      data.sort((a, b) => {
        const ratingA =
          Number(
            a.volunteerRating || 0
          );

        const ratingB =
          Number(
            b.volunteerRating || 0
          );

        return ratingB - ratingA;
      });

      setApplications(data);
    } catch (error) {
      console.error(
        "Load volunteer selection:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  const primaryApplications =
    useMemo(
      () =>
        applications.filter(
          (item) =>
            item.selectionStatus ===
            "primary"
        ),
      [applications]
    );

  const standbyApplications =
    useMemo(
      () =>
        applications.filter(
          (item) =>
            item.selectionStatus ===
            "standby"
        ),
      [applications]
    );

  const primaryLimit =
    Number(
      event?.primaryLimit ||
        event?.requiredVolunteers ||
        0
    );

  const standbyLimit =
    Number(
      event?.standbyLimit || 0
    );

  const assignVolunteer = async (
    application,
    selectionStatus
  ) => {
    if (!event) return;

    try {
      setProcessingId(
        application.id
      );

      if (
        selectionStatus ===
        "primary" &&
        primaryApplications.length >=
          primaryLimit
      ) {
        alert(
          `Primary capacity is already full (${primaryLimit}).`
        );
        return;
      }

      if (
        selectionStatus ===
        "standby" &&
        standbyApplications.length >=
          standbyLimit
      ) {
        alert(
          `Standby capacity is already full (${standbyLimit}).`
        );
        return;
      }

      const conflictQuery =
        query(
          collection(
            db,
            "staffingApplications"
          ),
          where(
            "volunteerId",
            "==",
            application.volunteerId
          ),
          where(
            "selectionStatus",
            "==",
            "primary"
          )
        );

      const conflictSnapshot =
        await getDocs(
          conflictQuery
        );

      const hasConflict =
        conflictSnapshot.docs.some(
          (item) => {
            const data =
              item.data();

            return (
              data.eventId !==
                eventId &&
              data.eventDate ===
                event.date
            );
          }
        );

      if (hasConflict) {
        alert(
          "This volunteer already has a primary assignment on the same event date."
        );
        return;
      }

      await updateDoc(
        doc(
          db,
          "staffingApplications",
          application.id
        ),
        {
          status: "selected",

          selectionStatus,

          selectedAt:
            serverTimestamp(),
        }
      );

      await addDoc(
        collection(db, "notifications"),
        {
          recipientId:
            application.volunteerId,

          eventId,

          type:
            selectionStatus ===
            "primary"
              ? "volunteer_selected"
              : "volunteer_standby",

          title:
            selectionStatus ===
            "primary"
              ? "You Were Selected"
              : "You Are on Standby",

          message:
            selectionStatus ===
            "primary"
              ? `You have been selected for ${event.title} as ${application.requestedRole}.`
              : `You have been placed on the standby team for ${event.title}.`,

          isRead: false,

          createdAt:
            serverTimestamp(),
        }
      );

      await loadData();
    } catch (error) {
      console.error(
        "Assign volunteer:",
        error
      );

      alert(
        error?.message ||
          "Failed to assign volunteer."
      );
    } finally {
      setProcessingId("");
    }
  };

  const rejectVolunteer = async (
    application
  ) => {
    try {
      setProcessingId(
        application.id
      );

      await updateDoc(
        doc(
          db,
          "staffingApplications",
          application.id
        ),
        {
          status: "reviewed",

          selectionStatus:
            "rejected",

          selectedAt:
            serverTimestamp(),
        }
      );

      await addDoc(
        collection(db, "notifications"),
        {
          recipientId:
            application.volunteerId,

          eventId,

          type: "volunteer_not_selected",

          title: "Application Update",

          message: `You were not selected for ${event?.title || "this event"}.`,

          isRead: false,

          createdAt:
            serverTimestamp(),
        }
      );

      await loadData();
    } catch (error) {
      console.error(
        "Reject volunteer:",
        error
      );

      alert(
        "Failed to update volunteer."
      );
    } finally {
      setProcessingId("");
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card loading-page">
          Loading applicants...
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <h2>
            Event not found.
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <section className="page-card">
        <BackButton />

        <span className="dashboard-eyebrow">
          Administration
        </span>

        <h1 className="page-title">
          Volunteer Selection
        </h1>

        <p className="page-subtitle">
          {event.title}
        </p>

        <div className="event-context-grid">
          <div>
            <span>Primary Capacity</span>

            <strong>
              {primaryApplications.length} /{" "}
              {primaryLimit}
            </strong>
          </div>

          <div>
            <span>Standby Capacity</span>

            <strong>
              {standbyApplications.length} /{" "}
              {standbyLimit}
            </strong>
          </div>

          <div>
            <span>Total Applicants</span>

            <strong>
              {applications.length}
            </strong>
          </div>

          <div>
            <span>Event Date</span>

            <strong>
              {event.date ||
                "Not specified"}
            </strong>
          </div>
        </div>
      </section>

      <section className="page-card">
        <div className="panel-header">
          <div>
            <h2>
              Applicant Pool
            </h2>

            <p>
              Applicants are ranked by rating.
              Check conflicts before selecting.
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={loadData}
          >
            ↻ Refresh
          </button>
        </div>

        {applications.length ===
        0 ? (
          <div className="empty-staffing-state">
            <div className="large-panel-icon">
              👥
            </div>

            <h3>
              No applicants yet
            </h3>

            <p>
              Volunteers who apply for this
              staffing plan will appear here.
            </p>
          </div>
        ) : (
          <div className="staffing-request-cards">
            {applications.map(
              (application, index) => (
                <div
                  key={application.id}
                  className="staffing-request-card"
                >
                  <div className="request-card-top">
                    <span>
                      #{index + 1}
                    </span>

                    <span
                      className={`request-status ${
                        application.selectionStatus ||
                        "pending"
                      }`}
                    >
                      {application.selectionStatus ===
                      "primary"
                        ? "Primary"
                        : application.selectionStatus ===
                          "standby"
                        ? "Standby"
                        : application.selectionStatus ===
                          "rejected"
                        ? "Rejected"
                        : "Pending"}
                    </span>
                  </div>

                  <h3>
                    {application.volunteerName ||
                      "Volunteer"}
                  </h3>

                  <p>
                    Requested role:{" "}
                    <strong>
                      {application.requestedRole}
                    </strong>
                  </p>

                  <div className="request-card-meta">
                    <span>
                      ⭐{" "}
                      {application.volunteerRating ||
                        0}
                    </span>

                    <span>
                      📊{" "}
                      {application.volunteerAttendance ||
                        0}
                      %
                    </span>

                    <span>
                      📧{" "}
                      {application.volunteerEmail ||
                        "No email"}
                    </span>
                  </div>

                  <div className="request-card-meta">
                    <span>
                      Skills:{" "}
                      {Array.isArray(
                        application.volunteerSkills
                      )
                        ? application.volunteerSkills.join(
                            ", "
                          ) ||
                          "None listed"
                        : "None listed"}
                    </span>
                  </div>

                  {application.selectionStatus ===
                    "unselected" ||
                  application.selectionStatus ===
                    "pending" ? (
                    <div
                      className="review-actions"
                      style={{
                        marginTop:
                          "16px",
                      }}
                    >
                      <button
                        className="reject-plan-button"
                        disabled={
                          processingId ===
                          application.id
                        }
                        onClick={() =>
                          rejectVolunteer(
                            application
                          )
                        }
                      >
                        Reject
                      </button>

                      <button
                        className="secondary-button"
                        disabled={
                          processingId ===
                            application.id ||
                          standbyLimit <=
                            standbyApplications.length
                        }
                        onClick={() =>
                          assignVolunteer(
                            application,
                            "standby"
                          )
                        }
                      >
                        Add Standby
                      </button>

                      <button
                        className="approve-plan-button"
                        disabled={
                          processingId ===
                            application.id ||
                          primaryLimit <=
                            primaryApplications.length
                        }
                        onClick={() =>
                          assignVolunteer(
                            application,
                            "primary"
                          )
                        }
                      >
                        Select Primary
                      </button>
                    </div>
                  ) : (
                    <div className="review-warning">
                      <span>
                        {application.selectionStatus ===
                        "primary"
                          ? "✓"
                          : application.selectionStatus ===
                            "standby"
                          ? "⏳"
                          : "×"}
                      </span>

                      <p>
                        This volunteer is currently
                        <strong>
                          {" "}
                          {
                            application.selectionStatus
                          }
                        </strong>
                        .
                      </p>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminVolunteerSelection;