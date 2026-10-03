import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

function MyEvents() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [staffingRequests, setStaffingRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [staffingLoading, setStaffingLoading] = useState(true);

  const [requestingStaffing, setRequestingStaffing] =
    useState(null);

  useEffect(() => {
    fetchEvents();
    fetchStaffingRequests();
  }, []);

  // ---------------------------------------------------------
  // LOAD ORGANIZER EVENTS
  // ---------------------------------------------------------

  const fetchEvents = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        setEvents([]);
        return;
      }

      const q = query(
        collection(db, "events"),
        where("organizerId", "==", user.uid)
      );

      const querySnapshot = await getDocs(q);

      const data = querySnapshot.docs.map((eventDoc) => ({
        id: eventDoc.id,
        ...eventDoc.data(),
      }));

      setEvents(data);
    } catch (error) {
      console.error("Load events:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // LOAD STAFFING REQUESTS
  // ---------------------------------------------------------

  const fetchStaffingRequests = async () => {
    try {
      setStaffingLoading(true);

      const user = auth.currentUser;

      if (!user) {
        setStaffingRequests([]);
        return;
      }

      const q = query(
        collection(db, "staffingRequests"),
        where("organizerId", "==", user.uid)
      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((requestDoc) => ({
        id: requestDoc.id,
        ...requestDoc.data(),
      }));

      setStaffingRequests(data);
    } catch (error) {
      console.error(
        "Load staffing requests:",
        error
      );
    } finally {
      setStaffingLoading(false);
    }
  };

  // ---------------------------------------------------------
  // FIND STAFFING REQUEST FOR EVENT
  // ---------------------------------------------------------

  const getStaffingRequest = (eventId) => {
    return staffingRequests.find(
      (request) =>
        request.eventId === eventId
    );
  };

  // ---------------------------------------------------------
  // STAFFING STATUS
  // ---------------------------------------------------------

  const getStaffingStatus = (event) => {
    const request = getStaffingRequest(event.id);

    /*
      If the event already has an approved staffing
      status, use the event status.
    */

    if (
      event.staffingStatus === "approved"
    ) {
      return {
        key: "approved",
        label: "Staffing Approved",
        icon: "✅",
      };
    }

    if (
      event.staffingStatus ===
      "organizer_review"
    ) {
      return {
        key: "organizer_review",
        label: "Organizer Review",
        icon: "👀",
      };
    }

    if (
      event.staffingStatus ===
      "changes_requested"
    ) {
      return {
        key: "changes_requested",
        label: "Changes Requested",
        icon: "⚠️",
      };
    }

    if (!request) {
      return {
        key: "not_requested",
        label: "Not Requested",
        icon: "○",
      };
    }

    switch (request.status) {
      case "pending":
        return {
          key: "pending",
          label: "Pending Admin",
          icon: "⏳",
        };

      case "organizer_review":
        return {
          key: "organizer_review",
          label: "Organizer Review",
          icon: "👀",
        };

      case "approved":
        return {
          key: "approved",
          label: "Staffing Approved",
          icon: "✅",
        };

      case "changes_requested":
        return {
          key: "changes_requested",
          label: "Changes Requested",
          icon: "⚠️",
        };

      default:
        return {
          key: request.status || "pending",
          label: request.status || "Pending",
          icon: "⏳",
        };
    }
  };

  // ---------------------------------------------------------
  // REQUEST STAFFING
  // ---------------------------------------------------------

  const requestStaffing = async (event) => {
    const user = auth.currentUser;

    if (!user) {
      alert(
        "You must be logged in to request staffing."
      );
      return;
    }

    if (event.status === "completed") {
      alert(
        "Completed events cannot request staffing."
      );
      return;
    }

    const existingRequest =
      getStaffingRequest(event.id);

    /*
      Do not create duplicate requests.
    */

    if (
      existingRequest &&
      [
        "pending",
        "organizer_review",
        "approved",
      ].includes(
        existingRequest.status
      )
    ) {
      alert(
        "A staffing request already exists for this event."
      );
      return;
    }

    const confirmed = window.confirm(
      `Request Evenciaga staffing assistance for "${event.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setRequestingStaffing(event.id);

      /*
        Build the staffing request from the existing
        event information.
      */

      const staffingRequest = {
        eventId: event.id,

        eventTitle:
          event.title || "Untitled Event",

        eventDate:
          event.date || "",

        eventLocation:
          event.location || "",

        eventCategory:
          event.category ||
          event.eventCategory ||
          event.eventType ||
          "General",

        eventHours:
          Number(event.eventHours || 0),

        expectedCrowd:
          Number(
            event.expectedCrowd ||
              event.expectedParticipants ||
              event.expectedVolunteers ||
              0
          ),

        organizerId:
          user.uid,

        organizerEmail:
          user.email || "",

        organizerName:
          event.organizerName ||
          user.displayName ||
          "",

        notes:
          event.staffingNotes ||
          event.notes ||
          "",

        status:
          "pending",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),

        proposedRoles: [],

        proposedStandby: 0,

        totalVolunteers: 0,
      };

      /*
        Create staffing request.
      */

      await addDoc(
        collection(
          db,
          "staffingRequests"
        ),
        staffingRequest
      );

      /*
        Update event so the organizer/admin can
        see that staffing has been requested.
      */

      await updateDoc(
        doc(
          db,
          "events",
          event.id
        ),
        {
          staffingStatus:
            "pending",

          staffingRequestedAt:
            serverTimestamp(),
        }
      );

      /*
        Notify administration.
      */

      await addDoc(
        collection(
          db,
          "adminNotifications"
        ),
        {
          type:
            "staffing_request",

          title:
            "New Staffing Request",

          message:
            `${event.title} needs Evenciaga staffing assistance.`,

          eventId:
            event.id,

          organizerId:
            user.uid,

          organizerEmail:
            user.email || "",

          isRead:
            false,

          createdAt:
            serverTimestamp(),
        }
      );

      alert(
        "Staffing request submitted successfully. Evenciaga Administration will prepare the staffing plan."
      );

      await Promise.all([
        fetchEvents(),
        fetchStaffingRequests(),
      ]);
    } catch (error) {
      console.error(
        "Request staffing:",
        error
      );

      alert(
        "Failed to submit staffing request."
      );
    } finally {
      setRequestingStaffing(null);
    }
  };

  // ---------------------------------------------------------
  // CLOSE EVENT + CERTIFICATES
  // ---------------------------------------------------------

  const closeEvent = async (event) => {
    if (
      event.status ===
      "completed"
    ) {
      alert(
        "This event has already been closed."
      );

      return;
    }

    const confirmed = window.confirm(
      `Close "${event.title}"? This will mark the event as completed and generate certificates for eligible attendees.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await updateDoc(
        doc(
          db,
          "events",
          event.id
        ),
        {
          status: "completed",
        }
      );

      const approvedQuery =
        query(
          collection(
            db,
            "joinRequests"
          ),
          where(
            "eventId",
            "==",
            event.id
          ),
          where(
            "status",
            "==",
            "approved"
          )
        );

      const approvedSnapshot =
        await getDocs(
          approvedQuery
        );

      let certificateCount = 0;

      for (
        const volunteerDoc of
        approvedSnapshot.docs
      ) {
        const volunteer =
          volunteerDoc.data();

        const attendanceQuery =
          query(
            collection(
              db,
              "attendance"
            ),
            where(
              "eventId",
              "==",
              event.id
            ),
            where(
              "volunteerId",
              "==",
              volunteer.volunteerId
            ),
            where(
              "status",
              "==",
              "present"
            )
          );

        const attendanceSnapshot =
          await getDocs(
            attendanceQuery
          );

        console.log(
          "Event ID:",
          event.id
        );

        console.log(
          "Attendance Found:",
          attendanceSnapshot.size
        );

        /*
          No attendance = no certificate.
        */

        if (
          attendanceSnapshot.empty
        ) {
          continue;
        }

        /*
          Check whether certificate already exists.
        */

        const existingCertificateQuery =
          query(
            collection(
              db,
              "certificates"
            ),
            where(
              "volunteerId",
              "==",
              volunteer.volunteerId
            ),
            where(
              "eventId",
              "==",
              event.id
            )
          );

        const existingSnapshot =
          await getDocs(
            existingCertificateQuery
          );

        if (
          !existingSnapshot.empty
        ) {
          continue;
        }

        /*
          Create certificate.
        */

        const certificateRef =
          await addDoc(
            collection(
              db,
              "certificates"
            ),
            {
              certificateNumber:
                `EV-${Date.now()}-${Math.floor(
                  Math.random() * 1000
                )}`,

              volunteerId:
                volunteer.volunteerId,

              volunteerName:
                volunteer.volunteerName,

              organizerId:
                auth.currentUser.uid,

              eventId:
                event.id,

              eventTitle:
                event.title,

              eventDate:
                event.date,

              location:
                event.location,

              hours:
                event.eventHours,

              issuedDate:
                serverTimestamp(),

              status:
                "issued",
            }
          );

        /*
          Mark join request as having certificate.
        */

        await updateDoc(
          volunteerDoc.ref,
          {
            certificateIssued:
              true,

            certificateId:
              certificateRef.id,
          }
        );

        /*
          Notify volunteer.
        */

        await addDoc(
          collection(
            db,
            "notifications"
          ),
          {
            volunteerId:
              volunteer.volunteerId,

            eventId:
              event.id,

            title:
              "Certificate Ready",

            message:
              `Your certificate for "${event.title}" is now available.`,

            type:
              "certificate",

            isRead:
              false,

            createdAt:
              serverTimestamp(),
          }
        );

        certificateCount++;
      }

      await updateDoc(
        doc(
          db,
          "events",
          event.id
        ),
        {
          certificatesGenerated:
            true,
        }
      );

      alert(
        `${certificateCount} certificate(s) generated successfully.`
      );

      await fetchEvents();
    } catch (error) {
      console.error(
        "Close event:",
        error
      );

      alert(
        "Failed to close event."
      );
    }
  };

  // ---------------------------------------------------------
  // DELETE EVENT
  // ---------------------------------------------------------

  const deleteEvent =
    async (event) => {
      const confirmDelete =
        window.confirm(
          `Delete "${event.title}"? This action cannot be undone.`
        );

      if (!confirmDelete) {
        return;
      }

      try {
        /*
          Delete event itself.
        */

        await deleteDoc(
          doc(
            db,
            "events",
            event.id
          )
        );

        /*
          Delete associated staffing request(s).
          This keeps staffingRequests from becoming
          orphaned.
        */

        const staffingQuery =
          query(
            collection(
              db,
              "staffingRequests"
            ),
            where(
              "eventId",
              "==",
              event.id
            )
          );

        const staffingSnapshot =
          await getDocs(
            staffingQuery
          );

        for (
          const requestDoc of
          staffingSnapshot.docs
        ) {
          await deleteDoc(
            doc(
              db,
              "staffingRequests",
              requestDoc.id
            )
          );
        }

        alert(
          "Event deleted successfully."
        );

        await Promise.all([
          fetchEvents(),
          fetchStaffingRequests(),
        ]);
      } catch (error) {
        console.error(
          "Delete event:",
          error
        );

        alert(
          "Failed to delete event."
        );
      }
    };

  // ---------------------------------------------------------
  // STAFFING BUTTON
  // ---------------------------------------------------------

  const renderStaffingAction =
    (event) => {
      const staffing =
        getStaffingStatus(event);

      const request =
        getStaffingRequest(
          event.id
        );

      /*
        Approved
      */

      if (
        staffing.key ===
        "approved"
      ) {
        return (
          <button
            type="button"
            className="secondary-action-button"
            onClick={() =>
              navigate(
                "/organizer/staffing-plans"
              )
            }
          >
            ✅ Staffing Approved
          </button>
        );
      }

      /*
        Organizer review
      */

      if (
        staffing.key ===
        "organizer_review"
      ) {
        return (
          <button
            type="button"
            className="primary-action-button"
            onClick={() =>
              navigate(
                "/organizer/staffing-plans"
              )
            }
          >
            👀 Review Staffing Plan
          </button>
        );
      }

      /*
        Changes requested
      */

      if (
        staffing.key ===
        "changes_requested"
      ) {
        return (
          <button
            type="button"
            className="primary-action-button"
            onClick={() =>
              navigate(
                "/organizer/staffing-plans"
              )
            }
          >
            ⚠️ Review Changes
          </button>
        );
      }

      /*
        Pending admin
      */

      if (
        staffing.key ===
        "pending"
      ) {
        return (
          <button
            type="button"
            className="secondary-action-button"
            disabled
          >
            ⏳ Awaiting Admin
          </button>
        );
      }

      /*
        No request yet.
      */

      return (
        <button
          type="button"
          className="primary-action-button"
          disabled={
            requestingStaffing ===
            event.id
          }
          onClick={() =>
            requestStaffing(event)
          }
        >
          {requestingStaffing ===
          event.id
            ? "Submitting..."
            : "🧑‍💼 Request Staffing"}
        </button>
      );
    };

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">
            📅
          </div>

          <h2>
            Loading Events...
          </h2>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // PAGE
  // ---------------------------------------------------------

  return (
    <div className="page-container">

      {/* -------------------------------------------------- */}
      {/* HEADER */}
      {/* -------------------------------------------------- */}

      <div className="page-card organizer-hero">

        <BackButton />

        <div>
          <p className="dashboard-eyebrow">
            Organizer Panel
          </p>

          <h1 className="page-title">
            My Events
          </h1>

          <p className="page-subtitle">
            Create, edit, manage and close all
            your events from one place.
          </p>
        </div>

        <div className="organizer-status approved">
          📅 {events.length} Events
        </div>

      </div>

      {/* -------------------------------------------------- */}
      {/* EMPTY STATE */}
      {/* -------------------------------------------------- */}

      {events.length === 0 ? (

        <div className="page-card empty-state">

          <div className="empty-icon">
            📅
          </div>

          <h2>
            No Events Yet
          </h2>

          <p>
            Create your first event to start
            managing volunteers.
          </p>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate(
                "/create-event"
              )
            }
          >
            ➕ Create Event
          </button>

        </div>

      ) : (

        /* -------------------------------------------------- */
        /* EVENTS */
        /* -------------------------------------------------- */

        events.map((event) => {

          const staffing =
            getStaffingStatus(
              event
            );

          const staffingRequest =
            getStaffingRequest(
              event.id
            );

          return (

            <div
              key={event.id}
              className="event-card"
            >

              {/* ------------------------------------------ */}
              {/* EVENT HEADER */}
              {/* ------------------------------------------ */}

              <div className="event-card-header">

                <div>

                  <h2 className="event-title">
                    {event.title}
                  </h2>

                  <p className="event-description">
                    Manage this event,
                    volunteers and
                    completion status.
                  </p>

                </div>

                {event.status ===
                "completed" ? (

                  <span className="status-completed">
                    Completed
                  </span>

                ) : (

                  <span className="status-active">
                    Active
                  </span>

                )}

              </div>

              {/* ------------------------------------------ */}
              {/* EVENT INFORMATION */}
              {/* ------------------------------------------ */}

              <div className="event-meta-grid">

                <div className="event-meta-item">

                  <span className="event-meta-icon">
                    📍
                  </span>

                  <div>
                    <small>
                      Location
                    </small>

                    <strong>
                      {event.location ||
                        "Not specified"}
                    </strong>
                  </div>

                </div>

                <div className="event-meta-item">

                  <span className="event-meta-icon">
                    📅
                  </span>

                  <div>
                    <small>
                      Event Date
                    </small>

                    <strong>
                      {event.date ||
                        "Not specified"}
                    </strong>
                  </div>

                </div>

                <div className="event-meta-item">

                  <span className="event-meta-icon">
                    ⏰
                  </span>

                  <div>
                    <small>
                      Duration
                    </small>

                    <strong>
                      {event.eventHours ||
                        0}{" "}
                      hours
                    </strong>
                  </div>

                </div>

                <div className="event-meta-item">

                  <span className="event-meta-icon">
                    👥
                  </span>

                  <div>
                    <small>
                      Required Volunteers
                    </small>

                    <strong>
                      {event.requiredVolunteers ||
                        0}
                    </strong>
                  </div>

                </div>

              </div>

              {/* ------------------------------------------ */}
              {/* EVENT TYPE */}
              {/* ------------------------------------------ */}

              <div className="event-benefits-row">

                {event.eventType ===
                "paid" ? (

                  <span className="event-type-badge paid">
                    💰 Paid Event · ₹
                    {event.paymentPerPerson ||
                      0}
                  </span>

                ) : (

                  <span className="event-type-badge volunteer">
                    🤝 Volunteer Event
                  </span>

                )}

                {event.certificatesGenerated && (
                  <span className="event-type-badge certificate">
                    🏆 Certificates Generated
                  </span>
                )}

              </div>

              {/* ------------------------------------------ */}
              {/* STAFFING STATUS */}
              {/* ------------------------------------------ */}

              <div
                className={`staffing-status-card staffing-${staffing.key}`}
              >

                <div className="staffing-status-icon">
                  {staffing.icon}
                </div>

                <div className="staffing-status-content">

                  <span>
                    Evenciaga Staffing
                  </span>

                  <strong>
                    {staffing.label}
                  </strong>

                  {staffingRequest?.status ===
                    "pending" && (
                    <p>
                      Your request is
                      waiting for the
                      administration team
                      to prepare a staffing
                      plan.
                    </p>
                  )}

                  {staffingRequest?.status ===
                    "organizer_review" && (
                    <p>
                      A staffing plan has
                      been prepared. Review
                      it before publishing
                      the event.
                    </p>
                  )}

                  {staffingRequest?.status ===
                    "changes_requested" && (
                    <p>
                      The staffing plan
                      needs changes. Open
                      the staffing review
                      page for details.
                    </p>
                  )}

                  {staffingRequest?.status ===
                    "approved" && (
                    <p>
                      The staffing plan has
                      been approved and the
                      volunteer positions
                      are now configured.
                    </p>
                  )}

                  {!staffingRequest &&
                    staffing.key ===
                      "not_requested" && (
                    <p>
                      Need help finding
                      volunteers? Request
                      staffing assistance
                      from Evenciaga.
                    </p>
                  )}

                </div>

                <div className="staffing-status-action">
                  {renderStaffingAction(
                    event
                  )}
                </div>

              </div>

              {/* ------------------------------------------ */}
              {/* EVENT ACTIONS */}
              {/* ------------------------------------------ */}

              <div className="event-action-buttons">

                <button
                  type="button"
                  className="secondary-action-button"
                  onClick={() =>
                    navigate(
                      `/edit-event/${event.id}`
                    )
                  }
                  disabled={
                    event.status ===
                    "completed"
                  }
                >
                  {event.status ===
                  "completed"
                    ? "🔒 Can't Edit"
                    : "✏️ Edit Event"}
                </button>

                <button
                  type="button"
                  className="primary-action-button"
                  onClick={() =>
                    closeEvent(
                      event
                    )
                  }
                  disabled={
                    event.status ===
                    "completed"
                  }
                >
                  {event.status ===
                  "completed"
                    ? "🔒 Event Closed"
                    : "✅ Close Event"}
                </button>

                <button
                  type="button"
                  className="delete-action-button"
                  onClick={() =>
                    deleteEvent(
                      event
                    )
                  }
                >
                  🗑 Delete Event
                </button>

              </div>

            </div>

          );
        })
      )}

    </div>
  );
}

export default MyEvents;