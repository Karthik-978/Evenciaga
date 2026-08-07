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
  where,
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
// INITIAL ANALYTICS
// ==========================================================

const INITIAL_ANALYTICS = {
  totalEvents: 0,
  activeEvents: 0,
  completedEvents: 0,
  cancelledEvents: 0,
  upcomingEvents: 0,

  totalApplications: 0,
  pendingApplications: 0,
  approvedApplications: 0,
  rejectedApplications: 0,
  primaryVolunteers: 0,
  standbyVolunteers: 0,

  completedAttendance: 0,
  noShows: 0,
  excusedAbsences: 0,
  attendanceRate: 0,

  averageRating: 0,

  paidEvents: 0,
  plannedPayments: 0,
  completedPayments: 0,
  pendingPayments: 0,

  certificatesIssued: 0,
  certificateEligible: 0,
  certificatesPending: 0,

  averageTrustScore: 0,
  highTrustVolunteers: 0,
  mediumTrustVolunteers: 0,
  lowTrustVolunteers: 0,
};


// ==========================================================
// ORGANIZER ANALYTICS COMPONENT
// ==========================================================

function OrganizerAnalytics() {
  // --------------------------------------------------------
  // AUTH STATE
  // --------------------------------------------------------

  const [currentUser, setCurrentUser] =
    useState(null);

  const [authReady, setAuthReady] =
    useState(false);


  // --------------------------------------------------------
  // DATA STATE
  // --------------------------------------------------------

  const [events, setEvents] =
    useState([]);

  const [requests, setRequests] =
    useState([]);

  const [attendance, setAttendance] =
    useState([]);

  const [ratings, setRatings] =
    useState([]);

  const [certificates, setCertificates] =
    useState([]);

  const [payments, setPayments] =
    useState([]);

  const [users, setUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // ========================================================
  // WAIT FOR AUTHENTICATION
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
  // LOAD ORGANIZER ANALYTICS DATA
  // ========================================================

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const loadAnalytics =
      async () => {
        if (!currentUser) {
          setError(
            "You must be logged in as an organizer."
          );

          setLoading(false);

          return;
        }

        try {
          setLoading(true);
          setError("");

          const eventsSnapshot =
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

          const organizerEvents =
            eventsSnapshot.docs.map(
              (eventDocument) => ({
                id:
                  eventDocument.id,

                ...eventDocument.data(),
              })
            );

          const eventIds =
            organizerEvents.map(
              (event) =>
                event.id
            );

          const [
            requestsSnapshot,
            attendanceSnapshot,
            ratingsSnapshot,
            certificatesSnapshot,
            paymentsSnapshot,
            usersSnapshot,
          ] = await Promise.all([
            getDocs(
              collection(
                db,
                "joinRequests"
              )
            ),

            getDocs(
              collection(
                db,
                "attendance"
              )
            ),

            getDocs(
              collection(
                db,
                "ratings"
              )
            ),

            getDocs(
              query(
                collection(
                  db,
                  "certificates"
                ),

                where(
                  "organizerId",
                  "==",
                  currentUser.uid
                )
              )
            ),

            getDocs(
              collection(
                db,
                "payments"
              )
            ),

            getDocs(
              collection(
                db,
                "users"
              )
            ),
          ]);

          const organizerRequests =
            requestsSnapshot.docs
              .map(
                (requestDocument) => ({
                  id:
                    requestDocument.id,

                  ...requestDocument.data(),
                })
              )
              .filter(
                (request) =>
                  eventIds.includes(
                    request.eventId
                  )
              );

          const organizerAttendance =
            attendanceSnapshot.docs
              .map(
                (
                  attendanceDocument
                ) => ({
                  id:
                    attendanceDocument.id,

                  ...attendanceDocument.data(),
                })
              )
              .filter(
                (record) =>
                  eventIds.includes(
                    record.eventId
                  )
              );

          const organizerRatings =
            ratingsSnapshot.docs
              .map(
                (ratingDocument) => ({
                  id:
                    ratingDocument.id,

                  ...ratingDocument.data(),
                })
              )
              .filter(
                (rating) =>
                  eventIds.includes(
                    rating.eventId
                  )
              );

          const organizerCertificates =
            certificatesSnapshot.docs.map(
              (
                certificateDocument
              ) => ({
                id:
                  certificateDocument.id,

                ...certificateDocument.data(),
              })
            );

          const organizerPayments =
            paymentsSnapshot.docs
              .map(
                (paymentDocument) => ({
                  id:
                    paymentDocument.id,

                  ...paymentDocument.data(),
                })
              )
              .filter(
                (payment) =>
                  eventIds.includes(
                    payment.eventId
                  )
              );

          const volunteerIds = [
            ...new Set(
              organizerRequests
                .map(
                  (request) =>
                    request.volunteerId
                )
                .filter(Boolean)
            ),
          ];

          const organizerVolunteers =
            usersSnapshot.docs
              .map(
                (userDocument) => ({
                  id:
                    userDocument.id,

                  ...userDocument.data(),
                })
              )
              .filter(
                (user) =>
                  volunteerIds.includes(
                    user.id
                  )
              );

          setEvents(
            organizerEvents
          );

          setRequests(
            organizerRequests
          );

          setAttendance(
            organizerAttendance
          );

          setRatings(
            organizerRatings
          );

          setCertificates(
            organizerCertificates
          );

          setPayments(
            organizerPayments
          );

          setUsers(
            organizerVolunteers
          );
        } catch (analyticsError) {
          console.error(
            "Organizer analytics error:",
            analyticsError
          );

          setError(
            analyticsError?.message ||
              "Unable to load organizer analytics."
          );
        } finally {
          setLoading(false);
        }
      };

    loadAnalytics();
  }, [authReady, currentUser]);


  // ========================================================
  // HELPERS
  // ========================================================

  const getAttendanceStatus = (
    record
  ) =>
    String(
      record.attendanceStatus ||
        record.status ||
        ""
    ).toLowerCase();


  const getRequestStatus = (
    request
  ) => {
    if (
      request.selectionType ===
        "primary" ||
      (
        !request.selectionType &&
        request.status ===
          "approved"
      )
    ) {
      return "primary";
    }

    if (
      request.selectionType ===
        "standby" ||
      request.status ===
        "standby"
    ) {
      return "standby";
    }

    if (
      request.applicationStatus ===
        "rejected" ||
      request.status ===
        "rejected"
    ) {
      return "rejected";
    }

    return "pending";
  };


  const formatCurrency = (
    value
  ) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;


  const formatPercent = (
    value
  ) =>
    `${Number(value || 0).toFixed(0)}%`;


  // ========================================================
  // CALCULATED ANALYTICS
  // ========================================================

  const analytics = useMemo(() => {
    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const activeEvents =
      events.filter(
        (event) =>
          event.status ===
          "active"
      );

    const completedEvents =
      events.filter(
        (event) =>
          event.status ===
          "completed"
      );

    const cancelledEvents =
      events.filter(
        (event) =>
          event.status ===
          "cancelled"
      );

    const upcomingEvents =
      events.filter(
        (event) => {
          const eventDate =
            new Date(
              event.date ||
                event.startDate ||
                0
            );

          return (
            !Number.isNaN(
              eventDate.getTime()
            ) &&
            eventDate >=
              today &&
            event.status !==
              "completed" &&
            event.status !==
              "cancelled"
          );
        }
      );

    const pendingApplications =
      requests.filter(
        (request) =>
          getRequestStatus(
            request
          ) === "pending"
      );

    const approvedApplications =
      requests.filter(
        (request) =>
          getRequestStatus(
            request
          ) === "primary"
      );

    const rejectedApplications =
      requests.filter(
        (request) =>
          getRequestStatus(
            request
          ) === "rejected"
      );

    const primaryVolunteers =
      requests.filter(
        (request) =>
          getRequestStatus(
            request
          ) === "primary"
      );

    const standbyVolunteers =
      requests.filter(
        (request) =>
          getRequestStatus(
            request
          ) === "standby"
      );

    const completedAttendance =
      attendance.filter(
        (record) => {
          const status =
            getAttendanceStatus(
              record
            );

          return (
            status ===
              "completed" ||
            status ===
              "present"
          );
        }
      );

    const noShows =
      attendance.filter(
        (record) =>
          getAttendanceStatus(
            record
          ) === "no-show"
      );

    const excusedAbsences =
      attendance.filter(
        (record) =>
          getAttendanceStatus(
            record
          ) ===
          "excused-absence"
      );

    const countableAttendance =
      completedAttendance.length +
      noShows.length;

    const attendanceRate =
      countableAttendance > 0
        ? (
            completedAttendance.length /
            countableAttendance
          ) *
          100
        : 0;

    const validRatings =
      ratings
        .map(
          (rating) =>
            Number(
              rating.rating ||
                0
            )
        )
        .filter(
          (rating) =>
            Number.isFinite(
              rating
            ) &&
            rating > 0
        );

    const averageRating =
      validRatings.length > 0
        ? validRatings.reduce(
            (
              total,
              rating
            ) =>
              total +
              rating,
            0
          ) /
          validRatings.length
        : 0;

    const paidEvents =
      events.filter(
        (event) =>
          event.eventType ===
          "paid"
      );

    const approvedCountByEvent =
      {};

    primaryVolunteers.forEach(
      (request) => {
        approvedCountByEvent[
          request.eventId
        ] =
          (
            approvedCountByEvent[
              request.eventId
            ] ||
            0
          ) +
          1;
      }
    );

    const plannedPayments =
      paidEvents.reduce(
        (
          total,
          event
        ) =>
          total +
          Number(
            event.paymentPerPerson ||
              0
          ) *
          Number(
            approvedCountByEvent[
              event.id
            ] ||
              0
          ),
        0
      );

    const completedPayments =
      payments
        .filter(
          (payment) =>
            payment.status ===
              "completed" ||
            payment.status ===
              "paid"
        )
        .reduce(
          (
            total,
            payment
          ) =>
            total +
            Number(
              payment.amount ||
                payment.paymentAmount ||
                0
            ),
          0
        );

    const pendingPayments =
      payments
        .filter(
          (payment) =>
            payment.status !==
              "completed" &&
            payment.status !==
              "paid"
        )
        .reduce(
          (
            total,
            payment
          ) =>
            total +
            Number(
              payment.amount ||
                payment.paymentAmount ||
                0
            ),
          0
        );

    const certificateEligible =
      completedAttendance.filter(
        (record) =>
          Number(
            record.workedHours ||
              record.completedHours ||
              record.hours ||
              0
          ) > 0
      );

    const certificatesPending =
      Math.max(
        0,
        certificateEligible.length -
          certificates.length
      );

    const trustScores =
      users
        .map(
          (user) =>
            Number(
              user.trustScore ||
                0
            )
        )
        .filter(
          (score) =>
            Number.isFinite(
              score
            )
        );

    const averageTrustScore =
      trustScores.length > 0
        ? trustScores.reduce(
            (
              total,
              score
            ) =>
              total +
              score,
            0
          ) /
          trustScores.length
        : 0;

    return {
      totalEvents:
        events.length,

      activeEvents:
        activeEvents.length,

      completedEvents:
        completedEvents.length,

      cancelledEvents:
        cancelledEvents.length,

      upcomingEvents:
        upcomingEvents.length,

      totalApplications:
        requests.length,

      pendingApplications:
        pendingApplications.length,

      approvedApplications:
        approvedApplications.length,

      rejectedApplications:
        rejectedApplications.length,

      primaryVolunteers:
        primaryVolunteers.length,

      standbyVolunteers:
        standbyVolunteers.length,

      completedAttendance:
        completedAttendance.length,

      noShows:
        noShows.length,

      excusedAbsences:
        excusedAbsences.length,

      attendanceRate,

      averageRating,

      paidEvents:
        paidEvents.length,

      plannedPayments,

      completedPayments,

      pendingPayments,

      certificatesIssued:
        certificates.length,

      certificateEligible:
        certificateEligible.length,

      certificatesPending,

      averageTrustScore,

      highTrustVolunteers:
        trustScores.filter(
          (score) =>
            score >= 90
        ).length,

      mediumTrustVolunteers:
        trustScores.filter(
          (score) =>
            score >= 70 &&
            score < 90
        ).length,

      lowTrustVolunteers:
        trustScores.filter(
          (score) =>
            score < 70
        ).length,
    };
  }, [
    events,
    requests,
    attendance,
    ratings,
    certificates,
    payments,
    users,
  ]);


  // ========================================================
  // EVENT PERFORMANCE
  // ========================================================

  const eventPerformance =
    useMemo(() => {
      return events
        .map((event) => {
          const eventRequests =
            requests.filter(
              (request) =>
                request.eventId ===
                event.id
            );

          const eventAttendance =
            attendance.filter(
              (record) =>
                record.eventId ===
                event.id
            );

          const eventRatings =
            ratings.filter(
              (rating) =>
                rating.eventId ===
                event.id
            );

          const eventCertificates =
            certificates.filter(
              (certificate) =>
                certificate.eventId ===
                event.id
            );

          const eventPayments =
            payments.filter(
              (payment) =>
                payment.eventId ===
                event.id
            );

          const approved =
            eventRequests.filter(
              (request) =>
                getRequestStatus(
                  request
                ) === "primary"
            );

          const present =
            eventAttendance.filter(
              (record) => {
                const status =
                  getAttendanceStatus(
                    record
                  );

                return (
                  status ===
                    "completed" ||
                  status ===
                    "present"
                );
              }
            );

          const absent =
            eventAttendance.filter(
              (record) =>
                getAttendanceStatus(
                  record
                ) === "no-show"
            );

          const countable =
            present.length +
            absent.length;

          const attendanceRate =
            countable > 0
              ? (
                  present.length /
                  countable
                ) *
                100
              : 0;

          const validRatings =
            eventRatings
              .map(
                (rating) =>
                  Number(
                    rating.rating ||
                      0
                  )
              )
              .filter(
                (rating) =>
                  rating > 0
              );

          const averageRating =
            validRatings.length > 0
              ? validRatings.reduce(
                  (
                    total,
                    rating
                  ) =>
                    total +
                    rating,
                  0
                ) /
                validRatings.length
              : 0;

          const paymentTotal =
            eventPayments.reduce(
              (
                total,
                payment
              ) =>
                total +
                Number(
                  payment.amount ||
                    payment.paymentAmount ||
                    0
                ),
              0
            );

          return {
            ...event,

            applications:
              eventRequests.length,

            approved:
              approved.length,

            present:
              present.length,

            absent:
              absent.length,

            attendanceRate,

            averageRating,

            certificates:
              eventCertificates.length,

            paymentTotal,
          };
        })
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
    }, [
      events,
      requests,
      attendance,
      ratings,
      certificates,
      payments,
    ]);


  // ========================================================
  // MONTHLY EVENT DATA
  // ========================================================

  const monthlyEvents =
    useMemo(() => {
      const monthMap = {};

      events.forEach(
        (event) => {
          const date =
            new Date(
              event.date ||
                event.startDate ||
                0
            );

          if (
            Number.isNaN(
              date.getTime()
            )
          ) {
            return;
          }

          const key =
            date.toLocaleString(
              "default",
              {
                month:
                  "short",
                year:
                  "2-digit",
              }
            );

          monthMap[key] =
            (
              monthMap[key] ||
              0
            ) +
            1;
        }
      );

      return Object.entries(
        monthMap
      ).map(
        (
          [
            label,
            value,
          ]
        ) => ({
          label,
          value,
        })
      );
    }, [events]);


  const maxMonthlyEvents =
    Math.max(
      1,
      ...monthlyEvents.map(
        (item) =>
          item.value
      )
    );


  // ========================================================
  // PRINT
  // ========================================================

  const printReport = () => {
    window.print();
  };


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
            📊
          </div>

          <h2>
            Loading Analytics
          </h2>

          <p>
            Calculating event, volunteer, payment, certificate,
            and reputation analytics.
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
            Unable to Load Analytics
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
          HEADER
      ==================================================== */}

      <section className="page-card organizer-hero">
        <BackButton />

        <div>
          <p className="dashboard-eyebrow">
            Organizer Workspace
          </p>

          <h1 className="page-title">
            Organizer Analytics
          </h1>

          <p className="page-subtitle">
            Review event performance, volunteer outcomes,
            attendance, payments, certificates, and trust data.
          </p>
        </div>

        <button
          type="button"
          className="primary-action-button"
          onClick={printReport}
        >
          🖨 Print Report
        </button>
      </section>


      {/* ====================================================
          EVENT ANALYTICS
      ==================================================== */}

      <section className="page-card">
        <h2 className="page-title">
          Event Analytics
        </h2>

        <div className="dashboard-stats-grid">
          <MetricCard
            icon="📅"
            label="Total Events"
            value={analytics.totalEvents}
          />

          <MetricCard
            icon="🟢"
            label="Active"
            value={analytics.activeEvents}
          />

          <MetricCard
            icon="✅"
            label="Completed"
            value={analytics.completedEvents}
          />

          <MetricCard
            icon="❌"
            label="Cancelled"
            value={analytics.cancelledEvents}
          />

          <MetricCard
            icon="⏳"
            label="Upcoming"
            value={analytics.upcomingEvents}
          />
        </div>
      </section>


      {/* ====================================================
          VOLUNTEER ANALYTICS
      ==================================================== */}

      <section className="page-card">
        <h2 className="page-title">
          Volunteer Analytics
        </h2>

        <div className="dashboard-stats-grid">
          <MetricCard
            icon="📩"
            label="Applications"
            value={analytics.totalApplications}
          />

          <MetricCard
            icon="⏳"
            label="Pending"
            value={analytics.pendingApplications}
          />

          <MetricCard
            icon="✅"
            label="Primary"
            value={analytics.primaryVolunteers}
          />

          <MetricCard
            icon="🧍"
            label="Standby"
            value={analytics.standbyVolunteers}
          />

          <MetricCard
            icon="❌"
            label="Rejected"
            value={analytics.rejectedApplications}
          />

          <MetricCard
            icon="📊"
            label="Attendance Rate"
            value={formatPercent(
              analytics.attendanceRate
            )}
          />

          <MetricCard
            icon="⭐"
            label="Average Rating"
            value={analytics.averageRating.toFixed(1)}
          />
        </div>
      </section>


      {/* ====================================================
          PAYMENT AND CERTIFICATE ANALYTICS
      ==================================================== */}

      <div className="organizer-dashboard-main-grid">
        <section className="page-card">
          <h2 className="page-title">
            Payment Analytics
          </h2>

          <div className="dashboard-stats-grid">
            <MetricCard
              icon="💰"
              label="Paid Events"
              value={analytics.paidEvents}
            />

            <MetricCard
              icon="🧾"
              label="Planned"
              value={formatCurrency(
                analytics.plannedPayments
              )}
            />

            <MetricCard
              icon="✅"
              label="Completed"
              value={formatCurrency(
                analytics.completedPayments
              )}
            />

            <MetricCard
              icon="⏳"
              label="Pending"
              value={formatCurrency(
                analytics.pendingPayments
              )}
            />
          </div>
        </section>

        <section className="page-card">
          <h2 className="page-title">
            Certificate Analytics
          </h2>

          <div className="dashboard-stats-grid">
            <MetricCard
              icon="🏆"
              label="Issued"
              value={analytics.certificatesIssued}
            />

            <MetricCard
              icon="✅"
              label="Eligible"
              value={analytics.certificateEligible}
            />

            <MetricCard
              icon="⏳"
              label="Pending"
              value={analytics.certificatesPending}
            />
          </div>
        </section>
      </div>


      {/* ====================================================
          TRUST ANALYTICS
      ==================================================== */}

      <section className="page-card">
        <h2 className="page-title">
          Trust Score Analytics
        </h2>

        <div className="dashboard-stats-grid">
          <MetricCard
            icon="🛡️"
            label="Average Trust"
            value={analytics.averageTrustScore.toFixed(1)}
          />

          <MetricCard
            icon="🌟"
            label="High Trust (90+)"
            value={analytics.highTrustVolunteers}
          />

          <MetricCard
            icon="✅"
            label="Medium Trust (70–89)"
            value={analytics.mediumTrustVolunteers}
          />

          <MetricCard
            icon="⚠️"
            label="Low Trust (<70)"
            value={analytics.lowTrustVolunteers}
          />
        </div>
      </section>


      {/* ====================================================
          SIMPLE EVENT CHART
      ==================================================== */}

      <section className="page-card">
        <h2 className="page-title">
          Events by Month
        </h2>

        {monthlyEvents.length === 0 ? (
          <div className="empty-state">
            <p>
              No dated events are available.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "14px",
            }}
          >
            {monthlyEvents.map(
              (item) => (
                <div
                  key={item.label}
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "90px 1fr 40px",

                    alignItems:
                      "center",

                    gap:
                      "12px",
                  }}
                >
                  <strong>
                    {item.label}
                  </strong>

                  <div
                    style={{
                      height:
                        "14px",

                      borderRadius:
                        "999px",

                      overflow:
                        "hidden",

                      background:
                        "#e9edf5",
                    }}
                  >
                    <div
                      style={{
                        height:
                          "100%",

                        width:
                          `${
                            (
                              item.value /
                              maxMonthlyEvents
                            ) *
                            100
                          }%`,

                        borderRadius:
                          "999px",

                        background:
                          "linear-gradient(90deg, #4f46e5, #0ea5e9)",
                      }}
                    />
                  </div>

                  <strong>
                    {item.value}
                  </strong>
                </div>
              )
            )}
          </div>
        )}
      </section>


      {/* ====================================================
          EVENT PERFORMANCE
      ==================================================== */}

      <section className="page-card">
        <h2 className="page-title">
          Event Performance
        </h2>

        {eventPerformance.length === 0 ? (
          <div className="empty-state">
            <p>
              No event performance data is available.
            </p>
          </div>
        ) : (
          <div
            style={{
              display:
                "grid",

              gap:
                "18px",
            }}
          >
            {eventPerformance.map(
              (event) => (
                <article
                  key={event.id}
                  className="event-card"
                >
                  <div className="event-card-header">
                    <div>
                      <p className="dashboard-eyebrow">
                        Event Performance
                      </p>

                      <h3 className="event-title">
                        {event.title ||
                          "Untitled Event"}
                      </h3>

                      <p className="event-description">
                        {event.location ||
                          "Location not available"}
                      </p>
                    </div>

                    <span className="event-type-badge volunteer">
                      {event.status ||
                        "active"}
                    </span>
                  </div>

                  <div className="event-meta-grid">
                    <PerformanceItem
                      label="Applications"
                      value={event.applications}
                    />

                    <PerformanceItem
                      label="Approved"
                      value={event.approved}
                    />

                    <PerformanceItem
                      label="Present"
                      value={event.present}
                    />

                    <PerformanceItem
                      label="No-Shows"
                      value={event.absent}
                    />

                    <PerformanceItem
                      label="Attendance"
                      value={formatPercent(
                        event.attendanceRate
                      )}
                    />

                    <PerformanceItem
                      label="Average Rating"
                      value={event.averageRating.toFixed(1)}
                    />

                    <PerformanceItem
                      label="Certificates"
                      value={event.certificates}
                    />

                    <PerformanceItem
                      label="Payments"
                      value={formatCurrency(
                        event.paymentTotal
                      )}
                    />
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}


// ==========================================================
// REUSABLE METRIC CARD
// ==========================================================

function MetricCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        {icon}
      </div>

      <div>
        <p>{label}</p>
        <h2>{value}</h2>
      </div>
    </div>
  );
}


// ==========================================================
// REUSABLE PERFORMANCE ITEM
// ==========================================================

function PerformanceItem({
  label,
  value,
}) {
  return (
    <div className="event-meta-item">
      <div>
        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  );
}

export default OrganizerAnalytics;