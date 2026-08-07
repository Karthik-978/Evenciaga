// ==========================================================
// REACT IMPORTS
// ==========================================================

import { useEffect, useMemo, useState } from "react";


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";


// ==========================================================
// COMPONENT IMPORTS
// ==========================================================

import BackButton from "../components/BackButton";


// ==========================================================
// VOLUNTEER HISTORY COMPONENT
//
// This page:
// - reads the volunteer's real attendance records;
// - shows completed, checked-in, no-show, and excused events;
// - uses stored worked hours instead of fixed hours;
// - connects ratings and certificates to each event;
// - updates summary fields in the volunteer's user document.
// ==========================================================

function VolunteerHistory() {
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

  const [history, setHistory] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // ========================================================
  // WAIT FOR FIREBASE AUTHENTICATION
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
  // FORMAT HELPERS
  // ========================================================

  const formatDate = (value) => {
    if (!value) {
      return "Not available";
    }

    if (value?.toDate) {
      return value
        .toDate()
        .toLocaleDateString();
    }

    const parsedDate =
      new Date(value);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return String(value);
    }

    return parsedDate.toLocaleDateString();
  };


  const formatTime = (value) => {
    if (!value) {
      return "--";
    }

    const parsedDate =
      value?.toDate
        ? value.toDate()
        : new Date(value);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "--";
    }

    return parsedDate.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };


  const formatHours = (value) => {
    const hours =
      Number(value || 0);

    return Number.isFinite(hours)
      ? hours.toFixed(2)
      : "0.00";
  };


  const formatStatus = (value) => {
    if (!value) {
      return "Not Started";
    }

    return String(value)
      .split("-")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1)
      )
      .join(" ");
  };


  // ========================================================
  // LOAD VOLUNTEER HISTORY
  // ========================================================

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const loadHistory = async () => {
      if (!currentUser) {
        setError(
          "You must be logged in to view volunteer history."
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError("");

        const uid =
          currentUser.uid;


        // --------------------------------------------------
        // LOAD ATTENDANCE RECORDS
        // --------------------------------------------------

        const attendanceSnapshot =
          await getDocs(
            query(
              collection(
                db,
                "attendance"
              ),

              where(
                "volunteerId",
                "==",
                uid
              )
            )
          );

        const attendanceRecords =
          attendanceSnapshot.docs.map(
            (
              attendanceDocument
            ) => ({
              attendanceId:
                attendanceDocument.id,

              ...attendanceDocument.data(),
            })
          );


        // --------------------------------------------------
        // LOAD VOLUNTEER APPLICATIONS
        // --------------------------------------------------

        const requestsSnapshot =
          await getDocs(
            query(
              collection(
                db,
                "joinRequests"
              ),

              where(
                "volunteerId",
                "==",
                uid
              )
            )
          );

        const requestRecords =
          requestsSnapshot.docs.map(
            (
              requestDocument
            ) => ({
              requestId:
                requestDocument.id,

              ...requestDocument.data(),
            })
          );

        const requestByEventId = {};

        requestRecords.forEach(
          (request) => {
            requestByEventId[
              request.eventId
            ] = request;
          }
        );


        // --------------------------------------------------
        // LOAD RATINGS
        // --------------------------------------------------

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
                uid
              )
            )
          );

        const ratingByEventId = {};

        ratingsSnapshot.docs.forEach(
          (ratingDocument) => {
            const rating =
              ratingDocument.data();

            ratingByEventId[
              rating.eventId
            ] = {
              ratingId:
                ratingDocument.id,

              ...rating,
            };
          }
        );


        // --------------------------------------------------
        // LOAD CERTIFICATES
        // --------------------------------------------------

        const certificatesSnapshot =
          await getDocs(
            query(
              collection(
                db,
                "certificates"
              ),

              where(
                "volunteerId",
                "==",
                uid
              )
            )
          );

        const certificateByEventId = {};

        certificatesSnapshot.docs.forEach(
          (
            certificateDocument
          ) => {
            const certificate =
              certificateDocument.data();

            certificateByEventId[
              certificate.eventId
            ] = {
              certificateId:
                certificateDocument.id,

              ...certificate,
            };
          }
        );


        // --------------------------------------------------
        // LOAD EVENT DETAILS
        // --------------------------------------------------

        const eventIds = [
          ...new Set(
            [
              ...attendanceRecords.map(
                (record) =>
                  record.eventId
              ),

              ...requestRecords.map(
                (record) =>
                  record.eventId
              ),
            ].filter(Boolean)
          ),
        ];

        const eventEntries =
          await Promise.all(
            eventIds.map(
              async (eventId) => {
                const eventSnapshot =
                  await getDoc(
                    doc(
                      db,
                      "events",
                      eventId
                    )
                  );

                return [
                  eventId,

                  eventSnapshot.exists()
                    ? {
                        id:
                          eventSnapshot.id,

                        ...eventSnapshot.data(),
                      }
                    : null,
                ];
              }
            )
          );

        const eventsById =
          Object.fromEntries(
            eventEntries
          );


        // --------------------------------------------------
        // BUILD COMPLETE HISTORY
        // --------------------------------------------------

        const combinedHistory =
          attendanceRecords
            .map(
              (attendance) => {
                const eventData =
                  eventsById[
                    attendance.eventId
                  ];

                const request =
                  requestByEventId[
                    attendance.eventId
                  ];

                const rating =
                  ratingByEventId[
                    attendance.eventId
                  ];

                const certificate =
                  certificateByEventId[
                    attendance.eventId
                  ];

                const attendanceStatus =
                  attendance
                    .attendanceStatus ||
                  attendance.status ||
                  "not-started";

                const workedHours =
                  Number(
                    attendance.workedHours ??
                      attendance.completedHours ??
                      attendance.hours ??
                      (
                        attendance.status ===
                          "present"
                          ? eventData?.eventHours
                          : 0
                      ) ??
                      0
                  );

                return {
                  ...attendance,

                  eventData,
                  request,
                  rating,
                  certificate,

                  attendanceStatus,

                  workedHours:
                    Number.isFinite(
                      workedHours
                    )
                      ? workedHours
                      : 0,

                  eventTitle:
                    attendance.eventTitle ||
                    eventData?.title ||
                    request?.eventTitle ||
                    "Untitled Event",
                };
              }
            )
            .sort(
              (
                firstRecord,
                secondRecord
              ) => {
                const firstDate =
                  new Date(
                    firstRecord
                      .eventData?.date ||
                      0
                  );

                const secondDate =
                  new Date(
                    secondRecord
                      .eventData?.date ||
                      0
                  );

                return (
                  secondDate -
                  firstDate
                );
              }
            );

        setHistory(
          combinedHistory
        );


        // --------------------------------------------------
        // CALCULATE PROFILE STATISTICS
        // --------------------------------------------------

        const completedRecords =
          combinedHistory.filter(
            (record) =>
              record.attendanceStatus ===
                "completed" ||
              record.attendanceStatus ===
                "present"
          );

        const noShowRecords =
          combinedHistory.filter(
            (record) =>
              record.attendanceStatus ===
              "no-show"
          );

        const totalVolunteerHours =
          completedRecords.reduce(
            (
              total,
              record
            ) =>
              total +
              Number(
                record.workedHours ||
                  0
              ),

            0
          );

        const countableAttendance =
          completedRecords.length +
          noShowRecords.length;

        const attendancePercentage =
          countableAttendance > 0
            ? Number(
                (
                  (
                    completedRecords.length /
                    countableAttendance
                  ) *
                  100
                ).toFixed(0)
              )
            : 0;

        const ratingValues =
          ratingsSnapshot.docs
            .map(
              (ratingDocument) =>
                Number(
                  ratingDocument
                    .data()
                    .rating || 0
                )
            )
            .filter(
              (rating) =>
                rating > 0
            );

        const averageRating =
          ratingValues.length > 0
            ? Number(
                (
                  ratingValues.reduce(
                    (
                      total,
                      rating
                    ) =>
                      total +
                      rating,

                    0
                  ) /
                  ratingValues.length
                ).toFixed(1)
              )
            : 0;


        // --------------------------------------------------
        // UPDATE USER PROFILE SUMMARY
        // --------------------------------------------------

        await updateDoc(
          doc(
            db,
            "users",
            uid
          ),
          {
            volunteerHours:
              Number(
                totalVolunteerHours.toFixed(
                  2
                )
              ),

            eventsCompleted:
              completedRecords.length,

            attendancePercentage,

            attendancePercent:
              attendancePercentage,

            certificatesEarned:
              certificatesSnapshot.size,

            rating:
              averageRating,

            ratingCount:
              ratingValues.length,
          }
        );
      } catch (loadError) {
        console.error(
          "Volunteer history loading error:",
          loadError
        );

        setError(
          loadError?.message ||
            "Unable to load volunteer history."
        );
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [authReady, currentUser]);


  // ========================================================
  // DERIVED STATISTICS
  // ========================================================

  const statistics = useMemo(() => {
    const completed =
      history.filter(
        (record) =>
          record.attendanceStatus ===
            "completed" ||
          record.attendanceStatus ===
            "present"
      );

    const noShows =
      history.filter(
        (record) =>
          record.attendanceStatus ===
          "no-show"
      );

    const excused =
      history.filter(
        (record) =>
          record.attendanceStatus ===
          "excused-absence"
      );

    const checkedIn =
      history.filter(
        (record) =>
          record.attendanceStatus ===
          "checked-in"
      );

    const volunteerHours =
      completed.reduce(
        (
          total,
          record
        ) =>
          total +
          Number(
            record.workedHours ||
              0
          ),

        0
      );

    const countableAttendance =
      completed.length +
      noShows.length;

    const attendancePercentage =
      countableAttendance > 0
        ? Number(
            (
              (
                completed.length /
                countableAttendance
              ) *
              100
            ).toFixed(0)
          )
        : 0;

    const ratingValues =
      history
        .map(
          (record) =>
            Number(
              record.rating?.rating ||
                0
            )
        )
        .filter(
          (rating) =>
            rating > 0
        );

    const averageRating =
      ratingValues.length > 0
        ? Number(
            (
              ratingValues.reduce(
                (
                  total,
                  rating
                ) =>
                  total +
                  rating,

                0
              ) /
              ratingValues.length
            ).toFixed(1)
          )
        : 0;

    const certificates =
      history.filter(
        (record) =>
          Boolean(
            record.certificate
          )
      ).length;

    return {
      completed:
        completed.length,

      noShows:
        noShows.length,

      excused:
        excused.length,

      checkedIn:
        checkedIn.length,

      volunteerHours,

      attendancePercentage,

      averageRating,

      certificates,
    };
  }, [history]);


  // ========================================================
  // LOADING / ERROR
  // ========================================================

  if (
    !authReady ||
    loading
  ) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">
            ⏳
          </div>

          <h2>
            Loading Volunteer History
          </h2>

          <p>
            Loading attendance, ratings, and certificates.
          </p>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="page-container">
        <BackButton />

        <div className="page-card empty-state">
          <div className="empty-icon">
            ⚠️
          </div>

          <h2>
            Unable to Load History
          </h2>

          <p>{error}</p>
        </div>
      </div>
    );
  }


  // ========================================================
  // VOLUNTEER HISTORY UI
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
            Volunteer Portal
          </p>

          <h1 className="page-title">
            Volunteer History
          </h1>

          <p className="page-subtitle">
            View attendance, worked hours, ratings,
            certificates, no-shows, and excused absences.
          </p>
        </div>

        <div className="organizer-status approved">
          📚 {history.length} Records
        </div>
      </section>


      {/* ====================================================
          HISTORY STATISTICS
      ==================================================== */}

      <section className="dashboard-stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            ✅
          </div>

          <div>
            <p>Events Completed</p>

            <h2>
              {statistics.completed}
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            ⏱️
          </div>

          <div>
            <p>Volunteer Hours</p>

            <h2>
              {formatHours(
                statistics.volunteerHours
              )}
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            📊
          </div>

          <div>
            <p>Attendance</p>

            <h2>
              {
                statistics
                  .attendancePercentage
              }
              %
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            ⭐
          </div>

          <div>
            <p>Average Rating</p>

            <h2>
              {
                statistics
                  .averageRating
              }
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            🏆
          </div>

          <div>
            <p>Certificates</p>

            <h2>
              {
                statistics
                  .certificates
              }
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            ❌
          </div>

          <div>
            <p>No-Shows</p>

            <h2>
              {statistics.noShows}
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            🟡
          </div>

          <div>
            <p>Excused</p>

            <h2>
              {statistics.excused}
            </h2>
          </div>
        </div>
      </section>


      {/* ====================================================
          EMPTY STATE
      ==================================================== */}

      {history.length === 0 && (
        <div className="page-card empty-state">
          <div className="empty-icon">
            📚
          </div>

          <h2>
            No Volunteer History Yet
          </h2>

          <p>
            Attendance records will appear after you
            participate in an event.
          </p>
        </div>
      )}


      {/* ====================================================
          HISTORY CARDS
      ==================================================== */}

      {history.map((record) => (
        <article
          key={
            record.attendanceId
          }
          className="event-card attendance-card"
        >
          <div className="event-card-header">
            <div>
              <p className="dashboard-eyebrow">
                Attendance Record
              </p>

              <h2 className="event-title">
                {record.eventTitle}
              </h2>

              <p className="event-description">
                {record.eventData?.location ||
                  "Location not available"}
              </p>
            </div>

            {record.attendanceStatus ===
            "completed" ||
            record.attendanceStatus ===
            "present" ? (
              <span className="status-active">
                Completed
              </span>
            ) : record.attendanceStatus ===
              "no-show" ? (
              <span className="status-completed">
                No-Show
              </span>
            ) : record.attendanceStatus ===
              "excused-absence" ? (
              <span className="event-type-badge certificate">
                Excused
              </span>
            ) : (
              <span className="event-type-badge volunteer">
                {formatStatus(
                  record.attendanceStatus
                )}
              </span>
            )}
          </div>


          {/* ================================================
              EVENT AND ATTENDANCE DETAILS
          ================================================ */}

          <div className="event-meta-grid">
            <div className="event-meta-item">
              <span className="event-meta-icon">
                📅
              </span>

              <div>
                <small>
                  Event Date
                </small>

                <strong>
                  {formatDate(
                    record.eventData?.date
                  )}
                </strong>
              </div>
            </div>

            <div className="event-meta-item">
              <span className="event-meta-icon">
                🕘
              </span>

              <div>
                <small>
                  Check-In
                </small>

                <strong>
                  {formatTime(
                    record.checkInTime
                  )}
                </strong>
              </div>
            </div>

            <div className="event-meta-item">
              <span className="event-meta-icon">
                🕔
              </span>

              <div>
                <small>
                  Check-Out
                </small>

                <strong>
                  {formatTime(
                    record.checkOutTime
                  )}
                </strong>
              </div>
            </div>

            <div className="event-meta-item">
              <span className="event-meta-icon">
                ⏱️
              </span>

              <div>
                <small>
                  Worked Hours
                </small>

                <strong>
                  {formatHours(
                    record.workedHours
                  )}
                  {" hrs"}
                </strong>
              </div>
            </div>

            <div className="event-meta-item">
              <span className="event-meta-icon">
                ⭐
              </span>

              <div>
                <small>
                  Rating
                </small>

                <strong>
                  {record.rating?.rating
                    ? `${record.rating.rating}/5`
                    : "Not rated"}
                </strong>
              </div>
            </div>

            <div className="event-meta-item">
              <span className="event-meta-icon">
                🏆
              </span>

              <div>
                <small>
                  Certificate
                </small>

                <strong>
                  {record.certificate
                    ? "Issued"
                    : "Not issued"}
                </strong>
              </div>
            </div>
          </div>


          {/* ================================================
              ATTENDANCE NOTE
          ================================================ */}

          {(record.absenceReason ||
            record.noShowReason ||
            record.missedCheckoutReason) && (
              <div className="event-card-section">
                <h3>
                  Attendance Note
                </h3>

                <p className="event-description">
                  {record.absenceReason ||
                    record.noShowReason ||
                    record.missedCheckoutReason}
                </p>
              </div>
            )}


          {/* ================================================
              RATING FEEDBACK
          ================================================ */}

          {record.rating?.feedback && (
            <div className="event-card-section">
              <h3>
                Organizer Feedback
              </h3>

              <p className="event-description">
                {record.rating.feedback}
              </p>
            </div>
          )}


          {/* ================================================
              CERTIFICATE INFORMATION
          ================================================ */}

          {record.certificate && (
            <div className="event-card-section">
              <h3>
                Certificate
              </h3>

              <p className="event-description">
                Certificate Number:{" "}
                <strong>
                  {
                    record.certificate
                      .certificateNumber
                  }
                </strong>
              </p>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

export default VolunteerHistory;