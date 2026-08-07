// ==========================================================
// REACT IMPORTS
// ==========================================================

import { useEffect } from "react";


// ==========================================================
// EVENT DETAILS MODAL COMPONENT
// ==========================================================

function EventDetailsModal({
  event,
  onClose,
  onApply,
}) {
  // --------------------------------------------------------
  // CLOSE MODAL WITH ESCAPE KEY
  // --------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (
      keyboardEvent
    ) => {
      if (
        keyboardEvent.key ===
        "Escape"
      ) {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        "";
    };
  }, [onClose]);


  // --------------------------------------------------------
  // PREPARE EVENT VALUES
  // --------------------------------------------------------

  const availableRoles =
    Array.isArray(
      event?.availableRoles
    )
      ? event.availableRoles
      : [];

  const requiredSkills =
    Array.isArray(
      event?.requiredSkills
    )
      ? event.requiredSkills
      : [];

  const requirements =
    Array.isArray(
      event?.requirements
    )
      ? event.requirements
      : [];

  const isCompleted =
    event?.status === "completed";

  const isPaid =
    event?.eventType === "paid";

  const isCertificateEligible =
    event?.certificateEligible !==
    false;


  // --------------------------------------------------------
  // FORMAT EVENT DATE
  // --------------------------------------------------------

  const formatEventDate = (
    value
  ) => {
    if (!value) {
      return "Not specified";
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


  // --------------------------------------------------------
  // FORMAT EVENT TIME
  // --------------------------------------------------------

  const formatTime = (
    value
  ) => {
    if (!value) {
      return "Not specified";
    }

    const [
      hours,
      minutes,
    ] = String(value).split(":");

    const timeDate =
      new Date();

    timeDate.setHours(
      Number(hours || 0),
      Number(minutes || 0),
      0,
      0
    );

    return timeDate.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };


  // ========================================================
  // EVENT DETAILS MODAL UI
  // ========================================================

  return (
    <div
      className="event-modal-backdrop"
      onClick={onClose}
    >
      <section
        className="event-details-modal"
        onClick={(clickEvent) =>
          clickEvent.stopPropagation()
        }
      >

        {/* ==================================================
            MODAL HEADER
        ================================================== */}

        <div className="event-details-header">
          <div>
            <p className="dashboard-eyebrow">
              {event?.eventCategory ||
                "Volunteer Opportunity"}
            </p>

            <h2>
              {event?.title ||
                "Untitled Event"}
            </h2>

            <p>
              {event?.description ||
                "No description provided."}
            </p>
          </div>

          <button
            type="button"
            className="event-modal-close"
            onClick={onClose}
            aria-label="Close event details"
          >
            ✕
          </button>
        </div>


        {/* ==================================================
            STATUS AND BENEFITS
        ================================================== */}

        <div className="event-details-badges">
          <span
            className={
              isCompleted
                ? "status-completed"
                : "status-active"
            }
          >
            {isCompleted
              ? "Completed"
              : "Active"}
          </span>

          {isPaid ? (
            <span className="event-type-badge paid">
              💰 ₹
              {event?.paymentPerPerson ||
                0}
              {" per volunteer"}
            </span>
          ) : (
            <span className="event-type-badge volunteer">
              🤝 Volunteer Event
            </span>
          )}

          {isCertificateEligible && (
            <span className="event-type-badge certificate">
              🏆 Certificate Eligible
            </span>
          )}
        </div>


        {/* ==================================================
            EVENT INFORMATION
        ================================================== */}

        <div className="event-details-grid">
          <div className="event-details-item">
            <span>📍</span>

            <div>
              <small>Location</small>

              <strong>
                {event?.location ||
                  "Not specified"}
              </strong>
            </div>
          </div>

          <div className="event-details-item">
            <span>📅</span>

            <div>
              <small>Event Date</small>

              <strong>
                {formatEventDate(
                  event?.date
                )}
              </strong>
            </div>
          </div>

          <div className="event-details-item">
            <span>🕘</span>

            <div>
              <small>Reporting Time</small>

              <strong>
                {formatTime(
                  event?.reportingTime
                )}
              </strong>
            </div>
          </div>

          <div className="event-details-item">
            <span>▶️</span>

            <div>
              <small>Start Time</small>

              <strong>
                {formatTime(
                  event?.startTime
                )}
              </strong>
            </div>
          </div>

          <div className="event-details-item">
            <span>⏹️</span>

            <div>
              <small>End Time</small>

              <strong>
                {formatTime(
                  event?.endTime
                )}
              </strong>
            </div>
          </div>

          <div className="event-details-item">
            <span>⏰</span>

            <div>
              <small>Duration</small>

              <strong>
                {event?.eventHours ||
                  0}
                {" hours"}
              </strong>
            </div>
          </div>

          <div className="event-details-item">
            <span>👥</span>

            <div>
              <small>Primary Limit</small>

              <strong>
                {event?.primaryLimit ??
                  event
                    ?.requiredVolunteers ??
                  0}
              </strong>
            </div>
          </div>

          <div className="event-details-item">
            <span>🧍</span>

            <div>
              <small>Standby Limit</small>

              <strong>
                {event?.standbyLimit ||
                  0}
              </strong>
            </div>
          </div>

          <div className="event-details-item">
            <span>📌</span>

            <div>
              <small>
                Application Deadline
              </small>

              <strong>
                {formatEventDate(
                  event
                    ?.applicationDeadline
                )}
              </strong>
            </div>
          </div>

          <div className="event-details-item">
            <span>📞</span>

            <div>
              <small>
                Confirmation Deadline
              </small>

              <strong>
                {formatEventDate(
                  event
                    ?.confirmationDeadline
                )}
              </strong>
            </div>
          </div>
        </div>


        {/* ==================================================
            AVAILABLE ROLES
        ================================================== */}

        <div className="event-details-section">
          <h3>Available Roles</h3>

          {availableRoles.length > 0 ? (
            <div className="event-tag-list">
              {availableRoles.map(
                (role) => (
                  <span
                    key={role}
                    className="event-tag"
                  >
                    {role}
                  </span>
                )
              )}
            </div>
          ) : (
            <p>
              No roles were specified.
            </p>
          )}
        </div>


        {/* ==================================================
            REQUIRED SKILLS
        ================================================== */}

        <div className="event-details-section">
          <h3>Required Skills</h3>

          {requiredSkills.length > 0 ? (
            <div className="event-tag-list">
              {requiredSkills.map(
                (skill) => (
                  <span
                    key={skill}
                    className="event-tag skill"
                  >
                    {skill}
                  </span>
                )
              )}
            </div>
          ) : (
            <p>
              No specific skills required.
            </p>
          )}
        </div>


        {/* ==================================================
            REQUIREMENTS
        ================================================== */}

        <div className="event-details-section">
          <h3>
            Volunteer Requirements
          </h3>

          {requirements.length > 0 ? (
            <ul className="event-requirements-list">
              {requirements.map(
                (requirement) => (
                  <li key={requirement}>
                    {requirement}
                  </li>
                )
              )}
            </ul>
          ) : (
            <p>
              No additional requirements.
            </p>
          )}
        </div>


        {/* ==================================================
            ORGANIZER INFORMATION
        ================================================== */}

        <div className="event-details-section">
          <h3>Organizer</h3>

          <div className="event-organizer-summary">
            <div className="event-organizer-avatar">
              {event
                ?.organizationName
                ?.charAt(0)
                ?.toUpperCase() ||
                "O"}
            </div>

            <div>
              <strong>
                {event?.organizationName ||
                  "Organizer"}
              </strong>

              <p>
                {event?.organizerEmail ||
                  "Contact not provided"}
              </p>
            </div>
          </div>
        </div>


        {/* ==================================================
            MODAL ACTIONS
        ================================================== */}

        <div className="event-modal-actions">
          <button
            type="button"
            className="secondary-action-button"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="primary-action-button"
            onClick={onApply}
            disabled={isCompleted}
          >
            {isCompleted
              ? "Event Closed"
              : "Apply for Event"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default EventDetailsModal;