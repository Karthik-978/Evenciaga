// ==========================================================
// REACT IMPORTS
// ==========================================================

import { useEffect, useState } from "react";


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { auth, db } from "../../firebase";


// ==========================================================
// EVENT APPLICATION MODAL
// ==========================================================

function EventApplicationModal({
  event,
  userData,
  onClose,
  onSuccess,
}) {
  // --------------------------------------------------------
  // FORM STATE
  // --------------------------------------------------------

  const [requestedRole, setRequestedRole] =
    useState("");

  const [availabilityType, setAvailabilityType] =
    useState("full");

  const [applicationNote, setApplicationNote] =
    useState("");

  const [suitabilityReason, setSuitabilityReason] =
    useState("");

  const [emergencyContact, setEmergencyContact] =
    useState("");

  const [attendanceConfirmed, setAttendanceConfirmed] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");


  // --------------------------------------------------------
  // DEFAULT ROLE
  // --------------------------------------------------------

  useEffect(() => {
    if (
      Array.isArray(event?.availableRoles) &&
      event.availableRoles.length > 0
    ) {
      setRequestedRole(
        event.availableRoles[0]
      );
    }
  }, [event]);


  // --------------------------------------------------------
  // SUBMIT APPLICATION
  // --------------------------------------------------------

  const handleSubmit = async (
    submitEvent
  ) => {
    submitEvent.preventDefault();

    setMessage("");

    const currentUser =
      auth.currentUser;

    if (
      !currentUser ||
      !userData
    ) {
      setMessage(
        "Please log in again."
      );

      return;
    }

    if (!requestedRole) {
      setMessage(
        "Please select a role."
      );

      return;
    }

    if (!attendanceConfirmed) {
      setMessage(
        "You must confirm attendance before applying."
      );

      return;
    }

    try {
      setLoading(true);

      // ----------------------------------------------------
      // PREVENT DUPLICATE APPLICATIONS
      // ----------------------------------------------------

      const existingSnapshot =
        await getDocs(
          query(
            collection(
              db,
              "joinRequests"
            ),
            where(
              "eventId",
              "==",
              event.id
            ),
            where(
              "volunteerId",
              "==",
              currentUser.uid
            )
          )
        );

      if (
        !existingSnapshot.empty
      ) {
        setMessage(
          "You have already applied for this event."
        );

        return;
      }

      // ----------------------------------------------------
      // CREATE APPLICATION
      // ----------------------------------------------------

      await addDoc(
        collection(
          db,
          "joinRequests"
        ),
        {
          eventId:
            event.id,

          eventTitle:
            event.title,

          organizerId:
            event.organizerId,

          volunteerId:
            currentUser.uid,

          volunteerName:
            userData.name,

          volunteerEmail:
            userData.email ||
            currentUser.email,

          volunteerPhone:
            userData.phone || "",

          rating:
            Number(
              userData.rating || 0
            ),

          skills:
            Array.isArray(
              userData.skills
            )
              ? userData.skills
              : [],

          requestedRole,

          availabilityType,

          emergencyContact:
            emergencyContact.trim(),

          applicationNote:
            applicationNote.trim(),

          suitabilityReason:
            suitabilityReason.trim(),

          attendanceConfirmed,

          applicationStatus:
            "pending",

          selectionType:
            null,

          confirmationStatus:
            "not-requested",

          requestedAt:
            serverTimestamp(),
        }
      );

      // ----------------------------------------------------
      // NOTIFY ORGANIZER
      // ----------------------------------------------------

      if (event.organizerId) {
        await addDoc(
          collection(
            db,
            "notifications"
          ),
          {
            organizerId:
              event.organizerId,

            eventId:
              event.id,

            eventTitle:
              event.title,

            volunteerId:
              currentUser.uid,

            volunteerName:
              userData.name,

            title:
              "New Volunteer Application",

            message:
              `${userData.name} applied for ${event.title} as ${requestedRole}.`,

            type:
              "new-request",

            category:
              "action",

            requiresAction:
              true,

            actionRoute:
              "/event-requests",

            actionLabel:
              "Review Application",

            isRead:
              false,

            createdAt:
              serverTimestamp(),
          }
        );
      }

      setMessage(
        "Application submitted successfully."
      );

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (error) {
      console.error(
        "Event application error:",
        error
      );

      setMessage(
        error?.message ||
        "Failed to submit application."
      );
    } finally {
      setLoading(false);
    }
  };


  // ========================================================
  // MODAL UI
  // ========================================================

  return (
    <div
      className="event-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="event-modal"
        onClick={(clickEvent) =>
          clickEvent.stopPropagation()
        }
      >
        <div className="event-modal-header">
          <div>
            <p className="dashboard-eyebrow">
              Volunteer Application
            </p>

            <h2>
              {event.title}
            </h2>
          </div>

          <button
            type="button"
            className="event-modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form
          className="event-application-form"
          onSubmit={handleSubmit}
        >
          <label className="input-group">
            <span className="input-label">
              Role Applying For *
            </span>

            <select
              className="modern-select"
              value={requestedRole}
              onChange={(changeEvent) =>
                setRequestedRole(
                  changeEvent.target.value
                )
              }
            >
              <option value="">
                Select role
              </option>

              {Array.isArray(
                event.availableRoles
              ) &&
              event.availableRoles.map(
                (role) => (
                  <option
                    key={role}
                    value={role}
                  >
                    {role}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="input-group">
            <span className="input-label">
              Availability
            </span>

            <select
              className="modern-select"
              value={availabilityType}
              onChange={(changeEvent) =>
                setAvailabilityType(
                  changeEvent.target.value
                )
              }
            >
              <option value="full">
                Available for full event
              </option>

              <option value="partial">
                Available partially
              </option>

              <option value="flexible">
                Flexible timing
              </option>
            </select>
          </label>

          <label className="input-group">
            <span className="input-label">
              Why are you suitable?
            </span>

            <textarea
              className="modern-textarea"
              rows="4"
              value={suitabilityReason}
              onChange={(changeEvent) =>
                setSuitabilityReason(
                  changeEvent.target.value
                )
              }
              placeholder="Mention your relevant skills or experience."
            />
          </label>

          <label className="input-group">
            <span className="input-label">
              Application Note
            </span>

            <textarea
              className="modern-textarea"
              rows="3"
              value={applicationNote}
              onChange={(changeEvent) =>
                setApplicationNote(
                  changeEvent.target.value
                )
              }
              placeholder="Add any message for the organizer."
            />
          </label>

          <label className="input-group">
            <span className="input-label">
              Emergency Contact
            </span>

            <input
              className="modern-input"
              type="tel"
              value={emergencyContact}
              onChange={(changeEvent) =>
                setEmergencyContact(
                  changeEvent.target.value
                )
              }
              placeholder="Emergency contact number"
            />
          </label>

          <label className="event-application-confirmation">
            <input
              type="checkbox"
              checked={attendanceConfirmed}
              onChange={(changeEvent) =>
                setAttendanceConfirmed(
                  changeEvent.target.checked
                )
              }
            />

            <span>
              I confirm that I will attend the event if selected.
            </span>
          </label>

          {message && (
            <div className="form-message">
              {message}
            </div>
          )}

          <div className="event-modal-actions">
            <button
              type="button"
              className="secondary-action-button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-action-button"
              disabled={loading}
            >
              {loading
                ? "Submitting..."
                : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventApplicationModal;