import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "../firebase";
import BackButton from "../components/BackButton";

function ManageEvents() {
  const [events, setEvents] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState("");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents =
    async () => {
      try {
        setLoading(true);

        const snapshot =
          await getDocs(
            collection(
              db,
              "events"
            )
          );

        const data =
          snapshot.docs.map(
            (document) => ({
              id: document.id,
              ...document.data(),
            })
          );

        data.sort(
          (firstEvent, secondEvent) =>
            new Date(
              secondEvent.date || 0
            ) -
            new Date(
              firstEvent.date || 0
            )
        );

        setEvents(data);
      } catch (error) {
        console.error(
          "Failed to load events:",
          error
        );

        alert(
          "Unable to load events."
        );
      } finally {
        setLoading(false);
      }
    };

  const deleteEvent =
    async (id) => {
      const ok =
        window.confirm(
          "Delete this event permanently?"
        );

      if (!ok) {
        return;
      }

      try {
        setProcessingId(id);

        await deleteDoc(
          doc(
            db,
            "events",
            id
          )
        );

        alert(
          "Event deleted successfully."
        );

        await fetchEvents();
      } catch (error) {
        console.error(
          "Delete event error:",
          error
        );

        alert(
          "Failed to delete event."
        );
      } finally {
        setProcessingId("");
      }
    };

  const filteredEvents =
    search.trim() === ""
      ? events
      : events.filter(
          (event) => {
            const query =
              search
                .toLowerCase()
                .trim();

            return (
              event.title
                ?.toLowerCase()
                .includes(query) ||
              event.location
                ?.toLowerCase()
                .includes(query) ||
              event.organizerEmail
                ?.toLowerCase()
                .includes(query)
            );
          }
        );

  const activeEvents =
    events.filter(
      (event) =>
        event.status ===
        "active"
    ).length;

  const completedEvents =
    events.filter(
      (event) =>
        event.status ===
        "completed"
    ).length;

  const paidEvents =
    events.filter(
      (event) =>
        event.eventType ===
        "paid"
    ).length;

  const volunteerEvents =
    events.filter(
      (event) =>
        event.eventType !==
        "paid"
    ).length;

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">
            📅
          </div>

          <h2>
            Loading Events
          </h2>

          <p>
            Fetching platform events
            from Firestore.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">

      {/* ===============================
          HEADER
      =============================== */}

      <section className="page-card organizer-hero">

        <div>
          <BackButton />

          <p className="dashboard-eyebrow">
            Admin Panel
          </p>

          <h1 className="page-title">
            📅 Manage Events
          </h1>

          <p className="page-subtitle">
            Review, search and manage
            events created across the
            Evenciaga platform.
          </p>
        </div>

        <div className="organizer-status approved">
          {events.length} Events
        </div>

      </section>

      {/* ===============================
          STATISTICS
      =============================== */}

      <section className="dashboard-stats-grid">

        <div className="stat-card">
          <div className="stat-icon">
            📅
          </div>

          <div>
            <p>
              Total Events
            </p>

            <h2>
              {events.length}
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            🟢
          </div>

          <div>
            <p>
              Active
            </p>

            <h2>
              {activeEvents}
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            ✅
          </div>

          <div>
            <p>
              Completed
            </p>

            <h2>
              {completedEvents}
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            💰
          </div>

          <div>
            <p>
              Paid Events
            </p>

            <h2>
              {paidEvents}
            </h2>
          </div>
        </div>

      </section>

      {/* ===============================
          EVENT DIRECTORY
      =============================== */}

      <section className="page-card">

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom:
              "22px",
          }}
        >

          <div>
            <p className="dashboard-eyebrow">
              Event Directory
            </p>

            <h2
              className="page-title"
              style={{
                fontSize:
                  "24px",
                marginBottom:
                  "4px",
              }}
            >
              Platform Events
            </h2>

            <p className="page-subtitle">
              {
                filteredEvents.length
              }{" "}
              event
              {
                filteredEvents.length ===
                1
                  ? ""
                  : "s"
              }{" "}
              found
            </p>
          </div>

          <div
            style={{
              minWidth:
                "280px",
              flex:
                "0 1 380px",
            }}
          >
            <input
              type="text"
              placeholder="🔎 Search event, location or organizer..."
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              style={{
                width: "100%",
                padding:
                  "13px 15px",
                borderRadius:
                  "10px",
                border:
                  "1px solid #d1d5db",
                outline: "none",
                fontSize:
                  "14px",
                background:
                  "#ffffff",
              }}
            />
          </div>

        </div>

        {/* ===============================
            EMPTY STATE
        =============================== */}

        {filteredEvents.length ===
        0 ? (
          <div className="empty-state">

            <div className="empty-icon">
              🔎
            </div>

            <h2>
              No Events Found
            </h2>

            <p>
              Try searching using
              another event name,
              location or organizer.
            </p>

          </div>
        ) : (

          <div
            style={{
              display: "grid",
              gap: "18px",
            }}
          >

            {filteredEvents.map(
              (event) => {
                const isProcessing =
                  processingId ===
                  event.id;

                const isCompleted =
                  event.status ===
                  "completed";

                const isPaid =
                  event.eventType ===
                  "paid";

                return (
                  <article
                    key={event.id}
                    className="event-card"
                  >

                    {/* HEADER */}

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap:
                          "16px",
                        flexWrap:
                          "wrap",
                      }}
                    >

                      <div>
                        <p className="dashboard-eyebrow">
                          Event
                        </p>

                        <h2 className="event-title">
                          {event.title ||
                            "Untitled Event"}
                        </h2>

                        <p className="event-description">
                          {event.description ||
                            "No event description provided."}
                        </p>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: "8px",
                          flexWrap:
                            "wrap",
                        }}
                      >

                        <span
                          className={
                            isCompleted
                              ? "status-completed"
                              : "status-active"
                          }
                        >
                          {isCompleted
                            ? "✅ Completed"
                            : "🟢 Active"}
                        </span>

                        <span
                          className={
                            isPaid
                              ? "event-type-badge paid"
                              : "event-type-badge volunteer"
                          }
                        >
                          {isPaid
                            ? "💰 Paid Event"
                            : "🤝 Volunteer Event"}
                        </span>

                      </div>

                    </div>

                    {/* EVENT INFORMATION */}

                    <div
                      className="event-meta-grid"
                      style={{
                        marginTop:
                          "20px",
                      }}
                    >

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
                              "Not provided"}
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
                              "Not provided"}
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
                            {
                              event.requiredVolunteers ||
                              0
                            }
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
                            {
                              event.eventHours ||
                              0
                            }{" "}
                            hours
                          </strong>
                        </div>
                      </div>

                    </div>

                    {/* ORGANIZER */}

                    <div
                      style={{
                        marginTop:
                          "18px",
                        padding:
                          "14px",
                        background:
                          "#f8fafc",
                        borderRadius:
                          "10px",
                      }}
                    >

                      <small
                        style={{
                          color:
                            "#64748b",
                        }}
                      >
                        Organizer
                      </small>

                      <p
                        style={{
                          margin:
                            "5px 0 0",
                          fontWeight:
                            "700",
                          color:
                            "#1e293b",
                        }}
                      >
                        🏢{" "}
                        {
                          event.organizerEmail ||
                          "Organizer email unavailable"
                        }
                      </p>

                    </div>

                    {/* PAYMENT INFORMATION */}

                    {isPaid && (
                      <div
                        style={{
                          marginTop:
                            "14px",
                        }}
                      >
                        <span className="event-type-badge paid">
                          💵 ₹
                          {
                            event.paymentPerPerson ||
                            0
                          }{" "}
                          per volunteer
                        </span>
                      </div>
                    )}

                    {/* ACTIONS */}

                    <div
                      className="event-action-buttons"
                      style={{
                        marginTop:
                          "20px",
                      }}
                    >

                      <button
                        type="button"
                        className="delete-action-button"
                        disabled={
                          isProcessing
                        }
                        onClick={() =>
                          deleteEvent(
                            event.id
                          )
                        }
                      >
                        {isProcessing
                          ? "Deleting..."
                          : "🗑 Delete Event"}
                      </button>

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* OPTIONAL SUMMARY */}

      <section
        className="page-card"
        style={{
          marginTop:
            "18px",
        }}
      >

        <p className="dashboard-eyebrow">
          Platform Summary
        </p>

        <h2
          className="page-title"
          style={{
            fontSize:
              "22px",
          }}
        >
          Event Distribution
        </h2>

        <p className="page-subtitle">
          {volunteerEvents} volunteer
          event
          {volunteerEvents === 1
            ? ""
            : "s"}{" "}
          and {paidEvents} paid
          event
          {paidEvents === 1
            ? ""
            : "s"}{" "}
          are currently stored on
          the platform.
        </p>

      </section>

    </div>
  );
}

export default ManageEvents;