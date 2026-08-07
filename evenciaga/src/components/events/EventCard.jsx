// ==========================================================
// REACT IMPORTS
// ==========================================================

import { useState } from "react";


// ==========================================================
// ROUTER IMPORTS
// ==========================================================

import { useNavigate } from "react-router-dom";


// ==========================================================
// COMPONENT IMPORTS
// ==========================================================

import EventApplicationModal from "./EventApplicationModal";
import EventDetailsModal from "./EventDetailsModal";


// ==========================================================
// EVENT CARD COMPONENT
// ==========================================================

function EventCard({
  event,
  userData,
  onApplicationSuccess,
}) {
  // --------------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------------

  const navigate = useNavigate();


  // --------------------------------------------------------
  // MODAL STATE
  // --------------------------------------------------------

  const [applicationModalOpen, setApplicationModalOpen] =
    useState(false);
  const [detailsModalOpen, setDetailsModalOpen] =
  useState(false);

  // --------------------------------------------------------
  // EVENT STATE
  // --------------------------------------------------------

  const isCompleted =
    event?.status === "completed";

  const isPaid =
    event?.eventType === "paid";

  const isCertificateEligible =
    event?.certificateEligible !== false;

  const availableRoles =
    Array.isArray(event?.availableRoles)
      ? event.availableRoles
      : [];

  const requiredSkills =
    Array.isArray(event?.requiredSkills)
      ? event.requiredSkills
      : [];

  const requirements =
    Array.isArray(event?.requirements)
      ? event.requirements
      : [];


  // --------------------------------------------------------
  // FORMAT EVENT DATE
  // --------------------------------------------------------

  const formatEventDate = (
    value
  ) => {
    if (!value) {
      return "Date not available";
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

    const date = new Date();

    date.setHours(
      Number(hours || 0),
      Number(minutes || 0),
      0,
      0
    );

    return date.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };


  // --------------------------------------------------------
  // OPEN APPLICATION MODAL
  // --------------------------------------------------------

  const openApplicationModal =
    () => {
      if (isCompleted) {
        return;
      }

      setApplicationModalOpen(true);
    };


  // ========================================================
  // EVENT CARD UI
  // ========================================================

  return (
    <>
      <article className="event-card">

        {/* ==================================================
            EVENT HEADER
        ================================================== */}

        <div className="event-card-header">
          <div>
            <p className="dashboard-eyebrow">
              {event?.eventCategory ||
                "Volunteer Opportunity"}
            </p>

            <h2 className="event-title">
              {event?.title ||
                "Untitled Event"}
            </h2>

            <p className="event-description">
              {event?.description ||
                "No description provided."}
            </p>
          </div>

          {isCompleted ? (
            <span className="status-completed">
              Completed
            </span>
          ) : (
            <span className="status-active">
              Active
            </span>
          )}
        </div>


        {/* ==================================================
            EVENT META INFORMATION
        ================================================== */}

        <div className="event-meta-grid">
          <div className="event-meta-item">
            <span className="event-meta-icon">
              📍
            </span>

            <div>
              <small>
                Location
              </small>

              <strong>
                {event?.location ||
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
                {formatEventDate(
                  event?.date
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
                Reporting Time
              </small>

              <strong>
                {formatTime(
                  event?.reportingTime
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
                Event Time
              </small>

              <strong>
                {formatTime(
                  event?.startTime
                )}
                {" - "}
                {formatTime(
                  event?.endTime
                )}
              </strong>
            </div>
          </div>

          <div className="event-meta-item">
            <span className="event-meta-icon">
              👥
            </span>

            <div>
              <small>
                Primary Volunteers
              </small>

              <strong>
                {event?.primaryLimit ??
                  event?.requiredVolunteers ??
                  0}
              </strong>
            </div>
          </div>

          <div className="event-meta-item">
            <span className="event-meta-icon">
              🧍
            </span>

            <div>
              <small>
                Standby Volunteers
              </small>

              <strong>
                {event?.standbyLimit || 0}
              </strong>
            </div>
          </div>

          <div className="event-meta-item">
            <span className="event-meta-icon">
              ⏰
            </span>

            <div>
              <small>
                Duration
              </small>

              <strong>
                {event?.eventHours || 0}
                {" hours"}
              </strong>
            </div>
          </div>

          <div className="event-meta-item">
            <span className="event-meta-icon">
              📌
            </span>

            <div>
              <small>
                Apply Before
              </small>

              <strong>
                {formatEventDate(
                  event?.applicationDeadline
                )}
              </strong>
            </div>
          </div>
        </div>


        {/* ==================================================
            EVENT BENEFITS
        ================================================== */}

        <div className="event-benefits-row">
          {isPaid ? (
            <span className="event-type-badge paid">
              💰 Paid Event · ₹
              {event?.paymentPerPerson || 0}
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

          {event?.confirmationDeadline && (
            <span className="event-type-badge volunteer">
              📞 Confirmation by{" "}
              {formatEventDate(
                event.confirmationDeadline
              )}
            </span>
          )}
        </div>


        {/* ==================================================
            AVAILABLE ROLES
        ================================================== */}

        {availableRoles.length > 0 && (
          <div className="event-card-section">
            <h3>
              Available Roles
            </h3>

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
          </div>
        )}


        {/* ==================================================
            REQUIRED SKILLS
        ================================================== */}

        {requiredSkills.length > 0 && (
          <div className="event-card-section">
            <h3>
              Required Skills
            </h3>

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
          </div>
        )}


        {/* ==================================================
            REQUIREMENTS
        ================================================== */}

        {requirements.length > 0 && (
          <div className="event-card-section">
            <h3>
              Requirements
            </h3>

            <ul className="event-requirements-list">
              {requirements.map(
                (requirement) => (
                  <li key={requirement}>
                    {requirement}
                  </li>
                )
              )}
            </ul>
          </div>
        )}


        {/* ==================================================
            EVENT ACTIONS
        ================================================== */}

        <div className="event-action-buttons">
  <button
    type="button"
    className="secondary-action-button"
    onClick={() =>
      setDetailsModalOpen(true)
    }
  >
    👁 View Details
  </button>

  <button
    type="button"
    className="primary-action-button"
    onClick={openApplicationModal}
    disabled={isCompleted}
  >
    {isCompleted
      ? "🔒 Event Closed"
      : "🙋 Apply for Event"}
  </button>

  <button
    type="button"
    className="secondary-action-button"
    onClick={() =>
      navigate(
        `/report-event/${event.id}`
      )
    }
    disabled={isCompleted}
  >
    🚩 Report Event
  </button>
</div>
      </article>


      {/* ====================================================
          EVENT DETAILS MODAL
      ==================================================== */}

      {detailsModalOpen && (
        <EventDetailsModal
          event={event}
          onClose={() =>
            setDetailsModalOpen(false)
          }
          onApply={() => {
            setDetailsModalOpen(false);
            setApplicationModalOpen(true);
          }}
        />
      )}


      {/* ====================================================
          APPLICATION MODAL
      ==================================================== */}

      {applicationModalOpen && (
        <EventApplicationModal
          event={event}
          userData={userData}
          onClose={() =>
            setApplicationModalOpen(
              false
            )
          }
          onSuccess={
            onApplicationSuccess
          }
        />
      )}
    </>
  );
}

export default EventCard;