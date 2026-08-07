// ==========================================================
// REACT IMPORTS
// ==========================================================

import { useEffect, useMemo, useState } from "react";


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import { onAuthStateChanged } from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";


// ==========================================================
// COMPONENT IMPORTS
// ==========================================================

import BackButton from "../components/BackButton";


// ==========================================================
// RATINGS COMPONENT
//
// Only volunteers with completed attendance can be rated.
// No-show, excused absence, checked-in, and incomplete records
// are not eligible.
// ==========================================================

function Ratings() {
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

  const [selectedEvent, setSelectedEvent] =
    useState("");

  const [selectedEventData, setSelectedEventData] =
    useState(null);

  const [volunteers, setVolunteers] =
    useState([]);

  const [loadingEvents, setLoadingEvents] =
    useState(true);

  const [loadingVolunteers, setLoadingVolunteers] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");


  // ========================================================
  // WAIT FOR FIREBASE AUTH
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
  // LOAD LOGGED-IN ORGANIZER EVENTS
  // ========================================================

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const fetchEvents = async () => {
      if (!currentUser) {
        setError(
          "You must be logged in as an organizer."
        );

        setEvents([]);
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
                  secondEvent.date || 0
                ) -
                new Date(
                  firstEvent.date || 0
                )
            );

        setEvents(eventData);
      } catch (eventError) {
        console.error(
          "Ratings event loading error:",
          eventError
        );

        setError(
          eventError?.message ||
            "Failed to load organizer events."
        );
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [authReady, currentUser]);


  // ========================================================
  // LOAD COMPLETED ATTENDANCE VOLUNTEERS
  // ========================================================

  const loadVolunteers = async (
    eventId
  ) => {
    setSelectedEvent(eventId);
    setSelectedEventData(null);
    setVolunteers([]);
    setError("");

    if (!eventId) {
      return;
    }

    try {
      setLoadingVolunteers(true);

      const eventData =
        events.find(
          (event) =>
            event.id === eventId
        ) || null;

      setSelectedEventData(
        eventData
      );

      // ----------------------------------------------------
      // LOAD COMPLETED ATTENDANCE RECORDS
      // ----------------------------------------------------

      const attendanceSnapshot =
        await getDocs(
          query(
            collection(
              db,
              "attendance"
            ),

            where(
              "eventId",
              "==",
              eventId
            )
          )
        );

      const completedAttendance =
        attendanceSnapshot.docs
          .map(
            (
              attendanceDocument
            ) => ({
              attendanceId:
                attendanceDocument.id,

              ...attendanceDocument.data(),
            })
          )
          .filter(
            (attendance) =>
              attendance.attendanceStatus ===
                "completed" ||
              attendance.status ===
                "completed"
          );

      // ----------------------------------------------------
      // LOAD EXISTING RATINGS
      // ----------------------------------------------------

      const ratingsSnapshot =
        await getDocs(
          query(
            collection(
              db,
              "ratings"
            ),

            where(
              "eventId",
              "==",
              eventId
            )
          )
        );

      const ratingByVolunteerId = {};

      ratingsSnapshot.docs.forEach(
        (ratingDocument) => {
          const ratingData =
            ratingDocument.data();

          ratingByVolunteerId[
            ratingData.volunteerId
          ] = {
            id:
              ratingDocument.id,

            ...ratingData,
          };
        }
      );

      const eligibleVolunteers =
        completedAttendance.map(
          (attendance) => {
            const existingRating =
              ratingByVolunteerId[
                attendance.volunteerId
              ];

            return {
              ...attendance,

              ratingDocumentId:
                existingRating?.id ||
                "",

              rating:
                Number(
                  existingRating?.rating ||
                    5
                ),

              feedback:
                existingRating?.feedback ||
                "",

              alreadyRated:
                Boolean(
                  existingRating
                ),
            };
          }
        );

      setVolunteers(
        eligibleVolunteers
      );
    } catch (volunteerError) {
      console.error(
        "Ratings volunteer loading error:",
        volunteerError
      );

      setError(
        volunteerError?.message ||
          "Failed to load completed volunteers."
      );
    } finally {
      setLoadingVolunteers(false);
    }
  };


  // ========================================================
  // UPDATE LOCAL RATING
  // ========================================================

  const changeRating = (
    volunteerId,
    value
  ) => {
    setVolunteers(
      (currentVolunteers) =>
        currentVolunteers.map(
          (volunteer) =>
            volunteer.volunteerId ===
            volunteerId
              ? {
                  ...volunteer,

                  rating:
                    Number(value),
                }
              : volunteer
        )
    );
  };


  // ========================================================
  // UPDATE LOCAL FEEDBACK
  // ========================================================

  const changeFeedback = (
    volunteerId,
    value
  ) => {
    setVolunteers(
      (currentVolunteers) =>
        currentVolunteers.map(
          (volunteer) =>
            volunteer.volunteerId ===
            volunteerId
              ? {
                  ...volunteer,

                  feedback:
                    value,
                }
              : volunteer
        )
    );
  };


  // ========================================================
  // RECALCULATE VOLUNTEER AVERAGE RATING
  // ========================================================

  const updateVolunteerAverageRating =
    async (volunteerId) => {
      const ratingsSnapshot =
        await getDocs(
          query(
            collection(
              db,
              "ratings"
            ),

            where(
              "volunteerId",
              "==",
              volunteerId
            )
          )
        );

      let totalRating = 0;

      ratingsSnapshot.forEach(
        (ratingDocument) => {
          totalRating +=
            Number(
              ratingDocument
                .data()
                .rating || 0
            );
        }
      );

      const averageRating =
        ratingsSnapshot.size > 0
          ? Number(
              (
                totalRating /
                ratingsSnapshot.size
              ).toFixed(1)
            )
          : 0;

      await updateDoc(
        doc(
          db,
          "users",
          volunteerId
        ),
        {
          rating:
            averageRating,

          ratingCount:
            ratingsSnapshot.size,

          ratingUpdatedAt:
            serverTimestamp(),
        }
      );
    };


  // ========================================================
  // SAVE RATINGS
  // ========================================================

  const saveRatings = async () => {
    if (!selectedEvent) {
      alert(
        "Please select an event."
      );

      return;
    }

    if (
      volunteers.length === 0
    ) {
      alert(
        "No volunteers with completed attendance are available."
      );

      return;
    }

    try {
      setSaving(true);

      let savedCount = 0;
      let skippedCount = 0;

      for (
        const volunteer
        of volunteers
      ) {
        // Existing ratings stay locked.
        if (
          volunteer.alreadyRated
        ) {
          skippedCount++;
          continue;
        }

        if (
          volunteer.rating < 1 ||
          volunteer.rating > 5
        ) {
          continue;
        }

        await addDoc(
          collection(
            db,
            "ratings"
          ),
          {
            eventId:
              selectedEvent,

            eventTitle:
              selectedEventData?.title ||
              "",

            organizerId:
              currentUser.uid,

            volunteerId:
              volunteer.volunteerId,

            volunteerName:
              volunteer.volunteerName ||
              "Volunteer",

            attendanceId:
              volunteer.attendanceId,

            completedHours:
              Number(
                volunteer.workedHours ||
                volunteer.completedHours ||
                0
              ),

            rating:
              Number(
                volunteer.rating
              ),

            feedback:
              volunteer.feedback.trim(),

            ratedBy:
              currentUser.uid,

            ratedAt:
              serverTimestamp(),
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
              selectedEvent,

            eventTitle:
              selectedEventData?.title ||
              "",

            title:
              "Rating Received",

            message:
              `You received a ${volunteer.rating}-star rating for "${selectedEventData?.title}".`,

            type:
              "rating",

            category:
              "completed",

            requiresAction:
              false,

            actionRoute:
              "/profile",

            actionLabel:
              "View Profile",

            isRead:
              false,

            createdAt:
              serverTimestamp(),
          }
        );

        savedCount++;

        await updateVolunteerAverageRating(
          volunteer.volunteerId
        );
      }

      if (
        savedCount > 0 &&
        skippedCount > 0
      ) {
        alert(
          `${savedCount} rating(s) saved. ${skippedCount} volunteer(s) were already rated.`
        );
      } else if (
        savedCount > 0
      ) {
        alert(
          "Ratings saved successfully."
        );
      } else {
        alert(
          "All eligible volunteers were already rated."
        );
      }

      await loadVolunteers(
        selectedEvent
      );
    } catch (saveError) {
      console.error(
        "Save ratings error:",
        saveError
      );

      alert(
        saveError?.message ||
          "Error saving ratings."
      );
    } finally {
      setSaving(false);
    }
  };


  // ========================================================
  // COUNTS
  // ========================================================

  const counts = useMemo(() => {
    return {
      eligible:
        volunteers.length,

      rated:
        volunteers.filter(
          (volunteer) =>
            volunteer.alreadyRated
        ).length,

      pending:
        volunteers.filter(
          (volunteer) =>
            !volunteer.alreadyRated
        ).length,
    };
  }, [volunteers]);


  // ========================================================
  // LOADING / ERROR
  // ========================================================

  if (
    !authReady ||
    loadingEvents
  ) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">
            ⏳
          </div>

          <h2>
            Loading Ratings
          </h2>

          <p>
            Waiting for login and loading events.
          </p>
        </div>
      </div>
    );
  }


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
            Unable to Load Ratings
          </h2>

          <p>{error}</p>
        </div>
      </div>
    );
  }


  // ========================================================
  // RATINGS UI
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
            Organizer Panel
          </p>

          <h1 className="page-title">
            Volunteer Ratings
          </h1>

          <p className="page-subtitle">
            Rate only volunteers who completed check-in,
            checkout, and attendance.
          </p>
        </div>

        <div className="organizer-status approved">
          ⭐ Ratings
        </div>
      </section>


      {/* ====================================================
          EVENT SELECTOR
      ==================================================== */}

      <section className="page-card attendance-selector-card">
        <label className="input-label">
          Select Event
        </label>

        <select
          className="modern-select"
          value={selectedEvent}
          onChange={(event) =>
            loadVolunteers(
              event.target.value
            )
          }
        >
          <option value="">
            Choose an Event
          </option>

          {events.map((event) => (
            <option
              key={event.id}
              value={event.id}
            >
              {event.title}
              {event.status ===
              "completed"
                ? " — Completed"
                : ""}
            </option>
          ))}
        </select>
      </section>


      {/* ====================================================
          ERROR MESSAGE
      ==================================================== */}

      {error && (
        <div className="form-message error">
          {error}
        </div>
      )}


      {/* ====================================================
          RATING COUNTS
      ==================================================== */}

      {selectedEvent && (
        <section className="dashboard-stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              👥
            </div>

            <div>
              <p>Eligible</p>
              <h2>
                {counts.eligible}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              ⭐
            </div>

            <div>
              <p>Rated</p>
              <h2>
                {counts.rated}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              ⏳
            </div>

            <div>
              <p>Pending</p>
              <h2>
                {counts.pending}
              </h2>
            </div>
          </div>
        </section>
      )}


      {/* ====================================================
          LOADING VOLUNTEERS
      ==================================================== */}

      {loadingVolunteers && (
        <div className="page-card empty-state">
          <div className="empty-icon">
            ⏳
          </div>

          <h2>
            Loading Eligible Volunteers
          </h2>
        </div>
      )}


      {/* ====================================================
          EMPTY STATE
      ==================================================== */}

      {!loadingVolunteers &&
        selectedEvent &&
        volunteers.length === 0 && (
          <div className="page-card empty-state">
            <div className="empty-icon">
              ⭐
            </div>

            <h2>
              No Eligible Volunteers
            </h2>

            <p>
              A volunteer must complete check-in and checkout
              before receiving a rating.
            </p>
          </div>
        )}


      {/* ====================================================
          VOLUNTEER RATING CARDS
      ==================================================== */}

      {!loadingVolunteers &&
        volunteers.map((volunteer) => (
          <article
            key={
              volunteer.attendanceId
            }
            className="event-card attendance-card"
          >
            <div className="event-card-header">
              <div>
                <p className="dashboard-eyebrow">
                  Completed Volunteer
                </p>

                <h2 className="event-title">
                  {volunteer.volunteerName ||
                    "Volunteer"}
                </h2>

                <p className="event-description">
                  {Number(
                    volunteer.workedHours ||
                      volunteer.completedHours ||
                      0
                  ).toFixed(2)}
                  {" volunteer hours completed"}
                </p>
              </div>

              {volunteer.alreadyRated ? (
                <span className="status-active">
                  Rated
                </span>
              ) : (
                <span className="event-type-badge volunteer">
                  Pending Rating
                </span>
              )}
            </div>


            <div className="event-meta-grid">
              <div className="event-meta-item">
                <span className="event-meta-icon">
                  ⏱️
                </span>

                <div>
                  <small>
                    Completed Hours
                  </small>

                  <strong>
                    {Number(
                      volunteer.workedHours ||
                        volunteer.completedHours ||
                        0
                    ).toFixed(2)}
                    {" hrs"}
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">
                  ✅
                </span>

                <div>
                  <small>
                    Attendance
                  </small>

                  <strong>
                    Completed
                  </strong>
                </div>
              </div>
            </div>


            <div className="event-card-section">
              <label className="input-label">
                Rating
              </label>

              <select
                className="modern-select"
                value={volunteer.rating}
                onChange={(event) =>
                  changeRating(
                    volunteer.volunteerId,
                    event.target.value
                  )
                }
                disabled={
                  volunteer.alreadyRated
                }
              >
                <option value="1">
                  1 Star
                </option>

                <option value="2">
                  2 Stars
                </option>

                <option value="3">
                  3 Stars
                </option>

                <option value="4">
                  4 Stars
                </option>

                <option value="5">
                  5 Stars
                </option>
              </select>
            </div>


            <div className="event-card-section">
              <label className="input-label">
                Feedback
              </label>

              <textarea
                className="modern-textarea"
                rows="3"
                placeholder="Add optional feedback about the volunteer."
                value={volunteer.feedback}
                onChange={(event) =>
                  changeFeedback(
                    volunteer.volunteerId,
                    event.target.value
                  )
                }
                disabled={
                  volunteer.alreadyRated
                }
              />
            </div>
          </article>
        ))}


      {/* ====================================================
          SAVE BUTTON
      ==================================================== */}

      {volunteers.some(
        (volunteer) =>
          !volunteer.alreadyRated
      ) && (
        <button
          type="button"
          className="primary-button attendance-save-button"
          onClick={saveRatings}
          disabled={saving}
        >
          {saving
            ? "Saving Ratings..."
            : "⭐ Save Ratings"}
        </button>
      )}
    </div>
  );
}

export default Ratings;