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
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

function MyEvents() {

  const navigate = useNavigate();

  const [events, setEvents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    fetchEvents();

  }, []);

  const fetchEvents =
    async () => {

      try {

        const q =
          query(
            collection(
              db,
              "events"
            ),
            where(
              "organizerId",
              "==",
              auth.currentUser.uid
            )
          );

        const querySnapshot =
          await getDocs(q);

        const data =
          querySnapshot.docs.map(
            (doc) => ({
              id: doc.id,
              ...doc.data()
            })
          );

        setEvents(data);

      } catch (error) {

        console.log(error);

      } finally {

        setLoading(false);

      }

    };

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

  try {

    // Close Event

    await updateDoc(
      doc(db, "events", event.id),
      {
        status: "completed"
      }
    );

    // Approved Volunteers

    const approvedQuery = query(
      collection(db, "joinRequests"),
      where("eventId", "==", event.id),
      where("status", "==", "approved")
    );

    const approvedSnapshot =
      await getDocs(approvedQuery);

    let certificateCount = 0;

    for (const volunteerDoc of approvedSnapshot.docs) {

      const volunteer =
        volunteerDoc.data();

      // Attendance Check

      const attendanceQuery =
        query(
          collection(db, "attendance"),
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
        console.log("Event ID:", event.id);

console.log(
  "Attendance Found:",
  attendanceSnapshot.size
);

      // Skip if absent

      if (
        attendanceSnapshot.empty
      ) {

        continue;

      }

      // Create Certificate
      const existingCertificate =
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
    existingCertificate
  );

if (
  !existingSnapshot.empty
) {

  continue;

}
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
              "issued"
          }
        );

      // CONTINUE IN PART 2
            await updateDoc(
        volunteerDoc.ref,
        {
          certificateIssued: true,
          certificateId:
            certificateRef.id
        }
      );
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
      serverTimestamp()
  }
);

      certificateCount++;

    }

    // Update Event

    await updateDoc(
      doc(
        db,
        "events",
        event.id
      ),
      {
        certificatesGenerated: true
      }
    );

    alert(
      `${certificateCount} certificate(s) generated successfully.`
    );

    fetchEvents();

    // CONTINUE IN PART 3
      } catch (error) {

    console.log(error);

    alert(
      "Failed to close event."
    );

  }

};

  const deleteEvent =
    async (eventId) => {

      const confirmDelete =
        window.confirm(
          "Delete this event?"
        );

      if (!confirmDelete)
        return;

      try {

        await deleteDoc(
          doc(
            db,
            "events",
            eventId
          )
        );

        alert(
          "Event Deleted"
        );

        fetchEvents();

      } catch (error) {

        console.log(error);

      }

    };

  if (loading) {

    return (
      <h2>
        Loading Events...
      </h2>
    );

  }

  return (

    <div className="page-container">

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
      Create, edit, manage and close all your events from one place.
    </p>

  </div>

  <div className="organizer-status approved">

    📅 {events.length} Events

  </div>

</div>

      {
        events.length === 0 ? (

        <div className="page-card empty-state">

  <div className="empty-icon">

    📅

  </div>

  <h2>

    No Events Yet

  </h2>

  <p>

    Create your first event to start managing volunteers.

  </p>

  <button
    className="primary-button"
    onClick={() =>
      navigate("/create-event")
    }
  >

    ➕ Create Event

  </button>

</div>

        ) : (

          events.map(
            (event) => (

            <div
  key={event.id}
  className="event-card"
>

                <div className="event-card-header">

  <div>

    <h2 className="event-title">
      {event.title}
    </h2>

    <p className="event-description">
      Manage this event, volunteers and completion status.
    </p>

  </div>

  {
    event.status === "completed" ? (

      <span className="status-completed">
        Completed
      </span>

    ) : (

      <span className="status-active">
        Active
      </span>

    )
  }

</div>

<div className="event-meta-grid">

  <div className="event-meta-item">

    <span className="event-meta-icon">
      📍
    </span>

    <div>
      <small>Location</small>
      <strong>{event.location}</strong>
    </div>

  </div>

  <div className="event-meta-item">

    <span className="event-meta-icon">
      📅
    </span>

    <div>
      <small>Event Date</small>
      <strong>{event.date}</strong>
    </div>

  </div>

  <div className="event-meta-item">

    <span className="event-meta-icon">
      ⏰
    </span>

    <div>
      <small>Duration</small>
      <strong>{event.eventHours || 0} hours</strong>
    </div>

  </div>

  <div className="event-meta-item">

    <span className="event-meta-icon">
      👥
    </span>

    <div>
      <small>Required Volunteers</small>
      <strong>{event.requiredVolunteers || 0}</strong>
    </div>

  </div>

</div>

<div className="event-benefits-row">

  {
    event.eventType === "paid" ? (

      <span className="event-type-badge paid">
        💰 Paid Event · ₹{event.paymentPerPerson || 0}
      </span>

    ) : (

      <span className="event-type-badge volunteer">
        🤝 Volunteer Event
      </span>

    )
  }

  {
    event.certificatesGenerated && (

      <span className="event-type-badge certificate">
        🏆 Certificates Generated
      </span>

    )
  }

</div>

               <div className="event-action-buttons">
<button
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
  {
    event.status === "completed"
      ? "🔒 Can't Edit"
      : "✏️ Edit Event"
  }
</button>

               <button
  className="primary-action-button"
  onClick={() =>
    closeEvent(event)
  }
  disabled={
    event.status ===
    "completed"
  }
>
  {
    event.status === "completed"
      ? "🔒 Event Closed"
      : "✅ Close Event"
  }
</button>

                  <button
  className="delete-action-button"
  onClick={() =>
    deleteEvent(event.id)
  }
>
  🗑 Delete Event
</button>
                </div>

              </div>

            )

          )

        )

      }

    </div>

  );

}

export default MyEvents;