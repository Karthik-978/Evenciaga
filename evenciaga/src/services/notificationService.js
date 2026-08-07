import {
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";

import {
  db
} from "../firebase";


/*
=========================================================
MAJOR EMAIL NOTIFICATION TYPES

Only these types are intended to trigger email.

Normal in-app notifications such as ordinary ratings,
general reminders, simple attendance updates, etc.
remain in-app only.
=========================================================
*/

export const EMAIL_NOTIFICATION_TYPES = [
  "organizer-approved",
  "organizer-rejected",

  "primary-selected",
  "standby-selected",

  "event-cancelled",
  "event-updated-important",

  "confirmation-required",

  "attendance-dispute",

  "certificate-issued",

  "payment-action-required",
  "payment-completed",

  "account-suspended",
  "account-restored",

  "emergency",
  "replacement-required"
];


/*
=========================================================
CHECK WHETHER EMAIL SHOULD BE SENT
=========================================================
*/

export const shouldSendEmail =
  (
    type
  ) => {
    return EMAIL_NOTIFICATION_TYPES.includes(
      String(
        type ||
        ""
      ).toLowerCase()
    );
  };


/*
=========================================================
CREATE NOTIFICATION

Use this function everywhere instead of manually
calling addDoc(collection(db, "notifications"), ...).

Example:

await createNotification({
  recipientId: volunteerId,
  recipientRole: "volunteer",
  type: "primary-selected",
  title: "You were selected",
  message: "You are a primary volunteer.",
  eventId: event.id,
  eventTitle: event.title,
  actionRoute: "/my-applications"
});
=========================================================
*/

export const createNotification =
  async ({
    recipientId,

    recipientRole = "volunteer",

    type = "general",

    title = "Evenciaga Notification",

    message = "",

    category = "information",

    actionRoute = "",

    actionLabel = "",

    eventId = "",

    eventTitle = "",

    volunteerId = "",

    organizerId = "",

    paymentId = "",

    reportId = "",

    requiresAction = false,

    metadata = {}
  }) => {

    if (!recipientId) {

      throw new Error(
        "Notification recipientId is required."
      );

    }


    const normalizedType =
      String(
        type ||
        "general"
      ).toLowerCase();


    const emailEnabled =
      shouldSendEmail(
        normalizedType
      );


    const notificationData = {

      recipientId,

      recipientRole,

      type:
        normalizedType,

      title,

      message,

      category,

      requiresAction,

      actionRoute,

      actionLabel,

      eventId,

      eventTitle,

      paymentId,

      reportId,

      isRead:
        false,

      emailEnabled,

      emailStatus:
        emailEnabled
          ? "pending"
          : "not-required",

      createdAt:
        serverTimestamp(),

      metadata
    };


    /*
    ------------------------------------------------------
    Backward compatibility with your existing project.

    Volunteer notification pages still query volunteerId.
    Organizer pages also query organizerId.

    So we continue storing those fields.
    ------------------------------------------------------
    */

    if (
      recipientRole ===
      "volunteer"
    ) {

      notificationData.volunteerId =
        volunteerId ||
        recipientId;

    }


    if (
      recipientRole ===
      "organizer"
    ) {

      notificationData.organizerId =
        organizerId ||
        recipientId;

    }


    return addDoc(
      collection(
        db,
        "notifications"
      ),
      notificationData
    );

  };