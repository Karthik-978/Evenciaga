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
  deleteDoc,
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


function Notifications() {
  const navigate =
    useNavigate();

  const [
    notifications,
    setNotifications
  ] =
    useState([]);

  const [
    currentUser,
    setCurrentUser
  ] =
    useState(null);

  const [
    loading,
    setLoading
  ] =
    useState(true);

  const [
    error,
    setError
  ] =
    useState("");

  const [
    activeFilter,
    setActiveFilter
  ] =
    useState("all");

  const [
    markingAll,
    setMarkingAll
  ] =
    useState(false);


  /* =====================================================
     AUTH
  ===================================================== */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!user) {
            setCurrentUser(null);

            setError(
              "You must be logged in to view notifications."
            );

            setLoading(false);

            return;
          }

          setCurrentUser(
            user
          );

          await loadNotifications(
            user.uid
          );
        }
      );

    return unsubscribe;
  }, []);


  /* =====================================================
     LOAD NOTIFICATIONS
  ===================================================== */

  const loadNotifications =
    async (
      volunteerId
    ) => {
      try {
        setLoading(true);
        setError("");

        /*
         * Older notifications use volunteerId.
         * New centralized notifications can use recipientId.
         *
         * We load both for compatibility with the complete project.
         */

        const volunteerQuery =
          query(
            collection(
              db,
              "notifications"
            ),
            where(
              "volunteerId",
              "==",
              volunteerId
            )
          );

        const recipientQuery =
          query(
            collection(
              db,
              "notifications"
            ),
            where(
              "recipientId",
              "==",
              volunteerId
            )
          );

        const [
          volunteerSnapshot,
          recipientSnapshot
        ] =
          await Promise.all([
            getDocs(
              volunteerQuery
            ),

            getDocs(
              recipientQuery
            )
          ]);

        const notificationMap =
          new Map();

        volunteerSnapshot.docs.forEach(
          (
            notificationDocument
          ) => {
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

        recipientSnapshot.docs.forEach(
          (
            notificationDocument
          ) => {
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

        const data =
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
          data
        );
      } catch (
        notificationError
      ) {
        console.error(
          "Volunteer notifications error:",
          notificationError
        );

        setError(
          notificationError?.message ||
            "Unable to load notifications."
        );
      } finally {
        setLoading(false);
      }
    };


  /* =====================================================
     TIMESTAMP
  ===================================================== */

  const getTimestampValue =
    (
      value
    ) => {
      if (!value) {
        return 0;
      }

      if (
        value?.toMillis
      ) {
        return value.toMillis();
      }

      if (
        value?.toDate
      ) {
        return value
          .toDate()
          .getTime();
      }

      const parsed =
        new Date(value);

      return Number.isNaN(
        parsed.getTime()
      )
        ? 0
        : parsed.getTime();
    };


  const formatNotificationDate =
    (
      value
    ) => {
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


  /* =====================================================
     IMPORTANT / ACTIONABLE TYPES
  ===================================================== */

  const MAJOR_ACTION_TYPES = [
    "primary-selected",
    "standby-selected",
    "organizer-approved",
    "organizer-rejected",
    "event-cancelled",
    "event-updated-important",
    "confirmation-required",
    "attendance-dispute",
    "payment-action-required",
    "account-suspended",
    "emergency",
    "replacement-required"
  ];


  const getCategory =
    (
      notification
    ) => {
      const type =
        String(
          notification.type ||
            ""
        ).toLowerCase();

      if (
        notification.category
      ) {
        return notification.category;
      }

      if (
        MAJOR_ACTION_TYPES.includes(
          type
        ) ||
        notification.requiresAction ===
          true
      ) {
        return "action";
      }

      const completedTypes = [
        "certificate",
        "certificate-issued",
        "payment",
        "payment-completed",
        "rating",
        "attendance",
        "organizer-approved"
      ];

      if (
        completedTypes.includes(
          type
        )
      ) {
        return "completed";
      }

      return "information";
    };


  /* =====================================================
     ICON
  ===================================================== */

  const getNotificationIcon =
    (
      notification
    ) => {
      const type =
        String(
          notification.type ||
            ""
        ).toLowerCase();

      const icons = {
        approval: "✅",

        "primary-selected":
          "✅",

        "standby-selected":
          "🧍",

        rejection:
          "❌",

        "organizer-approved":
          "🏢",

        "organizer-rejected":
          "❌",

        attendance:
          "📋",

        "attendance-dispute":
          "⚠️",

        rating:
          "⭐",

        certificate:
          "🏆",

        "certificate-issued":
          "🏆",

        payment:
          "💰",

        "payment-completed":
          "💵",

        "payment-action-required":
          "💳",

        "event-cancelled":
          "🚫",

        "event-updated-important":
          "📝",

        "confirmation-required":
          "📌",

        "account-suspended":
          "🚫",

        "account-restored":
          "✅",

        emergency:
          "🚨",

        "replacement-required":
          "👥",

        reminder:
          "⏰"
      };

      return (
        notification.icon ||
        icons[type] ||
        "🔔"
      );
    };


  /* =====================================================
     DEFAULT ROUTES
  ===================================================== */

  const getActionRoute =
    (
      notification
    ) => {
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
        approval:
          "/my-applications",

        "primary-selected":
          "/my-applications",

        "standby-selected":
          "/my-applications",

        rejection:
          "/my-applications",

        attendance:
          "/volunteer-history",

        "attendance-dispute":
          "/volunteer-history",

        rating:
          "/volunteer-history",

        certificate:
          "/certificates",

        "certificate-issued":
          "/certificates",

        payment:
          "/payment-history",

        "payment-completed":
          "/payment-history",

        "payment-action-required":
          "/payment-history",

        "organizer-approved":
          "/organizer-dashboard",

        "organizer-rejected":
          "/become-organizer",

        "event-cancelled":
          "/my-applications",

        "event-updated-important":
          "/my-applications",

        "confirmation-required":
          "/my-applications",

        emergency:
          "/dashboard",

        "replacement-required":
          "/dashboard"
      };

      return (
        routes[type] ||
        "/dashboard"
      );
    };


  /* =====================================================
     MARK READ
  ===================================================== */

  const markAsRead =
    async (
      notification
    ) => {
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
          "Mark notification read error:",
          readError
        );
      }
    };


  /* =====================================================
     MARK ALL READ
  ===================================================== */

  const markAllAsRead =
    async () => {
      const unread =
        notifications.filter(
          (
            notification
          ) =>
            !notification.isRead
        );

      if (
        unread.length ===
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

        unread.forEach(
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
          batchError
        );

        setError(
          "Unable to update notifications."
        );
      } finally {
        setMarkingAll(false);
      }
    };


  /* =====================================================
     DELETE
  ===================================================== */

  const deleteNotification =
    async (
      notification
    ) => {
      if (
        !currentUser
      ) {
        return;
      }

      const ownerId =
        notification.recipientId ||
        notification.volunteerId;

      if (
        ownerId &&
        ownerId !==
          currentUser.uid
      ) {
        alert(
          "You cannot delete this notification."
        );

        return;
      }

      const confirmed =
        window.confirm(
          "Delete this notification?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteDoc(
          doc(
            db,
            "notifications",
            notification.id
          )
        );

        setNotifications(
          (
            currentNotifications
          ) =>
            currentNotifications.filter(
              (
                currentNotification
              ) =>
                currentNotification.id !==
                notification.id
            )
        );
      } catch (
        deleteError
      ) {
        console.error(
          deleteError
        );

        alert(
          "Unable to delete notification."
        );
      }
    };


  /* =====================================================
     OPEN
  ===================================================== */

  const openNotification =
    async (
      notification
    ) => {
      await markAsRead(
        notification
      );

      navigate(
        getActionRoute(
          notification
        )
      );
    };


  /* =====================================================
     COUNTS
  ===================================================== */

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
      [notifications]
    );


  /* =====================================================
     FILTER
  ===================================================== */

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


  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">
            🔔
          </div>

          <h2>
            Loading Notifications
          </h2>

          <p>
            Checking your latest
            Evenciaga updates.
          </p>
        </div>
      </div>
    );
  }


  /* =====================================================
     ERROR
  ===================================================== */

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


  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div className="page-container">

      <section className="page-card organizer-hero">
        <BackButton />

        <div>
          <p className="dashboard-eyebrow">
            Volunteer Workspace
          </p>

          <h1 className="page-title">
            Notifications
          </h1>

          <p className="page-subtitle">
            Review important selections,
            event changes, attendance,
            certificates, payments and
            account updates.
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


      {/* SUMMARY */}

      <section className="dashboard-stats-grid">
        <NotificationStat
          icon="🔔"
          label="Total"
          value={
            counts.all
          }
        />

        <NotificationStat
          icon="🔴"
          label="Needs Action"
          value={
            counts.action
          }
        />

        <NotificationStat
          icon="🔵"
          label="Information"
          value={
            counts.information
          }
        />

        <NotificationStat
          icon="✅"
          label="Completed"
          value={
            counts.completed
          }
        />
      </section>


      {/* FILTERS */}

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


      {/* LIST */}

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

              const major =
                category ===
                "action";

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
                  <div className="notification-icon">
                    {getNotificationIcon(
                      notification
                    )}
                  </div>

                  <div className="notification-content">

                    <div className="notification-header">
                      <div>
                        {major && (
                          <p className="dashboard-eyebrow">
                            Action Required
                          </p>
                        )}

                        <h2>
                          {notification.title ||
                            "Notification"}
                        </h2>

                        <p>
                          {notification.message ||
                            "No message was provided."}
                        </p>
                      </div>

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

                    <div className="notification-meta">
                      <span>
                        📅{" "}
                        {formatNotificationDate(
                          notification.createdAt
                        )}
                      </span>

                      <span>
                        {major
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

                    <div className="event-action-buttons">

                      {(major ||
                        notification.actionRoute) && (
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
                      )}

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

                      <button
                        type="button"
                        className="delete-action-button"
                        onClick={() =>
                          deleteNotification(
                            notification
                          )
                        }
                      >
                        🗑 Delete
                      </button>

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
            No notifications are available
            in this category.
          </p>
        </div>
      )}

    </div>
  );
}


function NotificationStat({
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


export default Notifications;