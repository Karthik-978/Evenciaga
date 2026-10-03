// ==========================================================
// IMPORTS
// ==========================================================

import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";

import {
  onAuthStateChanged
} from "firebase/auth";

import {
  auth,
  db
} from "../firebase";

import BackButton from "../components/BackButton";


// ==========================================================
// ORGANIZER NOTIFICATIONS
// ==========================================================

function OrganizerNotifications() {

  const navigate = useNavigate();


  // ========================================================
  // STATE
  // ========================================================

  const [
    notifications,
    setNotifications
  ] = useState([]);

  const [
    activeFilter,
    setActiveFilter
  ] = useState("all");

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    error,
    setError
  ] = useState("");

  const [
    markingAll,
    setMarkingAll
  ] = useState(false);


  // ========================================================
  // AUTH + LOAD NOTIFICATIONS
  // ========================================================

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {

          if (!currentUser) {

            setError(
              "You must be logged in to view organizer notifications."
            );

            setLoading(false);

            return;
          }

          await loadNotifications(
            currentUser.uid
          );
        }
      );

    return unsubscribe;

  }, []);


  // ========================================================
  // LOAD NOTIFICATIONS
  // ========================================================

  const loadNotifications =
    async (organizerId) => {

      try {

        setLoading(true);
        setError("");


        // --------------------------------------------------
        // Notifications where organizerId matches
        // --------------------------------------------------

        const organizerQuery =
          query(
            collection(
              db,
              "notifications"
            ),
            where(
              "organizerId",
              "==",
              organizerId
            )
          );


        // --------------------------------------------------
        // Notifications where recipientId matches
        // --------------------------------------------------

        const recipientQuery =
          query(
            collection(
              db,
              "notifications"
            ),
            where(
              "recipientId",
              "==",
              organizerId
            )
          );


        // --------------------------------------------------
        // Load both queries
        // --------------------------------------------------

        const [
          organizerSnapshot,
          recipientSnapshot
        ] =
          await Promise.all([
            getDocs(
              organizerQuery
            ),

            getDocs(
              recipientQuery
            )
          ]);


        // --------------------------------------------------
        // Prevent duplicate notifications
        // --------------------------------------------------

        const notificationMap =
          new Map();


        // --------------------------------------------------
        // Organizer notifications
        // --------------------------------------------------

        organizerSnapshot.docs.forEach(
          (notificationDocument) => {

            notificationMap.set(
              notificationDocument.id,
              {
                id:
                  notificationDocument.id,

                ...notificationDocument.data()
              }
            );
          }
        );


        // --------------------------------------------------
        // Recipient notifications
        // --------------------------------------------------

        recipientSnapshot.docs.forEach(
          (notificationDocument) => {

            notificationMap.set(
              notificationDocument.id,
              {
                id:
                  notificationDocument.id,

                ...notificationDocument.data()
              }
            );
          }
        );


        // --------------------------------------------------
        // Sort newest first
        // --------------------------------------------------

        const notificationData =
          Array.from(
            notificationMap.values()
          ).sort(
            (
              first,
              second
            ) =>
              getTimestampValue(
                second.createdAt
              ) -
              getTimestampValue(
                first.createdAt
              )
          );


        setNotifications(
          notificationData
        );

      } catch (
        notificationError
      ) {

        console.error(
          "Organizer notifications error:",
          notificationError
        );

        setError(
          notificationError?.message ||
          "Unable to load organizer notifications."
        );

      } finally {

        setLoading(false);

      }
    };


  // ========================================================
  // TIMESTAMP HELPER
  // ========================================================

  const getTimestampValue =
    (value) => {

      if (!value) {
        return 0;
      }


      // Firebase Timestamp
      if (value?.toMillis) {
        return value.toMillis();
      }


      // Firebase Timestamp alternative
      if (value?.toDate) {

        return value
          .toDate()
          .getTime();
      }


      // Normal date/string
      const parsedDate =
        new Date(value);


      return Number.isNaN(
        parsedDate.getTime()
      )
        ? 0
        : parsedDate.getTime();
    };


  // ========================================================
  // FORMAT NOTIFICATION DATE
  // ========================================================

  const formatNotificationDate =
    (value) => {

      if (!value) {
        return "Date unavailable";
      }


      const date =
        value?.toDate
          ? value.toDate()
          : new Date(value);


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return "Date unavailable";
      }


      return date.toLocaleString(
        undefined,
        {
          dateStyle:
            "medium",

          timeStyle:
            "short"
        }
      );
    };


  // ========================================================
  // NOTIFICATION CATEGORY
  // ========================================================

  const getCategory =
    (notification) => {

      if (
        notification.category
      ) {

        return notification.category;
      }


      const type =
        String(
          notification.type ||
          ""
        ).toLowerCase();


      const status =
        String(
          notification.status ||
          ""
        ).toLowerCase();


      const actionTypes = [

        "new-request",

        "volunteer-request",

        "cancellation",

        "attendance-pending",

        "payment-pending",

        "checkout-request",

        "understaffed",

        "emergency",

        "confirmation",

        "replacement-required",

        "payment-action-required",

        "report-action-required",

        // Staffing
        "staffing_plan_ready",

        "staffing-plan-ready",

        "staffing_changes_requested",

        "staffing-changes-requested"

      ];


      const completedTypes = [

        "completed",

        "payment-completed",

        "certificate-issued",

        "event-completed",

        "resolved",

        "volunteer-confirmed",

        "attendance-completed"

      ];


      if (
        actionTypes.includes(
          type
        ) ||
        notification.requiresAction ===
          true
      ) {

        return "action";
      }


      if (
        completedTypes.includes(
          type
        ) ||
        status ===
          "completed" ||
        status ===
          "resolved"
      ) {

        return "completed";
      }


      return "information";
    };


  // ========================================================
  // NOTIFICATION ICON
  // ========================================================

  const getNotificationIcon =
    (notification) => {

      const type =
        String(
          notification.type ||
          ""
        ).toLowerCase();


      const icons = {

        "new-request":
          "📩",

        "volunteer-request":
          "📩",

        approval:
          "✅",

        rejection:
          "❌",

        cancellation:
          "⚠️",

        reminder:
          "⏰",

        "attendance-pending":
          "✅",

        attendance:
          "✅",

        "rating-pending":
          "⭐",

        rating:
          "⭐",

        certificate:
          "🏆",

        "certificate-issued":
          "🏆",

        "payment-pending":
          "💰",

        payment:
          "💰",

        "payment-completed":
          "💵",

        "payment-action-required":
          "💳",

        "checkout-request":
          "🚪",

        emergency:
          "🚨",

        understaffed:
          "👥",

        "replacement-required":
          "👥",

        confirmation:
          "📞",

        "volunteer-confirmed":
          "✅",

        "event-created":
          "📅",

        "event-updated":
          "📝",

        "event-completed":
          "🎉",

        "report-action-required":
          "🚩",

        resolved:
          "✅",

        // ------------------------------------------------
        // STAFFING ASSISTANCE
        // ------------------------------------------------

        "staffing_plan_ready":
          "👥",

        "staffing-plan-ready":
          "👥",

        "staffing_changes_requested":
          "🔄",

        "staffing-changes-requested":
          "🔄"

      };


      return (
        notification.icon ||
        icons[type] ||
        "🔔"
      );
    };


  // ========================================================
  // ROUTES
  // ========================================================

  const getActionRoute =
    (notification) => {


      // ----------------------------------------------------
      // If notification explicitly provides a route,
      // use it first.
      // ----------------------------------------------------

      if (
        notification.actionRoute
      ) {

        return notification.actionRoute;
      }


      const type =
        String(
          notification.type ||
          ""
        ).toLowerCase();


      const routes = {

        // --------------------------------------------------
        // NORMAL ORGANIZER NOTIFICATIONS
        // --------------------------------------------------

        "new-request":
          "/event-requests",

        "volunteer-request":
          "/event-requests",

        cancellation:
          "/approved-volunteers",

        "attendance-pending":
          "/attendance",

        attendance:
          "/attendance",

        "rating-pending":
          "/ratings",

        rating:
          "/ratings",

        "certificate-issued":
          "/issue-certificates",

        certificate:
          "/issue-certificates",

        "payment-pending":
          "/payment-management",

        payment:
          "/payment-management",

        "payment-completed":
          "/payment-history",

        "payment-action-required":
          "/payment-management",

        "checkout-request":
          "/attendance",

        emergency:
          "/approved-volunteers",

        understaffed:
          "/approved-volunteers",

        "replacement-required":
          "/approved-volunteers",

        confirmation:
          "/event-requests",

        "volunteer-confirmed":
          "/approved-volunteers",

        "event-created":
          "/my-events",

        "event-updated":
          "/my-events",

        "event-completed":
          "/my-events",

        "report-action-required":
          "/reports",

        resolved:
          "/reports",


        // ==================================================
        // STAFFING ASSISTANCE
        // ==================================================

        // Admin has prepared the staffing plan.
        // Organizer must review it.
        "staffing_plan_ready":
          "/organizer/staffing-plans",

        // Support hyphenated version too.
        "staffing-plan-ready":
          "/organizer/staffing-plans",

        // Admin has requested changes / organizer
        // needs to review the staffing plan again.
        "staffing_changes_requested":
          "/organizer/staffing-plans",

        // Support hyphenated version too.
        "staffing-changes-requested":
          "/organizer/staffing-plans"

      };


      // ----------------------------------------------------
      // IMPORTANT:
      //
      // If the notification type isn't recognised,
      // keep the old default behavior.
      // ----------------------------------------------------

      return (
        routes[type] ||
        "/organizer-dashboard"
      );
    };


  // ========================================================
  // MARK NOTIFICATION AS READ
  // ========================================================

  const markAsRead =
    async (notification) => {

      if (
        notification.isRead
      ) {

        return;
      }


      try {

        await updateDoc(
          doc(
            db,
            "notifications",
            notification.id
          ),
          {

            isRead:
              true,

            readAt:
              serverTimestamp()

          }
        );


        // --------------------------------------------------
        // Update UI immediately
        // --------------------------------------------------

        setNotifications(
          (
            currentNotifications
          ) =>
            currentNotifications.map(
              (
                currentNotification
              ) =>
                currentNotification.id ===
                notification.id

                  ? {
                      ...currentNotification,

                      isRead:
                        true
                    }

                  : currentNotification
            )
        );

      } catch (
        readError
      ) {

        console.error(
          "Unable to mark notification as read:",
          readError
        );
      }
    };


  // ========================================================
  // MARK ALL AS READ
  // ========================================================

  const markAllAsRead =
    async () => {

      const unreadNotifications =
        notifications.filter(
          (
            notification
          ) =>
            !notification.isRead
        );


      if (
        unreadNotifications.length ===
        0
      ) {

        return;
      }


      try {

        setMarkingAll(true);


        const batch =
          writeBatch(
            db
          );


        unreadNotifications.forEach(
          (
            notification
          ) => {

            batch.update(
              doc(
                db,
                "notifications",
                notification.id
              ),
              {

                isRead:
                  true,

                readAt:
                  serverTimestamp()

              }
            );

          }
        );


        await batch.commit();


        setNotifications(
          (
            currentNotifications
          ) =>
            currentNotifications.map(
              (
                notification
              ) => ({

                ...notification,

                isRead:
                  true

              })
            )
        );

      } catch (
        batchError
      ) {

        console.error(
          "Unable to mark all notifications as read:",
          batchError
        );

        setError(
          "Unable to update notifications."
        );

      } finally {

        setMarkingAll(false);

      }
    };


  // ========================================================
  // OPEN NOTIFICATION
  // ========================================================

  const openNotification =
    async (notification) => {

      // ----------------------------------------------------
      // First mark notification as read
      // ----------------------------------------------------

      await markAsRead(
        notification
      );


      // ----------------------------------------------------
      // Then navigate to the correct page
      //
      // Staffing notification:
      //
      // staffing_plan_ready
      //        ↓
      // /organizer/staffing-plans
      // ----------------------------------------------------

      const destination =
        getActionRoute(
          notification
        );


      navigate(
        destination
      );
    };


  // ========================================================
  // FILTER
  // ========================================================

  const filteredNotifications =
    useMemo(
      () => {

        if (
          activeFilter ===
          "all"
        ) {

          return notifications;
        }


        return notifications.filter(
          (
            notification
          ) =>
            getCategory(
              notification
            ) ===
            activeFilter
        );

      },
      [
        notifications,
        activeFilter
      ]
    );


  // ========================================================
  // COUNTS
  // ========================================================

  const counts =
    useMemo(
      () => {

        return {

          all:
            notifications.length,

          unread:
            notifications.filter(
              (
                notification
              ) =>
                !notification.isRead
            ).length,

          action:
            notifications.filter(
              (
                notification
              ) =>
                getCategory(
                  notification
                ) ===
                "action"
            ).length,

          information:
            notifications.filter(
              (
                notification
              ) =>
                getCategory(
                  notification
                ) ===
                "information"
            ).length,

          completed:
            notifications.filter(
              (
                notification
              ) =>
                getCategory(
                  notification
                ) ===
                "completed"
            ).length

        };

      },
      [
        notifications
      ]
    );


  // ========================================================
  // LOADING
  // ========================================================

  if (loading) {

    return (

      <div className="page-container">

        <div className="page-card empty-state">

          <div className="empty-icon">
            🔔
          </div>

          <h2>
            Loading Organizer Notifications
          </h2>

          <p>
            Checking event activity
            and actions requiring your
            attention.
          </p>

        </div>

      </div>
    );
  }


  // ========================================================
  // ERROR
  // ========================================================

  if (error) {

    return (

      <div className="page-container">

        <BackButton />

        <div className="page-card empty-state">

          <div className="empty-icon">
            ⚠️
          </div>

          <h2>
            Unable to Load Notifications
          </h2>

          <p>
            {error}
          </p>

        </div>

      </div>
    );
  }


  // ========================================================
  // PAGE
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
            Notifications
          </h1>

          <p className="page-subtitle">
            Review volunteer activity,
            urgent event alerts,
            confirmations, payments and
            other actions requiring organizer attention.
          </p>

        </div>


        <div
          className={
            counts.unread > 0
              ? "organizer-status pending"
              : "organizer-status approved"
          }
        >

          {counts.unread > 0
            ? `🔔 ${counts.unread} Unread`
            : "✓ All Read"}

        </div>

      </section>


      {/* ====================================================
          SUMMARY
      ==================================================== */}

      <section className="dashboard-stats-grid">

        <OrganizerNotificationStat
          icon="🔔"
          label="Total"
          value={
            counts.all
          }
        />

        <OrganizerNotificationStat
          icon="🔴"
          label="Needs Action"
          value={
            counts.action
          }
        />

        <OrganizerNotificationStat
          icon="🔵"
          label="Information"
          value={
            counts.information
          }
        />

        <OrganizerNotificationStat
          icon="✅"
          label="Completed"
          value={
            counts.completed
          }
        />

      </section>


      {/* ====================================================
          FILTERS
      ==================================================== */}

      <section
        className="page-card"
        style={{
          padding:
            "20px",

          marginTop:
            "22px",

          marginBottom:
            "22px"
        }}
      >

        <div
          style={{
            display:
              "flex",

            justifyContent:
              "space-between",

            alignItems:
              "center",

            flexWrap:
              "wrap",

            gap:
              "14px"
          }}
        >

          <div
            style={{
              display:
                "flex",

              flexWrap:
                "wrap",

              gap:
                "10px"
            }}
          >

            {[
              {
                key:
                  "all",

                label:
                  `All (${counts.all})`
              },

              {
                key:
                  "action",

                label:
                  `Needs Action (${counts.action})`
              },

              {
                key:
                  "information",

                label:
                  `Information (${counts.information})`
              },

              {
                key:
                  "completed",

                label:
                  `Completed (${counts.completed})`
              }

            ].map(
              (
                filter
              ) => (

                <button
                  type="button"
                  key={
                    filter.key
                  }

                  className={
                    activeFilter ===
                    filter.key

                      ? "primary-action-button"

                      : "secondary-action-button"
                  }

                  onClick={() =>
                    setActiveFilter(
                      filter.key
                    )
                  }
                >

                  {filter.label}

                </button>

              )
            )}

          </div>


          {/* MARK ALL READ */}

          <button
            type="button"
            className="secondary-action-button"

            onClick={
              markAllAsRead
            }

            disabled={
              markingAll ||
              counts.unread ===
                0
            }
          >

            {markingAll
              ? "Updating..."
              : "✓ Mark All Read"}

          </button>

        </div>

      </section>


      {/* ====================================================
          NOTIFICATION LIST
      ==================================================== */}

      {filteredNotifications.length >
      0 ? (

        <div className="notifications-list">

          {filteredNotifications.map(
            (
              notification
            ) => {

              const category =
                getCategory(
                  notification
                );


              return (

                <article
                  key={
                    notification.id
                  }

                  className={`notification-card ${
                    notification.isRead
                      ? "read"
                      : "unread"
                  }`}
                >

                  {/* ----------------------------------------
                      ICON
                  ---------------------------------------- */}

                  <div className="notification-icon">

                    {getNotificationIcon(
                      notification
                    )}

                  </div>


                  {/* ----------------------------------------
                      CONTENT
                  ---------------------------------------- */}

                  <div className="notification-content">

                    <div className="notification-header">

                      <div>

                        {category ===
                          "action" && (

                          <p className="dashboard-eyebrow">
                            Action Required
                          </p>

                        )}


                        <h2>

                          {notification.title ||
                            "Organizer Notification"}

                        </h2>


                        <p>

                          {notification.message ||
                            "No message was provided."}

                        </p>

                      </div>


                      {/* STATUS */}

                      <span
                        className={`notification-status ${
                          notification.isRead
                            ? "read"
                            : "unread"
                        }`}
                      >

                        {notification.isRead
                          ? "Read"
                          : "New"}

                      </span>

                    </div>


                    {/* --------------------------------------
                        META
                    -------------------------------------- */}

                    <div className="notification-meta">

                      <span>

                        📅{" "}

                        {formatNotificationDate(
                          notification.createdAt
                        )}

                      </span>


                      <span>

                        {category ===
                        "action"

                          ? "🔴 Needs Action"

                          : category ===
                            "completed"

                            ? "✅ Completed"

                            : "🔵 Information"}

                      </span>


                      {notification.eventTitle && (

                        <span>

                          🎯{" "}

                          {
                            notification.eventTitle
                          }

                        </span>

                      )}

                    </div>


                    {/* --------------------------------------
                        ACTION BUTTONS
                    -------------------------------------- */}

                    <div className="event-action-buttons">

                      <button
                        type="button"

                        className="primary-action-button"

                        onClick={() =>
                          openNotification(
                            notification
                          )
                        }
                      >

                        {notification.actionLabel ||
                          "Open"}

                      </button>


                      {!notification.isRead && (

                        <button
                          type="button"

                          className="secondary-action-button"

                          onClick={() =>
                            markAsRead(
                              notification
                            )
                          }
                        >

                          Mark as Read

                        </button>

                      )}

                    </div>

                  </div>

                </article>

              );

            }
          )}

        </div>

      ) : (

        <div className="page-card empty-state">

          <div className="empty-icon">
            🔔
          </div>

          <h2>
            No Notifications Found
          </h2>

          <p>
            There are no organizer
            notifications in this
            category.
          </p>

        </div>

      )}

    </div>
  );
}


// ==========================================================
// NOTIFICATION STAT CARD
// ==========================================================

function OrganizerNotificationStat({
  icon,
  label,
  value
}) {

  return (

    <div className="stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div>

        <p>
          {label}
        </p>

        <h2>
          {value}
        </h2>

      </div>

    </div>
  );
}


// ==========================================================
// EXPORT
// ==========================================================

export default OrganizerNotifications;