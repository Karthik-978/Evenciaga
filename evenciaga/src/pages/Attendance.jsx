// ==========================================================
// REACT IMPORTS
// ==========================================================

import { useEffect, useMemo, useState } from "react";

import { onAuthStateChanged } from "firebase/auth";


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

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
// ORGANIZER ATTENDANCE CONTROL PANEL
// Organizer monitors and handles exceptions.
// Volunteers perform normal check-in and checkout.
// ==========================================================

function Attendance() {
  // --------------------------------------------------------
  // AUTH STATE
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

  const [loading, setLoading] = useState(true);
  const [loadingVolunteers, setLoadingVolunteers] =
    useState(false);

  const [processingId, setProcessingId] =
    useState("");

  const [error, setError] = useState("");


  // ========================================================
  // WAIT FOR FIREBASE AUTH
  //
  // This fixes the issue where events only became selectable
  // after refreshing the browser.
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
  // LOAD ORGANIZER EVENTS
  // ========================================================

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError("");

        if (!currentUser) {
          setError(
            "You must be logged in as an organizer."
          );

          return;
        }

        const eventsSnapshot = await getDocs(
          query(
            collection(db, "events"),
            where(
              "organizerId",
              "==",
              currentUser.uid
            )
          )
        );

        const eventData = eventsSnapshot.docs
          .map((eventDocument) => ({
            id: eventDocument.id,
            ...eventDocument.data(),
          }))
          .sort(
            (firstEvent, secondEvent) =>
              new Date(firstEvent.date || 0) -
              new Date(secondEvent.date || 0)
          );

        setEvents(eventData);
      } catch (eventError) {
        console.error(
          "Attendance event loading error:",
          eventError
        );

        setError(
          eventError?.message ||
            "Failed to load organizer events."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [authReady, currentUser]);


  // ========================================================
  // HELPERS
  // ========================================================

  const formatTime = (value) => {
    if (!value) {
      return "--";
    }

    const parsedDate = value?.toDate
      ? value.toDate()
      : new Date(value);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "--";
    }

    return parsedDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };


  const formatHours = (value) => {
    const hours = Number(value || 0);

    return Number.isFinite(hours)
      ? hours.toFixed(2)
      : "0.00";
  };


  const formatList = (value) => {
    if (Array.isArray(value)) {
      return value.length > 0
        ? value.join(", ")
        : "Not provided";
    }

    return value || "Not provided";
  };


  const buildEventDateTime = (
    eventData,
    timeField
  ) => {
    if (
      !eventData?.date ||
      !eventData?.[timeField]
    ) {
      return null;
    }

    const dateValue = new Date(
      `${eventData.date}T${eventData[timeField]}:00`
    );

    return Number.isNaN(dateValue.getTime())
      ? null
      : dateValue;
  };


  // ========================================================
  // NO-SHOW GRACE PERIOD
  //
  // No-show is allowed 30 minutes after the event start.
  // Older events without time fields remain testable.
  // ========================================================

  const getNoShowEligibleTime = (eventData) => {
    const startDate =
      buildEventDateTime(eventData, "startTime") ||
      buildEventDateTime(eventData, "reportingTime");

    if (!startDate) {
      return null;
    }

    return new Date(
      startDate.getTime() +
      30 * 60 * 1000
    );
  };


  const canMarkNoShow = (eventData) => {
    const eligibleTime =
      getNoShowEligibleTime(eventData);

    return !eligibleTime ||
      new Date() >= eligibleTime;
  };


  // ========================================================
  // LOAD CONFIRMED PRIMARY VOLUNTEERS
  // ========================================================

  const loadVolunteers = async (eventId) => {
    setVolunteers([]);
    setSelectedEventData(null);

    if (!eventId) {
      return;
    }

    try {
      setLoadingVolunteers(true);
      setError("");

      const eventData =
        events.find(
          (event) =>
            event.id === eventId
        ) || null;

      setSelectedEventData(eventData);

      const requestSnapshot = await getDocs(
        query(
          collection(db, "joinRequests"),
          where("eventId", "==", eventId)
        )
      );

      const selectedRequests =
        requestSnapshot.docs
          .map((requestDocument) => ({
            id: requestDocument.id,
            ...requestDocument.data(),
          }))
          .filter((request) => {
            const primary =
              request.selectionType ===
                "primary" ||
              (
                !request.selectionType &&
                request.status ===
                  "approved"
              );

            const confirmed =
              request.confirmationStatus ===
                "confirmed" ||
              (
                !request.confirmationStatus &&
                request.status ===
                  "approved"
              );

            return primary && confirmed;
          });

      const attendanceSnapshot = await getDocs(
        query(
          collection(db, "attendance"),
          where("eventId", "==", eventId)
        )
      );

      const attendanceByVolunteerId = {};

      attendanceSnapshot.docs.forEach(
        (attendanceDocument) => {
          const attendance =
            attendanceDocument.data();

          attendanceByVolunteerId[
            attendance.volunteerId
          ] = {
            id:
              attendanceDocument.id,

            ...attendance,
          };
        }
      );

      const mergedVolunteers =
        selectedRequests.map(
          (request) => ({
            ...request,

            attendance:
              attendanceByVolunteerId[
                request.volunteerId
              ] || null,
          })
        );

      setVolunteers(
        mergedVolunteers
      );
    } catch (loadError) {
      console.error(
        "Attendance volunteers loading error:",
        loadError
      );

      setError(
        loadError?.message ||
          "Failed to load confirmed primary volunteers."
      );
    } finally {
      setLoadingVolunteers(false);
    }
  };


  // ========================================================
  // SEND VOLUNTEER NOTIFICATION
  // ========================================================

  const notifyVolunteer = async (
    volunteer,
    title,
    message,
    type,
    requiresAction = false
  ) => {
    await addDoc(
      collection(
        db,
        "notifications"
      ),
      {
        volunteerId:
          volunteer.volunteerId,

        eventId:
          volunteer.eventId,

        eventTitle:
          volunteer.eventTitle,

        title,
        message,
        type,

        category:
          requiresAction
            ? "action"
            : "information",

        requiresAction,

        actionRoute:
          "/my-applications",

        actionLabel:
          requiresAction
            ? "Open Attendance"
            : "View Event",

        isRead:
          false,

        createdAt:
          serverTimestamp(),
      }
    );
  };


  // ========================================================
  // VERIFY VOLUNTEER CHECK-IN
  // ========================================================

  const verifyCheckIn = async (
    volunteer
  ) => {
    if (!volunteer.attendance?.id) {
      alert(
        "No check-in record was found."
      );

      return;
    }

    try {
      setProcessingId(
        volunteer.id
      );

      await updateDoc(
        doc(
          db,
          "attendance",
          volunteer.attendance.id
        ),
        {
          checkInVerified:
            true,

          checkInVerifiedBy:
            currentUser.uid,

          checkInVerifiedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      await notifyVolunteer(
        volunteer,
        "Check-In Verified",
        `Your check-in for "${volunteer.eventTitle}" was verified by the organizer.`,
        "check-in-verified"
      );

      await loadVolunteers(
        selectedEvent
      );
    } catch (verifyError) {
      console.error(
        "Verify check-in error:",
        verifyError
      );

      alert(
        verifyError?.message ||
          "Unable to verify check-in."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // APPROVE EARLY CHECKOUT
  // ========================================================

  const approveEarlyCheckout = async (
    volunteer
  ) => {
    if (!volunteer.attendance?.id) {
      return;
    }

    try {
      setProcessingId(
        volunteer.id
      );

      await updateDoc(
        doc(
          db,
          "attendance",
          volunteer.attendance.id
        ),
        {
          earlyCheckoutStatus:
            "approved",

          earlyCheckoutApprovedBy:
            currentUser.uid,

          earlyCheckoutApprovedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      await notifyVolunteer(
        volunteer,
        "Early Checkout Approved",
        `Your early checkout request for "${volunteer.eventTitle}" was approved. You can now check out.`,
        "early-checkout-approved",
        true
      );

      await loadVolunteers(
        selectedEvent
      );
    } catch (approvalError) {
      console.error(
        "Approve early checkout error:",
        approvalError
      );

      alert(
        approvalError?.message ||
          "Unable to approve early checkout."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // REJECT EARLY CHECKOUT
  // ========================================================

  const rejectEarlyCheckout = async (
    volunteer
  ) => {
    if (!volunteer.attendance?.id) {
      return;
    }

    try {
      setProcessingId(
        volunteer.id
      );

      await updateDoc(
        doc(
          db,
          "attendance",
          volunteer.attendance.id
        ),
        {
          earlyCheckoutStatus:
            "rejected",

          earlyCheckoutRejectedBy:
            currentUser.uid,

          earlyCheckoutRejectedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      await notifyVolunteer(
        volunteer,
        "Early Checkout Rejected",
        `Your early checkout request for "${volunteer.eventTitle}" was rejected. Contact the organizer if needed.`,
        "early-checkout-rejected"
      );

      await loadVolunteers(
        selectedEvent
      );
    } catch (rejectionError) {
      console.error(
        "Reject early checkout error:",
        rejectionError
      );

      alert(
        rejectionError?.message ||
          "Unable to reject early checkout."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // ORGANIZER MANUAL CHECK-IN
  //
  // Use only when the volunteer is physically present but
  // cannot self check in because of phone/network problems.
  // ========================================================

  const manualCheckIn = async (volunteer) => {
    if (volunteer.attendance) {
      alert("An attendance record already exists.");
      return;
    }

    const confirmed = window.confirm(
      `Manually check in ${volunteer.volunteerName || "this volunteer"}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(volunteer.id);

      await addDoc(
        collection(db, "attendance"),
        {
          eventId: volunteer.eventId,
          eventTitle: volunteer.eventTitle,

          volunteerId: volunteer.volunteerId,
          volunteerName: volunteer.volunteerName,

          organizerId: currentUser.uid,
          joinRequestId: volunteer.id,

          attendanceStatus: "checked-in",

          checkInTime: serverTimestamp(),
          checkInBy: currentUser.uid,
          checkInMethod: "organizer-manual",

          checkInVerified: true,
          checkInVerifiedBy: currentUser.uid,
          checkInVerifiedAt: serverTimestamp(),

          checkOutTime: null,
          workedHours: 0,

          earlyCheckoutStatus: "not-requested",

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      await updateDoc(
        doc(db, "joinRequests", volunteer.id),
        {
          attendanceStatus: "checked-in",
          checkInCompleted: true,
          checkedInAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      await notifyVolunteer(
        volunteer,
        "Organizer Checked You In",
        `The organizer manually checked you in for "${volunteer.eventTitle}".`,
        "organizer-manual-check-in"
      );

      await loadVolunteers(selectedEvent);
    } catch (manualError) {
      console.error("Manual check-in error:", manualError);

      alert(
        manualError?.message ||
          "Unable to manually check in volunteer."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // MARK EXCUSED ABSENCE
  //
  // Use when the volunteer informed the organizer and had a
  // valid reason. This should not be treated as a no-show.
  // ========================================================

  const markExcusedAbsence = async (volunteer) => {
    const reason = window.prompt(
      "Enter the reason for excused absence:"
    );

    if (reason === null) {
      return;
    }

    if (!reason.trim()) {
      alert("Please enter a valid reason.");
      return;
    }

    try {
      setProcessingId(volunteer.id);

      if (volunteer.attendance?.id) {
        await updateDoc(
          doc(
            db,
            "attendance",
            volunteer.attendance.id
          ),
          {
            attendanceStatus: "excused-absence",
            absenceReason: reason.trim(),

            markedBy: currentUser.uid,
            markedAt: serverTimestamp(),

            updatedAt: serverTimestamp(),
          }
        );
      } else {
        await addDoc(
          collection(db, "attendance"),
          {
            eventId: volunteer.eventId,
            eventTitle: volunteer.eventTitle,

            volunteerId: volunteer.volunteerId,
            volunteerName: volunteer.volunteerName,

            organizerId: currentUser.uid,
            joinRequestId: volunteer.id,

            attendanceStatus: "excused-absence",
            absenceReason: reason.trim(),

            checkInTime: null,
            checkOutTime: null,
            workedHours: 0,

            markedBy: currentUser.uid,
            markedAt: serverTimestamp(),

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );
      }

      await updateDoc(
        doc(db, "joinRequests", volunteer.id),
        {
          attendanceStatus: "excused-absence",
          absenceReason: reason.trim(),
          updatedAt: serverTimestamp(),
        }
      );

      await notifyVolunteer(
        volunteer,
        "Absence Marked as Excused",
        `Your absence for "${volunteer.eventTitle}" was recorded as excused. Reason: ${reason.trim()}`,
        "excused-absence"
      );

      await loadVolunteers(selectedEvent);
    } catch (excusedError) {
      console.error(
        "Excused absence error:",
        excusedError
      );

      alert(
        excusedError?.message ||
          "Unable to mark excused absence."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // MARK NO-SHOW
  // ========================================================

  const markNoShow = async (
    volunteer
  ) => {
    if (!canMarkNoShow(selectedEventData)) {
      const eligibleTime =
        getNoShowEligibleTime(selectedEventData);

      alert(
        `No-show can be marked only after ${
          eligibleTime
            ? eligibleTime.toLocaleString()
            : "the grace period"
        }.`
      );

      return;
    }

    const reason = window.prompt(
      "Add a short note explaining the no-show:"
    );

    if (reason === null) {
      return;
    }

    const finalReason =
      reason.trim() ||
      "Volunteer did not arrive and gave no prior notice.";

    try {
      setProcessingId(
        volunteer.id
      );

      if (volunteer.attendance?.id) {
        await updateDoc(
          doc(
            db,
            "attendance",
            volunteer.attendance.id
          ),
          {
            attendanceStatus:
              "no-show",

            noShowReason:
              finalReason,

            markedNoShowBy:
              currentUser.uid,

            markedNoShowAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );
      } else {
        await addDoc(
          collection(
            db,
            "attendance"
          ),
          {
            eventId:
              volunteer.eventId,

            eventTitle:
              volunteer.eventTitle,

            volunteerId:
              volunteer.volunteerId,

            volunteerName:
              volunteer.volunteerName,

            organizerId:
              currentUser.uid,

            joinRequestId:
              volunteer.id,

            attendanceStatus:
              "no-show",

            noShowReason:
              finalReason,

            checkInTime:
              null,

            checkOutTime:
              null,

            workedHours:
              0,

            markedNoShowBy:
              currentUser.uid,

            markedNoShowAt:
              serverTimestamp(),

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );
      }

      await updateDoc(
        doc(
          db,
          "joinRequests",
          volunteer.id
        ),
        {
          attendanceStatus:
            "no-show",

          noShowReason:
            finalReason,

          noShowAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      await notifyVolunteer(
        volunteer,
        "Marked as No-Show",
        `You were marked as a no-show for "${volunteer.eventTitle}". Contact the organizer if this is incorrect.`,
        "no-show"
      );

      await loadVolunteers(
        selectedEvent
      );
    } catch (noShowError) {
      console.error(
        "Mark no-show error:",
        noShowError
      );

      alert(
        noShowError?.message ||
          "Unable to mark no-show."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // CORRECT MISSED CHECKOUT
  // ========================================================

  const correctMissedCheckout = async (
    volunteer
  ) => {
    if (
      !volunteer.attendance?.id ||
      !volunteer.attendance
        .checkInTime
    ) {
      alert(
        "A valid check-in record is required."
      );

      return;
    }

    const checkInDate =
      volunteer.attendance
        .checkInTime?.toDate
        ? volunteer.attendance.checkInTime.toDate()
        : new Date(
            volunteer.attendance.checkInTime
          );

    const eventEndDate =
      buildEventDateTime(
        selectedEventData,
        "endTime"
      ) || new Date();

    const suggestedHours =
      Math.max(
        0,
        (
          eventEndDate.getTime() -
          checkInDate.getTime()
        ) /
          (1000 * 60 * 60)
      ).toFixed(2);

    const enteredHours =
      window.prompt(
        "Enter verified worked hours:",
        suggestedHours
      );

    if (enteredHours === null) {
      return;
    }

    const workedHours =
      Number(enteredHours);

    if (
      !Number.isFinite(
        workedHours
      ) ||
      workedHours < 0
    ) {
      alert(
        "Enter valid worked hours."
      );

      return;
    }

    try {
      setProcessingId(
        volunteer.id
      );

      await updateDoc(
        doc(
          db,
          "attendance",
          volunteer.attendance.id
        ),
        {
          attendanceStatus:
            "completed",

          checkOutTime:
            serverTimestamp(),

          checkOutBy:
            currentUser.uid,

          checkOutMethod:
            "organizer-correction",

          workedHours,
          completedHours:
            workedHours,

          missedCheckoutCorrected:
            true,

          missedCheckoutCorrectedBy:
            currentUser.uid,

          missedCheckoutCorrectedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      await updateDoc(
        doc(
          db,
          "joinRequests",
          volunteer.id
        ),
        {
          attendanceStatus:
            "completed",

          checkOutCompleted:
            true,

          completedHours:
            workedHours,

          attendanceCompletedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      await notifyVolunteer(
        volunteer,
        "Missed Checkout Corrected",
        `The organizer corrected your missed checkout for "${volunteer.eventTitle}". ${workedHours} hours were recorded.`,
        "missed-checkout-corrected"
      );

      await loadVolunteers(
        selectedEvent
      );
    } catch (correctionError) {
      console.error(
        "Correct missed checkout error:",
        correctionError
      );

      alert(
        correctionError?.message ||
          "Unable to correct missed checkout."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // COUNTS
  // ========================================================

  const counts = useMemo(() => {
    return {
      total:
        volunteers.length,

      notStarted:
        volunteers.filter(
          (volunteer) =>
            !volunteer.attendance ||
            volunteer.attendance
              .attendanceStatus ===
              "not-started"
        ).length,

      checkedIn:
        volunteers.filter(
          (volunteer) =>
            volunteer.attendance
              ?.attendanceStatus ===
              "checked-in"
        ).length,

      completed:
        volunteers.filter(
          (volunteer) =>
            volunteer.attendance
              ?.attendanceStatus ===
              "completed"
        ).length,

      excused:
        volunteers.filter(
          (volunteer) =>
            volunteer.attendance
              ?.attendanceStatus ===
              "excused-absence"
        ).length,

      noShow:
        volunteers.filter(
          (volunteer) =>
            volunteer.attendance
              ?.attendanceStatus ===
              "no-show"
        ).length,
    };
  }, [volunteers]);


  // ========================================================
  // LOADING / ERROR
  // ========================================================

  if (!authReady || loading) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">
            ⏳
          </div>

          <h2>
            Loading Attendance
          </h2>
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
            Unable to Load Attendance
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
      <section className="page-card organizer-hero">
        <BackButton />

        <div>
          <p className="dashboard-eyebrow">
            Organizer Panel
          </p>

          <h1 className="page-title">
            Attendance Control
          </h1>

          <p className="page-subtitle">
            Monitor volunteer check-in and checkout, verify attendance,
            approve early checkout, and correct exceptions.
          </p>
        </div>

        <div className="organizer-status approved">
          ✅ Control Panel
        </div>
      </section>


      <section className="page-card attendance-selector-card">
        <label className="input-label">
          Select Event
        </label>

        <select
          className="modern-select"
          value={selectedEvent}
          onChange={(event) => {
            const eventId =
              event.target.value;

            setSelectedEvent(
              eventId
            );

            loadVolunteers(
              eventId
            );
          }}
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
            </option>
          ))}
        </select>
      </section>


      {selectedEvent && (
        <section className="dashboard-stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              👥
            </div>

            <div>
              <p>Expected</p>
              <h2>{counts.total}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              ⏳
            </div>

            <div>
              <p>Not Started</p>
              <h2>
                {counts.notStarted}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              🟢
            </div>

            <div>
              <p>Checked In</p>
              <h2>
                {counts.checkedIn}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              ✅
            </div>

            <div>
              <p>Completed</p>
              <h2>
                {counts.completed}
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
                {counts.excused}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              ❌
            </div>

            <div>
              <p>No-Show</p>
              <h2>
                {counts.noShow}
              </h2>
            </div>
          </div>
        </section>
      )}


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


      {!loadingVolunteers &&
        selectedEvent &&
        volunteers.length === 0 && (
          <div className="page-card empty-state">
            <div className="empty-icon">
              👥
            </div>

            <h2>
              No Confirmed Primary Volunteers
            </h2>
          </div>
        )}


      {!loadingVolunteers &&
        volunteers.map((volunteer) => {
          const attendance =
            volunteer.attendance;

          const attendanceStatus =
            attendance?.attendanceStatus ||
            "not-started";

          const isProcessing =
            processingId ===
            volunteer.id;

          return (
            <article
              key={volunteer.id}
              className="event-card attendance-card"
            >
              <div className="event-card-header">
                <div>
                  <p className="dashboard-eyebrow">
                    Confirmed Primary Volunteer
                  </p>

                  <h2 className="event-title">
                    {volunteer.volunteerName ||
                      "Volunteer"}
                  </h2>

                  <p className="event-description">
                    {volunteer.requestedRole ||
                      "Role not provided"}
                  </p>
                </div>

                {attendanceStatus ===
                  "completed" ? (
                  <span className="status-active">
                    Completed
                  </span>
                ) : attendanceStatus ===
                  "checked-in" ? (
                  <span className="event-type-badge paid">
                    Checked In
                  </span>
                ) : attendanceStatus ===
                  "no-show" ? (
                  <span className="status-completed">
                    No-Show
                  </span>
                ) : attendanceStatus ===
                  "excused-absence" ? (
                  <span className="event-type-badge certificate">
                    Excused Absence
                  </span>
                ) : (
                  <span className="event-type-badge volunteer">
                    Not Started
                  </span>
                )}
              </div>


              <div className="event-meta-grid">
                <div className="event-meta-item">
                  <span className="event-meta-icon">
                    ⭐
                  </span>

                  <div>
                    <small>
                      Rating
                    </small>

                    <strong>
                      {Number(
                        volunteer.rating ||
                          0
                      ).toFixed(1)}
                    </strong>
                  </div>
                </div>

                <div className="event-meta-item">
                  <span className="event-meta-icon">
                    🛠
                  </span>

                  <div>
                    <small>
                      Skills
                    </small>

                    <strong>
                      {formatList(
                        volunteer.skills
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
                        attendance?.checkInTime
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
                        attendance?.checkOutTime
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
                        attendance?.workedHours
                      )}
                      {" hrs"}
                    </strong>
                  </div>
                </div>

                <div className="event-meta-item">
                  <span className="event-meta-icon">
                    📌
                  </span>

                  <div>
                    <small>
                      Check-In Verification
                    </small>

                    <strong>
                      {attendance
                        ?.checkInVerified
                        ? "Verified"
                        : "Not Verified"}
                    </strong>
                  </div>
                </div>
              </div>


              {attendance
                ?.earlyCheckoutStatus &&
                attendance
                  .earlyCheckoutStatus !==
                  "not-requested" && (
                  <div className="event-card-section">
                    <h3>
                      Early Checkout
                    </h3>

                    <div className="event-benefits-row">
                      <span className="event-type-badge certificate">
                        {
                          attendance
                            .earlyCheckoutStatus
                        }
                      </span>
                    </div>

                    {attendance
                      .earlyCheckoutReason && (
                      <p className="event-description">
                        Reason:{" "}
                        {
                          attendance
                            .earlyCheckoutReason
                        }
                      </p>
                    )}
                  </div>
                )}


              {(attendance?.absenceReason ||
                attendance?.noShowReason) && (
                <div className="event-card-section">
                  <h3>Attendance Note</h3>

                  <p className="event-description">
                    {attendance.absenceReason ||
                      attendance.noShowReason}
                  </p>
                </div>
              )}

              <div className="event-action-buttons">
                {attendanceStatus ===
                  "checked-in" &&
                  !attendance
                    ?.checkInVerified && (
                    <button
                      type="button"
                      className="secondary-action-button"
                      onClick={() =>
                        verifyCheckIn(
                          volunteer
                        )
                      }
                      disabled={isProcessing}
                    >
                      ✅ Verify Check-In
                    </button>
                  )}

                {attendance
                  ?.earlyCheckoutStatus ===
                  "requested" && (
                    <>
                      <button
                        type="button"
                        className="primary-action-button"
                        onClick={() =>
                          approveEarlyCheckout(
                            volunteer
                          )
                        }
                        disabled={isProcessing}
                      >
                        ✅ Approve Early Checkout
                      </button>

                      <button
                        type="button"
                        className="delete-action-button"
                        onClick={() =>
                          rejectEarlyCheckout(
                            volunteer
                          )
                        }
                        disabled={isProcessing}
                      >
                        ❌ Reject Request
                      </button>
                    </>
                  )}

                {!attendance && (
                  <>
                    <button
                      type="button"
                      className="primary-action-button"
                      onClick={() =>
                        manualCheckIn(
                          volunteer
                        )
                      }
                      disabled={isProcessing}
                    >
                      ✅ Manual Check-In
                    </button>

                    <button
                      type="button"
                      className="secondary-action-button"
                      onClick={() =>
                        markExcusedAbsence(
                          volunteer
                        )
                      }
                      disabled={isProcessing}
                    >
                      🟡 Excused Absence
                    </button>

                    <button
                      type="button"
                      className="delete-action-button"
                      onClick={() =>
                        markNoShow(
                          volunteer
                        )
                      }
                      disabled={isProcessing}
                    >
                      ❌ Mark No-Show
                    </button>
                  </>
                )}

                {attendanceStatus ===
                  "checked-in" && (
                  <button
                    type="button"
                    className="secondary-action-button"
                    onClick={() =>
                      correctMissedCheckout(
                        volunteer
                      )
                    }
                    disabled={isProcessing}
                  >
                    🛠 Correct Missed Checkout
                  </button>
                )}
              </div>
            </article>
          );
        })}
    </div>
  );
}

export default Attendance;