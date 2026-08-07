// ==========================================================
// REACT IMPORTS
// ==========================================================

import { useEffect, useMemo, useState } from "react";


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import {
  addDoc,
  collection,
  doc,
  getDoc,
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
// MY APPLICATIONS COMPONENT
// Volunteer owns normal check-in and checkout.
// Organizer only monitors, verifies, and handles exceptions.
// ==========================================================

function MyApplications() {
  // --------------------------------------------------------
  // PAGE STATE
  // --------------------------------------------------------

  const [applications, setApplications] = useState([]);
  const [eventsById, setEventsById] = useState({});
  const [attendanceByEventId, setAttendanceByEventId] =
    useState({});

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");


  // ========================================================
  // LOAD APPLICATIONS, EVENTS, AND ATTENDANCE
  // ========================================================

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError("");

      const currentUser = auth.currentUser;

      if (!currentUser) {
        setError("You must be logged in to view applications.");
        return;
      }

      // ----------------------------------------------------
      // LOAD VOLUNTEER APPLICATIONS
      // ----------------------------------------------------

      const applicationsSnapshot = await getDocs(
        query(
          collection(db, "joinRequests"),
          where("volunteerId", "==", currentUser.uid)
        )
      );

      const applicationData = applicationsSnapshot.docs
        .map((applicationDocument) => ({
          id: applicationDocument.id,
          ...applicationDocument.data(),
        }))
        .sort((firstApplication, secondApplication) => {
          const firstTime =
            firstApplication.requestedAt?.toMillis?.() || 0;

          const secondTime =
            secondApplication.requestedAt?.toMillis?.() || 0;

          return secondTime - firstTime;
        });

      setApplications(applicationData);

      // ----------------------------------------------------
      // LOAD EVENT DETAILS
      // ----------------------------------------------------

      const uniqueEventIds = [
        ...new Set(
          applicationData
            .map((application) => application.eventId)
            .filter(Boolean)
        ),
      ];

      const eventEntries = await Promise.all(
        uniqueEventIds.map(async (eventId) => {
          const eventSnapshot = await getDoc(
            doc(db, "events", eventId)
          );

          return [
            eventId,
            eventSnapshot.exists()
              ? {
                  id: eventSnapshot.id,
                  ...eventSnapshot.data(),
                }
              : null,
          ];
        })
      );

      setEventsById(Object.fromEntries(eventEntries));

      // ----------------------------------------------------
      // LOAD VOLUNTEER ATTENDANCE RECORDS
      // ----------------------------------------------------

      const attendanceSnapshot = await getDocs(
        query(
          collection(db, "attendance"),
          where("volunteerId", "==", currentUser.uid)
        )
      );

      const attendanceMap = {};

      attendanceSnapshot.docs.forEach((attendanceDocument) => {
        const attendance = attendanceDocument.data();

        attendanceMap[attendance.eventId] = {
          id: attendanceDocument.id,
          ...attendance,
        };
      });

      setAttendanceByEventId(attendanceMap);
    } catch (loadError) {
      console.error("My applications load error:", loadError);

      setError(
        loadError?.message ||
          "Unable to load applications."
      );
    } finally {
      setLoading(false);
    }
  };


  // ========================================================
  // INITIAL LOAD
  // ========================================================

  useEffect(() => {
    fetchApplications();
  }, []);


  // ========================================================
  // APPLICATION COUNTS
  // ========================================================

  const counts = useMemo(() => {
    return {
      total: applications.length,

      pending: applications.filter(
        (application) =>
          application.applicationStatus === "pending" ||
          (
            !application.applicationStatus &&
            application.status === "pending"
          )
      ).length,

      primary: applications.filter(
        (application) =>
          application.selectionType === "primary" ||
          (
            !application.selectionType &&
            application.status === "approved"
          )
      ).length,

      standby: applications.filter(
        (application) =>
          application.selectionType === "standby" ||
          application.status === "standby"
      ).length,

      rejected: applications.filter(
        (application) =>
          application.applicationStatus === "rejected" ||
          application.status === "rejected"
      ).length,

      emergencyRequests: applications.filter(
        (application) =>
          application.replacementRequestStatus === "pending"
      ).length,
    };
  }, [applications]);


  // ========================================================
  // FORMAT HELPERS
  // ========================================================

  const formatList = (value) => {
    if (Array.isArray(value)) {
      return value.length > 0
        ? value.join(", ")
        : "Not provided";
    }

    return value || "Not provided";
  };


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


  const formatTime = (value) => {
    if (!value) {
      return "--";
    }

    const parsedDate = value?.toDate
      ? value.toDate()
      : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
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


  // ========================================================
  // EVENT TIME HELPERS
  // ========================================================

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


  const canCheckIn = (eventData) => {
    if (!eventData) {
      return false;
    }

    // Older test events may not have reportingTime.
    const reportingDate = buildEventDateTime(
      eventData,
      "reportingTime"
    );

    if (!reportingDate) {
      return true;
    }

    return new Date() >= reportingDate;
  };


  const canNormalCheckout = (eventData) => {
    if (eventData?.status === "completed") {
      return true;
    }

    const endDate = buildEventDateTime(
      eventData,
      "endTime"
    );

    // Older test events may not have endTime.
    if (!endDate) {
      return true;
    }

    return new Date() >= endDate;
  };


  // ========================================================
  // GET DISPLAY STATUS
  // ========================================================

  const getDisplayStatus = (application) => {
    if (
      application.status === "cancelled" ||
      application.applicationStatus === "cancelled" ||
      application.selectionType === "replaced"
    ) {
      return "replaced";
    }

    if (
      application.selectionType === "primary" ||
      (
        !application.selectionType &&
        application.status === "approved"
      )
    ) {
      return "primary";
    }

    if (
      application.selectionType === "standby" ||
      application.status === "standby"
    ) {
      return "standby";
    }

    if (
      application.applicationStatus === "rejected" ||
      application.status === "rejected"
    ) {
      return "rejected";
    }

    return "pending";
  };


  // ========================================================
  // GET ORGANIZER ID
  // ========================================================

  const getOrganizerId = (application) => {
    return (
      application.organizerId ||
      eventsById[application.eventId]?.organizerId ||
      ""
    );
  };


  // ========================================================
  // SEND ORGANIZER NOTIFICATION
  // ========================================================

  const notifyOrganizer = async (
    application,
    title,
    message,
    type,
    requiresAction = false,
    actionLabel = "View Application",
    actionRoute = "/attendance"
  ) => {
    const organizerId =
      getOrganizerId(application);

    if (!organizerId) {
      return;
    }

    await addDoc(
      collection(db, "notifications"),
      {
        organizerId,

        eventId: application.eventId,
        eventTitle: application.eventTitle,

        volunteerId: application.volunteerId,
        volunteerName: application.volunteerName,

        title,
        message,
        type,

        category: requiresAction
          ? "action"
          : "information",

        requiresAction,

        actionRoute,
        actionLabel,

        isRead: false,
        createdAt: serverTimestamp(),
      }
    );
  };


  // ========================================================
  // CONFIRM ATTENDANCE
  // ========================================================

  const confirmAttendance = async (application) => {
    try {
      setProcessingId(application.id);

      await updateDoc(
        doc(db, "joinRequests", application.id),
        {
          confirmationStatus: "confirmed",
          confirmedAt: serverTimestamp(),

          declinedAt: null,
          declineReason: "",

          updatedAt: serverTimestamp(),
        }
      );

      await notifyOrganizer(
        application,
        "Volunteer Confirmed Attendance",
        `${application.volunteerName || "A volunteer"} confirmed attendance for "${application.eventTitle}".`,
        "attendance-confirmed"
      );

      alert("Attendance confirmed successfully.");

      await fetchApplications();
    } catch (confirmationError) {
      console.error(
        "Confirm attendance error:",
        confirmationError
      );

      alert(
        confirmationError?.message ||
          "Unable to confirm attendance."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // DECLINE ATTENDANCE
  // ========================================================

  const declineAttendance = async (application) => {
    const reason = window.prompt(
      "Why are you unable to attend?"
    );

    if (reason === null) {
      return;
    }

    if (!reason.trim()) {
      alert("Please provide a reason.");
      return;
    }

    try {
      setProcessingId(application.id);

      await updateDoc(
        doc(db, "joinRequests", application.id),
        {
          confirmationStatus: "declined",
          declinedAt: serverTimestamp(),
          declineReason: reason.trim(),

          confirmedAt: null,
          updatedAt: serverTimestamp(),
        }
      );

      await notifyOrganizer(
        application,
        "Volunteer Declined Attendance",
        `${application.volunteerName || "A volunteer"} cannot attend "${application.eventTitle}". Reason: ${reason.trim()}`,
        "attendance-declined",
        true,
        "Find Replacement"
      );

      alert("Organizer has been informed.");

      await fetchApplications();
    } catch (declineError) {
      console.error(
        "Decline attendance error:",
        declineError
      );

      alert(
        declineError?.message ||
          "Unable to decline attendance."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // REQUEST ORGANIZER CALLBACK
  // ========================================================

  const requestCallback = async (application) => {
    try {
      setProcessingId(application.id);

      await updateDoc(
        doc(db, "joinRequests", application.id),
        {
          confirmationStatus: "callback-requested",
          callbackRequestedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      await notifyOrganizer(
        application,
        "Volunteer Requested Callback",
        `${application.volunteerName || "A volunteer"} requested a callback regarding "${application.eventTitle}".`,
        "callback-requested",
        true,
        "Review Callback"
      );

      alert("Callback request sent.");

      await fetchApplications();
    } catch (callbackError) {
      console.error(
        "Callback request error:",
        callbackError
      );

      alert(
        callbackError?.message ||
          "Unable to request callback."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // REPORT EMERGENCY AFTER CONFIRMING ATTENDANCE
  // ========================================================

  const reportEmergency = async (application) => {
    const reason = window.prompt(
      "Briefly explain the emergency that prevents you from attending:"
    );

    if (reason === null) {
      return;
    }

    if (!reason.trim()) {
      alert("Please provide an emergency reason.");
      return;
    }

    const confirmed = window.confirm(
      "Report this as an emergency? The organizer will be asked to arrange a replacement volunteer."
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(application.id);

      await updateDoc(
        doc(db, "joinRequests", application.id),
        {
          confirmationStatus: "emergency-reported",
          emergencyStatus: "reported",
          emergencyReason: reason.trim(),
          emergencyReportedAt: serverTimestamp(),
          replacementRequestStatus: "not-requested",
          updatedAt: serverTimestamp(),
        }
      );

      await notifyOrganizer(
        application,
        "Emergency Replacement Required",
        `${application.volunteerName || "A volunteer"} reported an emergency for "${application.eventTitle}". Reason: ${reason.trim()}`,
        "emergency",
        true,
        "Find Emergency Replacement",
        "/approved-volunteers"
      );

      alert(
        "Emergency reported. The organizer has been asked to arrange a replacement."
      );

      await fetchApplications();
    } catch (emergencyError) {
      console.error(
        "Report emergency error:",
        emergencyError
      );

      alert(
        emergencyError?.message ||
          "Unable to report the emergency."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // ACCEPT EMERGENCY REPLACEMENT REQUEST
  // The standby volunteer becomes primary only after
  // explicitly accepting the emergency request.
  // ========================================================

  const acceptEmergencyReplacement =
    async (application) => {
      try {
        setProcessingId(application.id);

        const eventData =
          eventsById[application.eventId];

        if (eventData?.status === "completed") {
          alert("This event has already been completed.");
          return;
        }

        if (
          application.replacementRequestStatus !==
          "pending"
        ) {
          alert("This emergency request is no longer pending.");
          return;
        }

        const originalJoinRequestId =
          application.replacementForJoinRequestId;

        if (!originalJoinRequestId) {
          alert(
            "The original volunteer record for this emergency could not be found."
          );
          return;
        }

        const originalSnapshot = await getDoc(
          doc(db, "joinRequests", originalJoinRequestId)
        );

        if (!originalSnapshot.exists()) {
          alert("The original volunteer record no longer exists.");
          return;
        }

        const originalVolunteer = originalSnapshot.data();

        if (
          originalVolunteer.emergencyStatus === "resolved" ||
          originalVolunteer.status === "cancelled"
        ) {
          alert(
            "This emergency has already been resolved by another volunteer."
          );

          await updateDoc(
            doc(db, "joinRequests", application.id),
            {
              replacementRequestStatus: "expired",
              emergencyStatus: "expired",
              updatedAt: serverTimestamp(),
            }
          );

          await fetchApplications();
          return;
        }

        await updateDoc(
          doc(db, "joinRequests", application.id),
          {
            status: "approved",
            applicationStatus: "selected",
            selectionType: "primary",
            standbyPosition: null,

            confirmationStatus: "confirmed",
            confirmedAt: serverTimestamp(),

            emergencyStatus: "replacement-accepted",
            emergencyReplacement: true,
            replacementRequestStatus: "accepted",
            replacementRespondedAt: serverTimestamp(),
            promotedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        await updateDoc(
          doc(db, "joinRequests", originalJoinRequestId),
          {
            status: "cancelled",
            applicationStatus: "cancelled",
            selectionType: "replaced",
            emergencyStatus: "resolved",
            replacedByVolunteerId: application.volunteerId,
            replacedByVolunteerName:
              application.volunteerName || "Volunteer",
            replacedByJoinRequestId: application.id,
            emergencyResolvedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        await notifyOrganizer(
          application,
          "Emergency Replacement Accepted",
          `${application.volunteerName || "A standby volunteer"} accepted the emergency replacement request for "${application.eventTitle}" and has been promoted to primary.`,
          "emergency-replacement-accepted",
          false,
          "View Volunteers",
          "/approved-volunteers"
        );

        await addDoc(
          collection(db, "notifications"),
          {
            volunteerId: originalVolunteer.volunteerId,
            recipientId: originalVolunteer.volunteerId,
            recipientRole: "volunteer",
            organizerId: getOrganizerId(application),

            eventId: application.eventId,
            eventTitle: application.eventTitle,

            title: "Emergency Replacement Arranged",
            message: `A replacement volunteer has been arranged for "${application.eventTitle}". Your emergency report has been resolved.`,
            type: "emergency-resolved",
            category: "information",
            requiresAction: false,
            actionRoute: "/my-applications",
            actionLabel: "View Application",
            isRead: false,
            createdAt: serverTimestamp(),
          }
        );

        alert(
          "Emergency replacement accepted. You are now a primary volunteer for this event."
        );

        await fetchApplications();
      } catch (acceptError) {
        console.error(
          "Accept emergency replacement error:",
          acceptError
        );

        alert(
          acceptError?.message ||
            "Unable to accept the emergency replacement request."
        );
      } finally {
        setProcessingId("");
      }
    };


  // ========================================================
  // DECLINE EMERGENCY REPLACEMENT REQUEST
  // ========================================================

  const declineEmergencyReplacement =
    async (application) => {
      const reason = window.prompt(
        "Why are you unable to take this emergency replacement?"
      );

      if (reason === null) {
        return;
      }

      try {
        setProcessingId(application.id);

        await updateDoc(
          doc(db, "joinRequests", application.id),
          {
            replacementRequestStatus: "declined",
            emergencyStatus: "replacement-declined",
            replacementDeclineReason: reason.trim(),
            replacementRespondedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        await notifyOrganizer(
          application,
          "Emergency Replacement Declined",
          `${application.volunteerName || "A standby volunteer"} declined the emergency replacement request for "${application.eventTitle}"${
            reason.trim() ? `: ${reason.trim()}` : "."
          }`,
          "emergency-replacement-declined",
          true,
          "Request Next Replacement",
          "/approved-volunteers"
        );

        alert(
          "Emergency replacement declined. The organizer has been informed."
        );

        await fetchApplications();
      } catch (declineError) {
        console.error(
          "Decline emergency replacement error:",
          declineError
        );

        alert(
          declineError?.message ||
            "Unable to decline the emergency replacement request."
        );
      } finally {
        setProcessingId("");
      }
    };


  // ========================================================
  // VOLUNTEER SELF CHECK-IN
  // ========================================================

  const checkInVolunteer = async (
    application,
    eventData
  ) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("Please log in again.");
      return;
    }

    if (!canCheckIn(eventData)) {
      const reportingDate = buildEventDateTime(
        eventData,
        "reportingTime"
      );

      alert(
        `Check-in opens at ${
          reportingDate
            ? reportingDate.toLocaleString()
            : "the reporting time"
        }.`
      );

      return;
    }

    const existingAttendance =
      attendanceByEventId[
        application.eventId
      ];

    if (existingAttendance) {
      alert(
        "An attendance record already exists for this event."
      );

      return;
    }

    try {
      setProcessingId(application.id);

      await addDoc(
        collection(db, "attendance"),
        {
          eventId: application.eventId,
          eventTitle:
            application.eventTitle ||
            eventData?.title ||
            "",

          volunteerId: currentUser.uid,
          volunteerName:
            application.volunteerName ||
            "",

          organizerId:
            getOrganizerId(application),

          joinRequestId:
            application.id,

          attendanceStatus:
            "checked-in",

          checkInTime:
            serverTimestamp(),

          checkInBy:
            currentUser.uid,

          checkInMethod:
            "volunteer-self",

          checkInVerified:
            false,

          checkOutTime:
            null,

          workedHours:
            0,

          earlyCheckoutStatus:
            "not-requested",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      await updateDoc(
        doc(
          db,
          "joinRequests",
          application.id
        ),
        {
          attendanceStatus:
            "checked-in",

          checkInCompleted:
            true,

          checkedInAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      await notifyOrganizer(
        application,
        "Volunteer Checked In",
        `${application.volunteerName || "A volunteer"} checked in for "${application.eventTitle}".`,
        "volunteer-checked-in",
        true,
        "Verify Check-In"
      );

      alert("Check-in completed successfully.");

      await fetchApplications();
    } catch (checkInError) {
      console.error(
        "Volunteer check-in error:",
        checkInError
      );

      alert(
        checkInError?.message ||
          "Unable to check in."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // REQUEST EARLY CHECKOUT
  // ========================================================

  const requestEarlyCheckout = async (
    application,
    attendance
  ) => {
    if (!attendance?.id) {
      alert(
        "You must check in before requesting early checkout."
      );

      return;
    }

    const reason = window.prompt(
      "Enter the reason for early checkout:"
    );

    if (reason === null) {
      return;
    }

    if (!reason.trim()) {
      alert("Please provide a reason.");
      return;
    }

    try {
      setProcessingId(application.id);

      await updateDoc(
        doc(
          db,
          "attendance",
          attendance.id
        ),
        {
          earlyCheckoutStatus:
            "requested",

          earlyCheckoutReason:
            reason.trim(),

          earlyCheckoutRequestedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      await notifyOrganizer(
        application,
        "Early Checkout Requested",
        `${application.volunteerName || "A volunteer"} requested early checkout from "${application.eventTitle}". Reason: ${reason.trim()}`,
        "early-checkout-requested",
        true,
        "Review Request"
      );

      alert(
        "Early checkout request sent to the organizer."
      );

      await fetchApplications();
    } catch (requestError) {
      console.error(
        "Early checkout request error:",
        requestError
      );

      alert(
        requestError?.message ||
          "Unable to request early checkout."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // VOLUNTEER SELF CHECKOUT
  // ========================================================

  const checkOutVolunteer = async (
    application,
    eventData,
    attendance
  ) => {
    if (
      !attendance?.id ||
      attendance.attendanceStatus !==
        "checked-in"
    ) {
      alert(
        "You must check in before checkout."
      );

      return;
    }

    const earlyCheckoutApproved =
      attendance.earlyCheckoutStatus ===
      "approved";

    if (
      !canNormalCheckout(eventData) &&
      !earlyCheckoutApproved
    ) {
      alert(
        "Checkout is available after the event ends. Request early checkout if you must leave now."
      );

      return;
    }

    try {
      setProcessingId(application.id);

      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        alert("Please log in again.");
        return;
      }

      const checkInDate =
        attendance.checkInTime?.toDate
          ? attendance.checkInTime.toDate()
          : new Date(
              attendance.checkInTime
            );

      if (
        Number.isNaN(
          checkInDate.getTime()
        )
      ) {
        alert(
          "Stored check-in time is invalid."
        );

        return;
      }

      const checkOutDate =
        new Date();

      const workedHours =
        Number(
          Math.max(
            0,
            (
              checkOutDate.getTime() -
              checkInDate.getTime()
            ) /
              (1000 * 60 * 60)
          ).toFixed(2)
        );

      await updateDoc(
        doc(
          db,
          "attendance",
          attendance.id
        ),
        {
          attendanceStatus:
            "completed",

          checkOutTime:
            serverTimestamp(),

          checkOutBy:
            currentUser.uid,

          checkOutMethod:
            earlyCheckoutApproved
              ? "volunteer-early-approved"
              : "volunteer-self",

          workedHours,

          completedHours:
            workedHours,

          completedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      await updateDoc(
        doc(
          db,
          "joinRequests",
          application.id
        ),
        {
          attendanceStatus:
            "completed",

          checkOutCompleted:
            true,

          checkedOutAt:
            serverTimestamp(),

          completedHours:
            workedHours,

          attendanceCompletedAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),
        }
      );

      await notifyOrganizer(
        application,
        "Volunteer Checked Out",
        `${application.volunteerName || "A volunteer"} checked out from "${application.eventTitle}" after ${workedHours} hours.`,
        "volunteer-checked-out"
      );

      alert(
        `Checkout completed. ${workedHours} hours recorded.`
      );

      await fetchApplications();
    } catch (checkOutError) {
      console.error(
        "Volunteer checkout error:",
        checkOutError
      );

      alert(
        checkOutError?.message ||
          "Unable to check out."
      );
    } finally {
      setProcessingId("");
    }
  };


  // ========================================================
  // LOADING / ERROR
  // ========================================================

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">
            📄
          </div>

          <h2>
            Loading Applications
          </h2>

          <p>
            Fetching your applications and attendance.
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
            Unable to Load Applications
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
            Volunteer Workspace
          </p>

          <h1 className="page-title">
            My Applications
          </h1>

          <p className="page-subtitle">
            Confirm attendance, check in, request early checkout,
            and check out after the event.
          </p>
        </div>

        <div className="organizer-status approved">
          📄 {counts.total} Applications
        </div>
      </section>


      <section className="dashboard-stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            📄
          </div>

          <div>
            <p>Total</p>
            <h2>{counts.total}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            ⏳
          </div>

          <div>
            <p>Pending</p>
            <h2>{counts.pending}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            ✅
          </div>

          <div>
            <p>Primary</p>
            <h2>{counts.primary}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            🧍
          </div>

          <div>
            <p>Standby</p>
            <h2>{counts.standby}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            ❌
          </div>

          <div>
            <p>Rejected</p>
            <h2>{counts.rejected}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚨</div>

          <div>
            <p>Emergency Requests</p>
            <h2>{counts.emergencyRequests}</h2>
          </div>
        </div>
      </section>


      {applications.length === 0 && (
        <div className="page-card empty-state">
          <div className="empty-icon">
            📄
          </div>

          <h2>
            No Applications Found
          </h2>

          <p>
            Apply for an event from the volunteer dashboard.
          </p>
        </div>
      )}


      {applications.map((application) => {
        const status =
          getDisplayStatus(application);

        const eventData =
          eventsById[
            application.eventId
          ];

        const attendance =
          attendanceByEventId[
            application.eventId
          ];

        const isProcessing =
          processingId ===
          application.id;

        const confirmationStatus =
          application.confirmationStatus ||
          (
            status === "primary"
              ? "pending"
              : "not-requested"
          );

        const attendanceStatus =
          attendance?.attendanceStatus ||
          application.attendanceStatus ||
          "not-started";

        const isPrimaryConfirmed =
          status === "primary" &&
          confirmationStatus ===
            "confirmed";

        return (
          <article
            key={application.id}
            className="event-card"
          >
            <div className="event-card-header">
              <div>
                <p className="dashboard-eyebrow">
                  Volunteer Application
                </p>

                <h2 className="event-title">
                  {application.eventTitle ||
                    eventData?.title ||
                    "Untitled Event"}
                </h2>

                <p className="event-description">
                  Applied for{" "}
                  {application.requestedRole ||
                    "an available role"}
                </p>
              </div>

              {status === "primary" ? (
                <span className="status-active">
                  Primary
                </span>
              ) : status === "standby" ? (
                <span className="event-type-badge certificate">
                  Standby #
                  {application.standbyPosition ||
                    "-"}
                </span>
              ) : status === "rejected" ? (
                <span className="status-completed">
                  Rejected
                </span>
              ) : status === "replaced" ? (
                <span className="status-completed">
                  Replaced After Emergency
                </span>
              ) : (
                <span className="event-type-badge volunteer">
                  Pending
                </span>
              )}
            </div>


            <div className="event-meta-grid">
              <div className="event-meta-item">
                <span className="event-meta-icon">
                  🎯
                </span>

                <div>
                  <small>
                    Requested Role
                  </small>

                  <strong>
                    {application.requestedRole ||
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
                    {formatDate(
                      eventData?.date
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
                    {eventData?.location ||
                      "Not available"}
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
            </div>


            {status === "standby" &&
              application.replacementRequestStatus === "pending" && (
                <div className="event-card-section">
                  <h3>🚨 Emergency Replacement Request</h3>

                  <p className="event-description">
                    The organizer urgently needs a replacement for
                    {" "}
                    <strong>{application.eventTitle}</strong>.
                    You are being asked because you are already on the
                    standby list for this event.
                  </p>

                  {application.replacementForVolunteerName && (
                    <p className="event-description">
                      Replacing: {application.replacementForVolunteerName}
                    </p>
                  )}

                  <div className="event-action-buttons">
                    <button
                      type="button"
                      className="primary-action-button"
                      onClick={() =>
                        acceptEmergencyReplacement(application)
                      }
                      disabled={isProcessing}
                    >
                      {isProcessing
                        ? "Processing..."
                        : "🚨 Accept Emergency Replacement"}
                    </button>

                    <button
                      type="button"
                      className="delete-action-button"
                      onClick={() =>
                        declineEmergencyReplacement(application)
                      }
                      disabled={isProcessing}
                    >
                      Decline Request
                    </button>
                  </div>
                </div>
              )}


            {status === "primary" && (
              <div className="event-card-section">
                <h3>
                  Attendance Confirmation
                </h3>

                <div className="event-benefits-row">
                  {confirmationStatus ===
                  "confirmed" ? (
                    <span className="event-type-badge paid">
                      ✓ Attendance Confirmed
                    </span>
                  ) : confirmationStatus ===
                    "declined" ? (
                    <span className="status-completed">
                      Attendance Declined
                    </span>
                  ) : confirmationStatus ===
                    "callback-requested" ? (
                    <span className="event-type-badge certificate">
                      Callback Requested
                    </span>
                  ) : confirmationStatus ===
                    "emergency-reported" ? (
                    <span className="status-completed">
                      🚨 Emergency Reported
                    </span>
                  ) : (
                    <span className="event-type-badge volunteer">
                      Waiting for Confirmation
                    </span>
                  )}
                </div>
              </div>
            )}


            {status === "primary" &&
              confirmationStatus === "emergency-reported" && (
                <div className="event-card-section">
                  <h3>🚨 Emergency Reported</h3>

                  <p className="event-description">
                    {application.emergencyReason ||
                      "You reported that you can no longer attend this event."}
                  </p>

                  <div className="event-benefits-row">
                    <span className="status-completed">
                      {application.emergencyStatus === "replacement-requested"
                        ? "Replacement request sent"
                        : application.emergencyStatus === "resolved"
                          ? "Replacement arranged"
                          : "Waiting for organizer"}
                    </span>
                  </div>
                </div>
              )}


            {isPrimaryConfirmed && (
              <div className="event-card-section">
                <h3>
                  Event Attendance
                </h3>

                <div className="event-benefits-row">
                  <span className="event-type-badge volunteer">
                    Status: {attendanceStatus}
                  </span>

                  {attendance?.earlyCheckoutStatus ===
                    "requested" && (
                    <span className="event-type-badge certificate">
                      Early Checkout Pending
                    </span>
                  )}

                  {attendance?.earlyCheckoutStatus ===
                    "approved" && (
                    <span className="event-type-badge paid">
                      Early Checkout Approved
                    </span>
                  )}

                  {attendance?.earlyCheckoutStatus ===
                    "rejected" && (
                    <span className="status-completed">
                      Early Checkout Rejected
                    </span>
                  )}
                </div>
              </div>
            )}


            {status === "primary" &&
              confirmationStatus !==
                "confirmed" &&
              confirmationStatus !==
                "declined" &&
              confirmationStatus !==
                "emergency-reported" && (
                <div className="event-action-buttons">
                  <button
                    type="button"
                    className="primary-action-button"
                    onClick={() =>
                      confirmAttendance(
                        application
                      )
                    }
                    disabled={isProcessing}
                  >
                    {isProcessing
                      ? "Updating..."
                      : "✅ I Will Attend"}
                  </button>

                  <button
                    type="button"
                    className="secondary-action-button"
                    onClick={() =>
                      requestCallback(
                        application
                      )
                    }
                    disabled={isProcessing}
                  >
                    📞 Need Callback
                  </button>

                  <button
                    type="button"
                    className="delete-action-button"
                    onClick={() =>
                      declineAttendance(
                        application
                      )
                    }
                    disabled={isProcessing}
                  >
                    ❌ Cannot Attend
                  </button>
                </div>
              )}


            {isPrimaryConfirmed && (
              <div className="event-action-buttons">
                {attendanceStatus === "not-started" &&
                  application.emergencyStatus !== "reported" &&
                  application.emergencyStatus !== "replacement-requested" && (
                    <button
                      type="button"
                      className="delete-action-button"
                      onClick={() =>
                        reportEmergency(application)
                      }
                      disabled={isProcessing}
                    >
                      🚨 Report Emergency
                    </button>
                  )}

                {attendanceStatus ===
                  "not-started" && (
                  <button
                    type="button"
                    className="primary-action-button"
                    onClick={() =>
                      checkInVolunteer(
                        application,
                        eventData
                      )
                    }
                    disabled={isProcessing}
                  >
                    {isProcessing
                      ? "Checking In..."
                      : "✅ Check In"}
                  </button>
                )}

                {attendanceStatus ===
                  "checked-in" &&
                  (
                    canNormalCheckout(
                      eventData
                    ) ||
                    attendance
                      ?.earlyCheckoutStatus ===
                      "approved"
                  ) && (
                    <button
                      type="button"
                      className="primary-action-button"
                      onClick={() =>
                        checkOutVolunteer(
                          application,
                          eventData,
                          attendance
                        )
                      }
                      disabled={isProcessing}
                    >
                      {isProcessing
                        ? "Checking Out..."
                        : "🚪 Check Out"}
                    </button>
                  )}

                {attendanceStatus ===
                  "checked-in" &&
                  !canNormalCheckout(
                    eventData
                  ) &&
                  attendance
                    ?.earlyCheckoutStatus !==
                    "approved" &&
                  attendance
                    ?.earlyCheckoutStatus !==
                    "requested" && (
                    <button
                      type="button"
                      className="secondary-action-button"
                      onClick={() =>
                        requestEarlyCheckout(
                          application,
                          attendance
                        )
                      }
                      disabled={isProcessing}
                    >
                      🕒 Request Early Checkout
                    </button>
                  )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default MyApplications;