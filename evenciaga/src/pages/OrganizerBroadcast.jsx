// ==========================================================
// REACT IMPORTS
// ==========================================================

import {
  useEffect,
  useMemo,
  useState,
} from "react";


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
  doc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase";


// ==========================================================
// COMPONENT IMPORTS
// ==========================================================

import BackButton from "../components/BackButton";


// ==========================================================
// ORGANIZER BROADCAST COMPONENT
//
// Organizer can:
// - select one of their events;
// - target primary, standby, confirmed, declined,
//   callback-requested, or all selected volunteers;
// - preview recipient count;
// - send one notification to every matched volunteer;
// - optionally include an action button.
// ==========================================================

function OrganizerBroadcast() {
  // --------------------------------------------------------
  // AUTH STATE
  // --------------------------------------------------------

  const [currentUser, setCurrentUser] =
    useState(null);

  const [authReady, setAuthReady] =
    useState(false);


  // --------------------------------------------------------
  // PAGE STATE
  // --------------------------------------------------------

  const [events, setEvents] =
    useState([]);

  const [selectedEventId, setSelectedEventId] =
    useState("");

  const [selectedEventData, setSelectedEventData] =
    useState(null);

  const [volunteers, setVolunteers] =
    useState([]);

  const [recipientGroup, setRecipientGroup] =
    useState("all-selected");

  const [title, setTitle] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [includeAction, setIncludeAction] =
    useState(true);

  const [actionLabel, setActionLabel] =
    useState("View Application");

  const [actionRoute, setActionRoute] =
    useState("/my-applications");

  const [loadingEvents, setLoadingEvents] =
    useState(true);

  const [loadingRecipients, setLoadingRecipients] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");


  // ========================================================
  // AUTH LISTENER
  // ========================================================

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          setCurrentUser(
            user || null
          );

          setAuthReady(true);
        }
      );

    return unsubscribe;
  }, []);


  // ========================================================
  // LOAD ORGANIZER EVENTS
  // ========================================================

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const loadEvents =
      async () => {
        if (!currentUser) {
          setError(
            "You must be logged in as an organizer."
          );

          setLoadingEvents(false);

          return;
        }

        try {
          setLoadingEvents(true);
          setError("");

          const eventSnapshot =
            await getDocs(
              query(
                collection(
                  db,
                  "events"
                ),

                where(
                  "organizerId",
                  "==",
                  currentUser.uid
                )
              )
            );

          const eventData =
            eventSnapshot.docs
              .map(
                (eventDocument) => ({
                  id:
                    eventDocument.id,

                  ...eventDocument.data(),
                })
              )
              .sort(
                (
                  firstEvent,
                  secondEvent
                ) =>
                  new Date(
                    secondEvent.date ||
                    0
                  ) -
                  new Date(
                    firstEvent.date ||
                    0
                  )
              );

          setEvents(
            eventData
          );
        } catch (eventError) {
          console.error(
            "Broadcast event loading error:",
            eventError
          );

          setError(
            eventError?.message ||
              "Unable to load organizer events."
          );
        } finally {
          setLoadingEvents(false);
        }
      };

    loadEvents();
  }, [authReady, currentUser]);


  // ========================================================
  // LOAD SELECTED VOLUNTEERS FOR EVENT
  // ========================================================

  const loadRecipients =
    async (eventId) => {
      setSelectedEventId(
        eventId
      );

      setSelectedEventData(
        null
      );

      setVolunteers([]);
      setError("");
      setSuccessMessage("");

      if (!eventId) {
        setLoadingRecipients(
          false
        );

        return;
      }

      const eventData =
        events.find(
          (event) =>
            event.id === eventId
        ) || null;

      if (!eventData) {
        setError(
          "Selected event was not found."
        );

        return;
      }

      setSelectedEventData(
        eventData
      );

      try {
        setLoadingRecipients(
          true
        );

        const requestSnapshot =
          await getDocs(
            query(
              collection(
                db,
                "joinRequests"
              ),

              where(
                "eventId",
                "==",
                eventId
              )
            )
          );

        const selectedVolunteers =
          requestSnapshot.docs
            .map(
              (
                requestDocument
              ) => ({
                id:
                  requestDocument.id,

                ...requestDocument.data(),
              })
            )
            .filter(
              (request) => {
                const primary =
                  request.selectionType ===
                    "primary" ||
                  (
                    !request.selectionType &&
                    request.status ===
                      "approved"
                  );

                const standby =
                  request.selectionType ===
                    "standby" ||
                  request.status ===
                    "standby";

                return (
                  primary ||
                  standby
                );
              }
            )
            .filter(
              (request) =>
                Boolean(
                  request.volunteerId
                )
            );

        setVolunteers(
          selectedVolunteers
        );
      } catch (recipientError) {
        console.error(
          "Broadcast recipient loading error:",
          recipientError
        );

        setError(
          recipientError?.message ||
            "Unable to load event volunteers."
        );
      } finally {
        setLoadingRecipients(
          false
        );
      }
    };


  // ========================================================
  // VOLUNTEER CLASSIFICATION
  // ========================================================

  const getSelectionType = (
    volunteer
  ) => {
    if (
      volunteer.selectionType ===
        "primary" ||
      (
        !volunteer.selectionType &&
        volunteer.status ===
          "approved"
      )
    ) {
      return "primary";
    }

    return "standby";
  };


  // ========================================================
  // FILTER RECIPIENTS
  // ========================================================

  const recipients = useMemo(() => {
    if (
      recipientGroup ===
      "all-selected"
    ) {
      return volunteers;
    }

    if (
      recipientGroup ===
      "primary"
    ) {
      return volunteers.filter(
        (volunteer) =>
          getSelectionType(
            volunteer
          ) === "primary"
      );
    }

    if (
      recipientGroup ===
      "standby"
    ) {
      return volunteers.filter(
        (volunteer) =>
          getSelectionType(
            volunteer
          ) === "standby"
      );
    }

    return volunteers.filter(
      (volunteer) =>
        volunteer
          .confirmationStatus ===
        recipientGroup
    );
  }, [
    volunteers,
    recipientGroup,
  ]);


  // ========================================================
  // RECIPIENT COUNTS
  // ========================================================

  const recipientCounts =
    useMemo(() => {
      return {
        allSelected:
          volunteers.length,

        primary:
          volunteers.filter(
            (volunteer) =>
              getSelectionType(
                volunteer
              ) === "primary"
          ).length,

        standby:
          volunteers.filter(
            (volunteer) =>
              getSelectionType(
                volunteer
              ) === "standby"
          ).length,

        confirmed:
          volunteers.filter(
            (volunteer) =>
              volunteer
                .confirmationStatus ===
              "confirmed"
          ).length,

        declined:
          volunteers.filter(
            (volunteer) =>
              volunteer
                .confirmationStatus ===
              "declined"
          ).length,

        callbackRequested:
          volunteers.filter(
            (volunteer) =>
              volunteer
                .confirmationStatus ===
              "callback-requested"
          ).length,
      };
    }, [volunteers]);


  // ========================================================
  // VALIDATION
  // ========================================================

  const validateBroadcast = () => {
    if (!selectedEventId) {
      return "Please select an event.";
    }

    if (!title.trim()) {
      return "Please enter a notification title.";
    }

    if (!message.trim()) {
      return "Please enter a message.";
    }

    if (
      title.trim().length > 100
    ) {
      return "Title must be 100 characters or fewer.";
    }

    if (
      message.trim().length > 1000
    ) {
      return "Message must be 1000 characters or fewer.";
    }

    if (
      recipients.length === 0
    ) {
      return "No volunteers match the selected recipient group.";
    }

    if (
      includeAction &&
      !actionLabel.trim()
    ) {
      return "Please enter an action button label.";
    }

    if (
      includeAction &&
      !actionRoute.trim()
    ) {
      return "Please enter an action route.";
    }

    return "";
  };


  // ========================================================
  // SEND BROADCAST
  // ========================================================

  const sendBroadcast =
    async () => {
      const validationError =
        validateBroadcast();

      if (validationError) {
        setError(
          validationError
        );

        setSuccessMessage("");

        return;
      }

      const confirmed =
        window.confirm(
          `Send this message to ${recipients.length} volunteer(s)?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setSending(true);
        setError("");
        setSuccessMessage("");

        /*
         * Firestore write batches support a maximum of
         * 500 operations. We use 450 per batch to stay safe.
         */

        const batchSize = 450;

        for (
          let startIndex = 0;
          startIndex <
          recipients.length;
          startIndex += batchSize
        ) {
          const recipientChunk =
            recipients.slice(
              startIndex,
              startIndex +
                batchSize
            );

          const batch =
            writeBatch(db);

          recipientChunk.forEach(
            (volunteer) => {
              const notificationReference =
                doc(
                  collection(
                    db,
                    "notifications"
                  )
                );

              batch.set(
                notificationReference,
                {
                  volunteerId:
                    volunteer.volunteerId,

                  recipientId:
                    volunteer.volunteerId,

                  organizerId:
                    currentUser.uid,

                  eventId:
                    selectedEventId,

                  eventTitle:
                    selectedEventData
                      ?.title ||
                    volunteer.eventTitle ||
                    "",

                  title:
                    title.trim(),

                  message:
                    message.trim(),

                  type:
                    "organizer-broadcast",

                  category:
                    includeAction
                      ? "action"
                      : "information",

                  requiresAction:
                    includeAction,

                  actionRoute:
                    includeAction
                      ? actionRoute.trim()
                      : "",

                  actionLabel:
                    includeAction
                      ? actionLabel.trim()
                      : "",

                  recipientGroup,

                  isRead:
                    false,

                  createdAt:
                    serverTimestamp(),
                }
              );
            }
          );

          await batch.commit();
        }

        setSuccessMessage(
          `Message sent successfully to ${recipients.length} volunteer(s).`
        );

        setTitle("");
        setMessage("");
      } catch (sendError) {
        console.error(
          "Organizer broadcast error:",
          sendError
        );

        setError(
          sendError?.message ||
            "Unable to send the broadcast."
        );
      } finally {
        setSending(false);
      }
    };


  // ========================================================
  // LOADING SCREEN
  // ========================================================

  if (
    !authReady ||
    loadingEvents
  ) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">
            📢
          </div>

          <h2>
            Loading Broadcast Center
          </h2>

          <p>
            Loading organizer events.
          </p>
        </div>
      </div>
    );
  }


  // ========================================================
  // ERROR SCREEN FOR INITIAL LOAD
  // ========================================================

  if (
    error &&
    events.length === 0
  ) {
    return (
      <div className="page-container">
        <BackButton />

        <div className="page-card empty-state">
          <div className="empty-icon">
            ⚠️
          </div>

          <h2>
            Unable to Open Broadcast Center
          </h2>

          <p>{error}</p>
        </div>
      </div>
    );
  }


  // ========================================================
  // PAGE UI
  // ========================================================

  return (
    <div className="page-container">

      {/* ====================================================
          PAGE HEADER
      ==================================================== */}

      <section className="page-card organizer-hero">
        <BackButton />

        <div>
          <p className="dashboard-eyebrow">
            Organizer Workspace
          </p>

          <h1 className="page-title">
            Message Volunteers
          </h1>

          <p className="page-subtitle">
            Send one notification to selected volunteer groups
            without messaging each person separately.
          </p>
        </div>

        <div className="organizer-status approved">
          📢 Broadcast
        </div>
      </section>


      {/* ====================================================
          EVENT AND RECIPIENT SELECTION
      ==================================================== */}

      <section className="page-card">
        <div className="event-meta-grid">
          <div>
            <label className="input-label">
              Event
            </label>

            <select
              className="modern-select"
              value={
                selectedEventId
              }
              onChange={(event) =>
                loadRecipients(
                  event.target.value
                )
              }
              disabled={
                loadingRecipients ||
                sending
              }
            >
              <option value="">
                Choose an Event
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
            <label className="input-label">
              Recipient Group
            </label>

            <select
              className="modern-select"
              value={
                recipientGroup
              }
              onChange={(event) =>
                setRecipientGroup(
                  event.target.value
                )
              }
              disabled={
                loadingRecipients ||
                sending
              }
            >
              <option value="all-selected">
                All Selected ({recipientCounts.allSelected})
              </option>

              <option value="primary">
                Primary ({recipientCounts.primary})
              </option>

              <option value="standby">
                Standby ({recipientCounts.standby})
              </option>

              <option value="confirmed">
                Confirmed ({recipientCounts.confirmed})
              </option>

              <option value="declined">
                Declined ({recipientCounts.declined})
              </option>

              <option value="callback-requested">
                Callback Requested ({recipientCounts.callbackRequested})
              </option>
            </select>
          </div>
        </div>
      </section>


      {/* ====================================================
          RECIPIENT SUMMARY
      ==================================================== */}

      {selectedEventId && (
        <section className="dashboard-stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              👥
            </div>

            <div>
              <p>
                Matching Recipients
              </p>

              <h2>
                {recipients.length}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              ✅
            </div>

            <div>
              <p>
                Primary
              </p>

              <h2>
                {
                  recipientCounts
                    .primary
                }
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              🧍
            </div>

            <div>
              <p>
                Standby
              </p>

              <h2>
                {
                  recipientCounts
                    .standby
                }
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              📌
            </div>

            <div>
              <p>
                Confirmed
              </p>

              <h2>
                {
                  recipientCounts
                    .confirmed
                }
              </h2>
            </div>
          </div>
        </section>
      )}


      {/* ====================================================
          LOADING RECIPIENTS
      ==================================================== */}

      {loadingRecipients && (
        <div className="page-card empty-state">
          <div className="empty-icon">
            ⏳
          </div>

          <h2>
            Loading Volunteers
          </h2>
        </div>
      )}


      {/* ====================================================
          MESSAGE FORM
      ==================================================== */}

      {!loadingRecipients &&
        selectedEventId && (
          <section className="page-card form-card">
            <label className="input-label">
              Notification Title
            </label>

            <input
              type="text"
              className="modern-input"
              placeholder="Example: Event reporting time updated"
              maxLength="100"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              disabled={sending}
            />

            <p className="page-subtitle">
              {title.length}/100
            </p>


            <label className="input-label">
              Message
            </label>

            <textarea
              className="modern-textarea"
              rows="6"
              placeholder="Write the update volunteers need to receive..."
              maxLength="1000"
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              disabled={sending}
            />

            <p className="page-subtitle">
              {message.length}/1000
            </p>


            <label
              className="input-label"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <input
                type="checkbox"
                checked={
                  includeAction
                }
                onChange={(event) =>
                  setIncludeAction(
                    event.target.checked
                  )
                }
                disabled={sending}
              />

              Include action button
            </label>


            {includeAction && (
              <div className="event-meta-grid">
                <div>
                  <label className="input-label">
                    Action Label
                  </label>

                  <input
                    type="text"
                    className="modern-input"
                    value={
                      actionLabel
                    }
                    onChange={(event) =>
                      setActionLabel(
                        event.target.value
                      )
                    }
                    disabled={sending}
                  />
                </div>

                <div>
                  <label className="input-label">
                    Action Route
                  </label>

                  <select
                    className="modern-select"
                    value={
                      actionRoute
                    }
                    onChange={(event) =>
                      setActionRoute(
                        event.target.value
                      )
                    }
                    disabled={sending}
                  >
                    <option value="/my-applications">
                      My Applications
                    </option>

                    <option value="/notifications">
                      Volunteer Notifications
                    </option>

                    <option value="/dashboard">
                      Volunteer Dashboard
                    </option>

                    <option value="/certificates">
                      Certificates
                    </option>

                    <option value="/payment-history">
                      Payment History
                    </option>
                  </select>
                </div>
              </div>
            )}


            {error && (
              <div className="form-message error">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="form-message">
                {successMessage}
              </div>
            )}


            <button
              type="button"
              className="primary-button"
              onClick={
                sendBroadcast
              }
              disabled={
                sending ||
                recipients.length === 0
              }
            >
              {sending
                ? "Sending Messages..."
                : `📢 Send to ${recipients.length} Volunteer(s)`}
            </button>
          </section>
        )}


      {/* ====================================================
          EMPTY EVENT STATE
      ==================================================== */}

      {!selectedEventId && (
        <div className="page-card empty-state">
          <div className="empty-icon">
            📅
          </div>

          <h2>
            Select an Event
          </h2>

          <p>
            Choose an event before creating a volunteer broadcast.
          </p>
        </div>
      )}


      {/* ====================================================
          NO RECIPIENTS
      ==================================================== */}

      {!loadingRecipients &&
        selectedEventId &&
        recipients.length === 0 && (
          <div className="page-card empty-state">
            <div className="empty-icon">
              👥
            </div>

            <h2>
              No Matching Volunteers
            </h2>

            <p>
              This recipient group currently contains no volunteers.
            </p>
          </div>
        )}
    </div>
  );
}

export default OrganizerBroadcast;