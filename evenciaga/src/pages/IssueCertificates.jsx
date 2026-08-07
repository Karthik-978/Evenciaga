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
// ISSUE CERTIFICATES
//
// This page shows every selected volunteer for an event.
//
// Possible results:
// - Eligible: certificate can be issued.
// - Issued: certificate already exists.
// - Not eligible: exact reason is displayed.
//
// It also fixes event switching by:
// - waiting for Firebase authentication;
// - updating selectedEvent immediately;
// - loading using the event ID passed by the dropdown;
// - clearing old event data before every new load.
// ==========================================================

function IssueCertificates() {
  // --------------------------------------------------------
  // AUTHENTICATION STATE
  // --------------------------------------------------------

  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);


  // --------------------------------------------------------
  // PAGE STATE
  // --------------------------------------------------------

  const [events, setEvents] = useState([]);

  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedEventData, setSelectedEventData] =
    useState(null);

  const [volunteers, setVolunteers] = useState([]);

  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingVolunteers, setLoadingVolunteers] =
    useState(false);

  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");


  // ========================================================
  // WAIT FOR FIREBASE AUTHENTICATION
  // ========================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user || null);
        setAuthReady(true);
      }
    );

    return unsubscribe;
  }, []);


  // ========================================================
  // LOAD THE LOGGED-IN ORGANIZER'S EVENTS
  // ========================================================

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const fetchEvents = async () => {
      if (!currentUser) {
        setEvents([]);
        setError(
          "You must be logged in as an organizer."
        );
        setLoadingEvents(false);
        return;
      }

      try {
        setLoadingEvents(true);
        setError("");

        const snapshot = await getDocs(
          query(
            collection(db, "events"),
            where(
              "organizerId",
              "==",
              currentUser.uid
            )
          )
        );

        const data = snapshot.docs
          .map((eventDocument) => ({
            id: eventDocument.id,
            ...eventDocument.data(),
          }))
          .sort(
            (firstEvent, secondEvent) =>
              new Date(secondEvent.date || 0) -
              new Date(firstEvent.date || 0)
          );

        setEvents(data);
      } catch (loadError) {
        console.error(
          "Certificate event loading error:",
          loadError
        );

        setError(
          loadError?.message ||
            "Failed to load organizer events."
        );
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [authReady, currentUser]);


  // ========================================================
  // FORMAT HELPERS
  // ========================================================

  const formatDate = (value) => {
    if (!value) {
      return "Not available";
    }

    if (value?.toDate) {
      return value.toDate().toLocaleDateString();
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return String(value);
    }

    return parsedDate.toLocaleDateString();
  };


  const formatHours = (value) => {
    const hours = Number(value || 0);

    return Number.isFinite(hours)
      ? hours.toFixed(2)
      : "0.00";
  };


  // ========================================================
  // CERTIFICATE NUMBER
  // ========================================================

  const generateCertificateNumber = (
    eventId,
    volunteerId
  ) => {
    const eventPart = String(eventId)
      .slice(0, 5)
      .toUpperCase();

    const volunteerPart = String(volunteerId)
      .slice(0, 5)
      .toUpperCase();

    const timePart = Date.now()
      .toString()
      .slice(-6);

    return `EVC-${eventPart}-${volunteerPart}-${timePart}`;
  };


  // ========================================================
  // DETERMINE CERTIFICATE ELIGIBILITY
  // ========================================================

  const getEligibility = (
    eventData,
    application,
    attendance,
    certificate
  ) => {
    if (certificate) {
      return {
        status: "issued",
        eligible: false,
        reason: "Certificate has already been issued.",
      };
    }

    if (
      eventData?.certificateEligible === false
    ) {
      return {
        status: "not-eligible",
        eligible: false,
        reason:
          "The organizer disabled certificates for this event.",
      };
    }

    if (!attendance) {
      return {
        status: "not-eligible",
        eligible: false,
        reason:
          "No attendance record was found. The volunteer must check in and check out.",
      };
    }

    const attendanceStatus =
      attendance.attendanceStatus ||
      attendance.status ||
      "not-started";

    if (attendanceStatus === "no-show") {
      return {
        status: "not-eligible",
        eligible: false,
        reason:
          "The volunteer was marked as a no-show.",
      };
    }

    if (
      attendanceStatus === "excused-absence"
    ) {
      return {
        status: "not-eligible",
        eligible: false,
        reason:
          "The volunteer had an excused absence and did not complete the event.",
      };
    }

    const completed =
      attendanceStatus === "completed" ||
      attendanceStatus === "present";

    if (!completed) {
      return {
        status: "not-eligible",
        eligible: false,
        reason:
          attendanceStatus === "checked-in"
            ? "The volunteer checked in but has not completed checkout."
            : "Attendance has not been completed.",
      };
    }

    const workedHours = Number(
      attendance.workedHours ??
        attendance.completedHours ??
        attendance.hours ??
        (
          attendance.status === "present"
            ? eventData?.eventHours
            : 0
        ) ??
        0
    );

    if (
      !Number.isFinite(workedHours) ||
      workedHours <= 0
    ) {
      return {
        status: "not-eligible",
        eligible: false,
        reason:
          "Completed volunteer hours are missing or equal to zero.",
      };
    }

    const isSelected =
      application.selectionType === "primary" ||
      (
        !application.selectionType &&
        application.status === "approved"
      );

    if (!isSelected) {
      return {
        status: "not-eligible",
        eligible: false,
        reason:
          "The volunteer was not selected as a primary volunteer.",
      };
    }

    return {
      status: "eligible",
      eligible: true,
      reason:
        "Attendance is completed and valid volunteer hours were recorded.",
      workedHours,
    };
  };


  // ========================================================
  // LOAD ALL SELECTED VOLUNTEERS FOR AN EVENT
  // ========================================================

  const loadVolunteers = async (eventId) => {
    // Update selection immediately so another event can be
    // chosen without refreshing.
    setSelectedEvent(eventId);

    // Remove stale data from the previously selected event.
    setSelectedEventData(null);
    setVolunteers([]);
    setError("");

    if (!eventId) {
      setLoadingVolunteers(false);
      return;
    }

    try {
      setLoadingVolunteers(true);

      const eventData =
        events.find(
          (event) => event.id === eventId
        ) || null;

      if (!eventData) {
        setError("Selected event was not found.");
        return;
      }

      setSelectedEventData(eventData);

      // ----------------------------------------------------
      // LOAD EVENT APPLICATIONS
      // ----------------------------------------------------

      const requestsSnapshot = await getDocs(
        query(
          collection(db, "joinRequests"),
          where("eventId", "==", eventId)
        )
      );

      const selectedApplications =
        requestsSnapshot.docs
          .map((requestDocument) => ({
            id: requestDocument.id,
            ...requestDocument.data(),
          }))
          .filter((application) => {
            const primary =
              application.selectionType === "primary" ||
              (
                !application.selectionType &&
                application.status === "approved"
              );

            return primary;
          });

      // ----------------------------------------------------
      // LOAD ATTENDANCE
      // ----------------------------------------------------

      const attendanceSnapshot = await getDocs(
        query(
          collection(db, "attendance"),
          where("eventId", "==", eventId)
        )
      );

      const attendanceByVolunteerId = {};

      attendanceSnapshot.docs.forEach(
        (attendanceDocument) => {
          const attendanceData =
            attendanceDocument.data();

          attendanceByVolunteerId[
            attendanceData.volunteerId
          ] = {
            attendanceId: attendanceDocument.id,
            ...attendanceData,
          };
        }
      );

      // ----------------------------------------------------
      // LOAD EXISTING CERTIFICATES
      // ----------------------------------------------------

      const certificatesSnapshot = await getDocs(
        query(
          collection(db, "certificates"),
          where("eventId", "==", eventId)
        )
      );

      const certificateByVolunteerId = {};

      certificatesSnapshot.docs.forEach(
        (certificateDocument) => {
          const certificateData =
            certificateDocument.data();

          certificateByVolunteerId[
            certificateData.volunteerId
          ] = {
            id: certificateDocument.id,
            ...certificateData,
          };
        }
      );

      // ----------------------------------------------------
      // MERGE DATA AND CALCULATE ELIGIBILITY
      // ----------------------------------------------------

      const mergedVolunteers =
        selectedApplications.map(
          (application) => {
            const attendance =
              attendanceByVolunteerId[
                application.volunteerId
              ] || null;

            const existingCertificate =
              certificateByVolunteerId[
                application.volunteerId
              ] || null;

            const eligibility = getEligibility(
              eventData,
              application,
              attendance,
              existingCertificate
            );

            const workedHours = Number(
              attendance?.workedHours ??
                attendance?.completedHours ??
                attendance?.hours ??
                (
                  attendance?.status === "present"
                    ? eventData.eventHours
                    : 0
                ) ??
                0
            );

            return {
              ...application,

              attendance,
              attendanceId:
                attendance?.attendanceId || "",

              existingCertificate,

              certificateIssued:
                Boolean(existingCertificate),

              eligibility,

              workedHours:
                Number.isFinite(workedHours)
                  ? workedHours
                  : 0,
            };
          }
        );

      setVolunteers(mergedVolunteers);
    } catch (loadError) {
      console.error(
        "Certificate volunteer loading error:",
        loadError
      );

      setError(
        loadError?.message ||
          "Failed to load volunteers for this event."
      );
    } finally {
      setLoadingVolunteers(false);
    }
  };


  // ========================================================
  // HANDLE EVENT SELECTION
  // ========================================================

  const handleEventChange = (
    changeEvent
  ) => {
    const eventId =
      changeEvent.target.value;

    loadVolunteers(eventId);
  };


  // ========================================================
  // ISSUE ONE CERTIFICATE
  // ========================================================

  const issueCertificate = async (
    volunteer
  ) => {
    if (!selectedEventData) {
      alert("Please select an event.");
      return;
    }

    if (!volunteer.eligibility?.eligible) {
      alert(
        volunteer.eligibility?.reason ||
          "This volunteer is not eligible."
      );
      return;
    }

    if (!volunteer.attendanceId) {
      alert(
        "Attendance document was not found."
      );
      return;
    }

    try {
      setProcessingId(
        volunteer.volunteerId
      );

      // Final duplicate protection.
      const duplicateSnapshot = await getDocs(
        query(
          collection(db, "certificates"),

          where(
            "eventId",
            "==",
            selectedEvent
          ),

          where(
            "volunteerId",
            "==",
            volunteer.volunteerId
          )
        )
      );

      if (!duplicateSnapshot.empty) {
        alert(
          "A certificate already exists for this volunteer and event."
        );

        await loadVolunteers(selectedEvent);
        return;
      }

      const certificateNumber =
        generateCertificateNumber(
          selectedEvent,
          volunteer.volunteerId
        );

      const hours = Number(
        volunteer.workedHours || 0
      );

      // ----------------------------------------------------
      // CREATE CERTIFICATE
      // ----------------------------------------------------

      await addDoc(
        collection(db, "certificates"),
        {
          certificateNumber,

          eventId: selectedEvent,
          eventTitle:
            selectedEventData.title || "Event",

          eventDate:
            selectedEventData.date || "",

          location:
            selectedEventData.location || "",

          eventCategory:
            selectedEventData.eventCategory || "",

          organizerId: currentUser.uid,
          organizerEmail:
            currentUser.email || "",

          volunteerId:
            volunteer.volunteerId,

          volunteerName:
            volunteer.volunteerName ||
            "Volunteer",

          attendanceId:
            volunteer.attendanceId,

          joinRequestId:
            volunteer.id,

          hours,

          status: "issued",
          verificationStatus: "verified",

          issuedBy: currentUser.uid,
          issuedDate: serverTimestamp(),
          createdAt: serverTimestamp(),
        }
      );

      // ----------------------------------------------------
      // UPDATE ATTENDANCE
      // ----------------------------------------------------

      await updateDoc(
        doc(
          db,
          "attendance",
          volunteer.attendanceId
        ),
        {
          certificateIssued: true,
          certificateNumber,
          certificateIssuedAt:
            serverTimestamp(),

          updatedAt: serverTimestamp(),
        }
      );

      // ----------------------------------------------------
      // UPDATE JOIN REQUEST
      // ----------------------------------------------------

      await updateDoc(
        doc(
          db,
          "joinRequests",
          volunteer.id
        ),
        {
          certificateIssued: true,
          certificateNumber,
          certificateIssuedAt:
            serverTimestamp(),

          updatedAt: serverTimestamp(),
        }
      );

      // ----------------------------------------------------
      // NOTIFY VOLUNTEER
      // ----------------------------------------------------

      await addDoc(
        collection(db, "notifications"),
        {
          volunteerId:
            volunteer.volunteerId,

          eventId: selectedEvent,
          eventTitle:
            selectedEventData.title || "",

          title: "Certificate Issued",

          message:
            `Your certificate for "${selectedEventData.title}" has been issued.`,

          type: "certificate-issued",
          category: "completed",

          requiresAction: false,

          actionRoute: "/certificates",
          actionLabel: "View Certificate",

          isRead: false,
          createdAt: serverTimestamp(),
        }
      );

      alert(
        `Certificate issued to ${
          volunteer.volunteerName ||
          "volunteer"
        }.`
      );

      await loadVolunteers(selectedEvent);
    } catch (issueError) {
      console.error(
        "Issue certificate error:",
        issueError
      );

      alert(
        issueError?.message ||
          "Failed to issue certificate."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // ISSUE ALL ELIGIBLE CERTIFICATES
  // ========================================================

  const issueAllEligible = async () => {
    const eligibleVolunteers =
      volunteers.filter(
        (volunteer) =>
          volunteer.eligibility?.eligible
      );

    if (
      eligibleVolunteers.length === 0
    ) {
      alert(
        "No eligible volunteers are available."
      );
      return;
    }

    const confirmed = window.confirm(
      `Issue ${eligibleVolunteers.length} certificate(s)?`
    );

    if (!confirmed) {
      return;
    }

    // This intentionally runs one at a time so each issue
    // receives duplicate protection and notifications.
    for (
      const volunteer
      of eligibleVolunteers
    ) {
      await issueCertificate(volunteer);
    }
  };


  // ========================================================
  // COUNTS
  // ========================================================

  const counts = useMemo(() => {
    return {
      total: volunteers.length,

      eligible: volunteers.filter(
        (volunteer) =>
          volunteer.eligibility?.status ===
          "eligible"
      ).length,

      issued: volunteers.filter(
        (volunteer) =>
          volunteer.eligibility?.status ===
          "issued"
      ).length,

      notEligible: volunteers.filter(
        (volunteer) =>
          volunteer.eligibility?.status ===
          "not-eligible"
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
            Loading Certificates
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
            Unable to Load Certificates
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
            Organizer Panel
          </p>

          <h1 className="page-title">
            Issue Certificates
          </h1>

          <p className="page-subtitle">
            Review eligible and ineligible volunteers,
            see exact reasons, and issue verified certificates.
          </p>
        </div>

        <div className="organizer-status approved">
          🏆 Certificates
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
          onChange={handleEventChange}
          disabled={loadingVolunteers}
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
              {event.certificateEligible === false
                ? " — Certificates Disabled"
                : ""}
            </option>
          ))}
        </select>

        {loadingVolunteers && (
          <p className="page-subtitle">
            Loading the selected event...
          </p>
        )}
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
          STATISTICS
      ==================================================== */}

      {selectedEvent && (
        <section className="dashboard-stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              👥
            </div>

            <div>
              <p>Total Selected</p>
              <h2>{counts.total}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              ✅
            </div>

            <div>
              <p>Eligible</p>
              <h2>{counts.eligible}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              🏆
            </div>

            <div>
              <p>Issued</p>
              <h2>{counts.issued}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              🚫
            </div>

            <div>
              <p>Not Eligible</p>
              <h2>
                {counts.notEligible}
              </h2>
            </div>
          </div>
        </section>
      )}


      {/* ====================================================
          ISSUE ALL
      ==================================================== */}

      {counts.eligible > 0 && (
        <section className="page-card">
          <button
            type="button"
            className="primary-button"
            onClick={issueAllEligible}
            disabled={Boolean(processingId)}
          >
            🏆 Issue All Eligible Certificates
          </button>
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
            Loading Volunteers
          </h2>
        </div>
      )}


      {/* ====================================================
          EMPTY STATE
      ==================================================== */}

      {!loadingVolunteers &&
        selectedEvent &&
        volunteers.length === 0 &&
        !error && (
          <div className="page-card empty-state">
            <div className="empty-icon">
              👥
            </div>

            <h2>
              No Selected Volunteers
            </h2>

            <p>
              No primary volunteers were found for this event.
            </p>
          </div>
        )}


      {/* ====================================================
          VOLUNTEER CARDS
      ==================================================== */}

      {!loadingVolunteers &&
        volunteers.map((volunteer) => {
          const eligibility =
            volunteer.eligibility;

          const isProcessing =
            processingId ===
            volunteer.volunteerId;

          const attendanceStatus =
            volunteer.attendance
              ?.attendanceStatus ||
            volunteer.attendance?.status ||
            "not-started";

          return (
            <article
              key={volunteer.id}
              className="event-card attendance-card"
            >
              <div className="event-card-header">
                <div>
                  <p className="dashboard-eyebrow">
                    Certificate Review
                  </p>

                  <h2 className="event-title">
                    {volunteer.volunteerName ||
                      "Volunteer"}
                  </h2>

                  <p className="event-description">
                    {volunteer.requestedRole ||
                      "Primary volunteer"}
                  </p>
                </div>

                {eligibility.status ===
                "eligible" ? (
                  <span className="status-active">
                    Eligible
                  </span>
                ) : eligibility.status ===
                  "issued" ? (
                  <span className="event-type-badge certificate">
                    Certificate Issued
                  </span>
                ) : (
                  <span className="status-completed">
                    Not Eligible
                  </span>
                )}
              </div>


              {/* ============================================
                  VOLUNTEER INFORMATION
              ============================================ */}

              <div className="event-meta-grid">
                <div className="event-meta-item">
                  <span className="event-meta-icon">
                    📌
                  </span>

                  <div>
                    <small>
                      Attendance
                    </small>

                    <strong>
                      {attendanceStatus}
                    </strong>
                  </div>
                </div>

                <div className="event-meta-item">
                  <span className="event-meta-icon">
                    ⏱️
                  </span>

                  <div>
                    <small>
                      Recorded Hours
                    </small>

                    <strong>
                      {formatHours(
                        volunteer.workedHours
                      )}
                      {" hrs"}
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
                      {formatDate(
                        selectedEventData?.date
                      )}
                    </strong>
                  </div>
                </div>

                <div className="event-meta-item">
                  <span className="event-meta-icon">
                    📍
                  </span>

                  <div>
                    <small>
                      Location
                    </small>

                    <strong>
                      {selectedEventData?.location ||
                        "Not available"}
                    </strong>
                  </div>
                </div>
              </div>


              {/* ============================================
                  ELIGIBILITY REASON
              ============================================ */}

              <div className="event-card-section">
                <h3>
                  {eligibility.eligible
                    ? "Why Eligible"
                    : eligibility.status === "issued"
                      ? "Certificate Status"
                      : "Why Not Eligible"}
                </h3>

                <p className="event-description">
                  {eligibility.reason}
                </p>
              </div>


              {/* ============================================
                  EXISTING CERTIFICATE
              ============================================ */}

              {volunteer.existingCertificate && (
                <div className="event-card-section">
                  <h3>
                    Certificate Details
                  </h3>

                  <p className="event-description">
                    Certificate Number:{" "}
                    <strong>
                      {
                        volunteer
                          .existingCertificate
                          .certificateNumber
                      }
                    </strong>
                  </p>
                </div>
              )}


              {/* ============================================
                  ACTION
              ============================================ */}

              <div className="event-action-buttons">
                {eligibility.eligible ? (
                  <button
                    type="button"
                    className="primary-action-button"
                    onClick={() =>
                      issueCertificate(volunteer)
                    }
                    disabled={isProcessing}
                  >
                    {isProcessing
                      ? "Issuing..."
                      : "🏆 Issue Certificate"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="secondary-action-button"
                    disabled
                  >
                    {eligibility.status === "issued"
                      ? "✓ Certificate Already Issued"
                      : "🚫 Not Eligible"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
    </div>
  );
}

export default IssueCertificates;