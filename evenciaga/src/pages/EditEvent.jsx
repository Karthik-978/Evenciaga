// ==========================================================
// REACT AND ROUTER IMPORTS
// ==========================================================

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase";


// ==========================================================
// COMPONENT IMPORTS
// ==========================================================

import BackButton from "../components/BackButton";


// ==========================================================
// EDIT EVENT COMPONENT
// ==========================================================

function EditEvent() {
  // --------------------------------------------------------
  // ROUTER VALUES
  // --------------------------------------------------------

  const { id } = useParams();
  const navigate = useNavigate();


  // --------------------------------------------------------
  // BASIC EVENT DETAILS
  // --------------------------------------------------------

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventCategory, setEventCategory] = useState("");
  const [location, setLocation] = useState("");


  // --------------------------------------------------------
  // DATE AND TIME
  // --------------------------------------------------------

  const [date, setDate] = useState("");
  const [reportingTime, setReportingTime] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [applicationDeadline, setApplicationDeadline] =
    useState("");

  const [confirmationDeadline, setConfirmationDeadline] =
    useState("");


  // --------------------------------------------------------
  // VOLUNTEER REQUIREMENTS
  // --------------------------------------------------------

  const [requiredVolunteers, setRequiredVolunteers] =
    useState("");

  const [primaryLimit, setPrimaryLimit] = useState("");
  const [standbyLimit, setStandbyLimit] = useState("");

  const [requiredSkills, setRequiredSkills] = useState("");
  const [availableRoles, setAvailableRoles] = useState("");
  const [requirements, setRequirements] = useState("");


  // --------------------------------------------------------
  // EVENT BENEFITS
  // --------------------------------------------------------

  const [eventType, setEventType] = useState("volunteer");
  const [eventHours, setEventHours] = useState("");
  const [paymentPerPerson, setPaymentPerPerson] =
    useState("");

  const [certificateEligible, setCertificateEligible] =
    useState(true);


  // --------------------------------------------------------
  // PAGE STATE
  // --------------------------------------------------------

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");


  // ========================================================
  // HELPERS
  // ========================================================

  const arrayToInput = (value) => {
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    return value || "";
  };

  const convertToArray = (value) =>
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);


  // ========================================================
  // LOAD EVENT
  // ========================================================

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError("");

        const eventReference = doc(
          db,
          "events",
          id
        );

        const eventSnapshot = await getDoc(
          eventReference
        );

        if (!eventSnapshot.exists()) {
          setError("Event was not found.");
          return;
        }

        const data = eventSnapshot.data();

        if (data.status === "completed") {
          alert("Completed events cannot be edited.");
          navigate("/my-events");
          return;
        }

        // BASIC DETAILS
        setTitle(data.title || "");
        setDescription(data.description || "");
        setEventCategory(data.eventCategory || "");
        setLocation(data.location || "");

        // DATE AND TIME
        setDate(data.date || "");
        setReportingTime(data.reportingTime || "");
        setStartTime(data.startTime || "");
        setEndTime(data.endTime || "");

        setApplicationDeadline(
          data.applicationDeadline || ""
        );

        setConfirmationDeadline(
          data.confirmationDeadline || ""
        );

        // VOLUNTEER LIMITS
        setRequiredVolunteers(
          data.requiredVolunteers ?? ""
        );

        setPrimaryLimit(
          data.primaryLimit ??
            data.requiredVolunteers ??
            ""
        );

        setStandbyLimit(
          data.standbyLimit ?? ""
        );

        // SKILLS, ROLES, REQUIREMENTS
        setRequiredSkills(
          arrayToInput(data.requiredSkills)
        );

        setAvailableRoles(
          arrayToInput(data.availableRoles)
        );

        setRequirements(
          arrayToInput(data.requirements)
        );

        // TYPE AND BENEFITS
        setEventType(
          data.eventType || "volunteer"
        );

        setEventHours(
          data.eventHours ?? ""
        );

        setPaymentPerPerson(
          data.paymentPerPerson ?? ""
        );

        setCertificateEligible(
          data.certificateEligible ??
            true
        );
      } catch (fetchError) {
        console.error(
          "Fetch event error:",
          fetchError
        );

        setError(
          fetchError?.message ||
            "Unable to load event."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, navigate]);


  // ========================================================
  // VALIDATE FORM
  // ========================================================

  const validateForm = () => {
    if (
      !title.trim() ||
      !description.trim() ||
      !eventCategory ||
      !date ||
      !location.trim() ||
      !reportingTime ||
      !startTime ||
      !endTime ||
      !applicationDeadline ||
      !confirmationDeadline ||
      !requiredVolunteers ||
      !primaryLimit ||
      !eventHours ||
      !requiredSkills.trim() ||
      !availableRoles.trim() ||
      !requirements.trim()
    ) {
      return "Please fill all required fields.";
    }

    const requiredCount =
      Number(requiredVolunteers);

    const primaryCount =
      Number(primaryLimit);

    const standbyCount =
      Number(standbyLimit || 0);

    if (
      requiredCount <= 0 ||
      primaryCount <= 0 ||
      standbyCount < 0
    ) {
      return "Volunteer limits must contain valid numbers.";
    }

    if (primaryCount !== requiredCount) {
      return "Primary limit should match required volunteers.";
    }

    if (endTime <= startTime) {
      return "End time must be later than start time.";
    }

    if (reportingTime > startTime) {
      return "Reporting time must be before or equal to start time.";
    }

    if (applicationDeadline > date) {
      return "Application deadline cannot be after the event date.";
    }

    if (confirmationDeadline > date) {
      return "Confirmation deadline cannot be after the event date.";
    }

    if (
      eventType === "paid" &&
      Number(paymentPerPerson) <= 0
    ) {
      return "Please enter a valid payment amount.";
    }

    return "";
  };


  // ========================================================
  // SAVE CHANGES
  // ========================================================

  const saveChanges = async (formEvent) => {
    formEvent.preventDefault();

    setMessage("");
    setError("");

    const validationMessage =
      validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setSaving(true);

      await updateDoc(
        doc(db, "events", id),
        {
          // BASIC DETAILS
          title: title.trim(),
          description: description.trim(),
          eventCategory,
          location: location.trim(),

          // DATE AND TIME
          date,
          reportingTime,
          startTime,
          endTime,
          applicationDeadline,
          confirmationDeadline,

          // VOLUNTEER CAPACITY
          requiredVolunteers:
            Number(requiredVolunteers),

          primaryLimit:
            Number(primaryLimit),

          standbyLimit:
            Number(standbyLimit || 0),

          // SKILLS, ROLES, REQUIREMENTS
          requiredSkills:
            convertToArray(requiredSkills),

          availableRoles:
            convertToArray(availableRoles),

          requirements:
            convertToArray(requirements),

          // TYPE AND BENEFITS
          eventType,

          eventHours:
            Number(eventHours),

          paymentPerPerson:
            eventType === "paid"
              ? Number(paymentPerPerson)
              : 0,

          certificateEligible,

          // UPDATE METADATA
          updatedAt:
            serverTimestamp(),
        }
      );

      setMessage(
        "Event updated successfully."
      );

      navigate("/my-events");
    } catch (saveError) {
      console.error(
        "Update event error:",
        saveError
      );

      setError(
        saveError?.message ||
          "Failed to update event."
      );
    } finally {
      setSaving(false);
    }
  };


  // ========================================================
  // LOADING SCREEN
  // ========================================================

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">
            ⏳
          </div>

          <h2>Loading Event</h2>

          <p>
            Fetching event details.
          </p>
        </div>
      </div>
    );
  }


  // ========================================================
  // ERROR SCREEN
  // ========================================================

  if (error && !title) {
    return (
      <div className="page-container">
        <BackButton />

        <div className="page-card empty-state">
          <div className="empty-icon">
            ⚠️
          </div>

          <h2>Unable to Load Event</h2>

          <p>{error}</p>
        </div>
      </div>
    );
  }


  // ========================================================
  // EDIT EVENT UI
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
            Edit Event
          </h1>

          <p className="page-subtitle">
            Update event details, deadlines, roles,
            skills, volunteer limits, and benefits.
          </p>
        </div>

        <div className="organizer-status approved">
          ✏️ Editing Event
        </div>
      </section>


      {/* ====================================================
          EDIT EVENT FORM
      ==================================================== */}

      <form
        className="page-card form-card"
        onSubmit={saveChanges}
      >

        {/* ==================================================
            BASIC EVENT DETAILS
        ================================================== */}

        <section className="form-section">
          <h2>Basic Event Details</h2>

          <div className="form-grid">
            <label className="input-group">
              <span className="input-label">
                Event Title *
              </span>

              <input
                className="modern-input"
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
              />
            </label>

            <label className="input-group">
              <span className="input-label">
                Event Category *
              </span>

              <select
                className="modern-select"
                value={eventCategory}
                onChange={(event) =>
                  setEventCategory(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select event category
                </option>

                <option value="education">
                  Education
                </option>

                <option value="healthcare">
                  Healthcare
                </option>

                <option value="environment">
                  Environment
                </option>

                <option value="community">
                  Community
                </option>

                <option value="sports">
                  Sports
                </option>

                <option value="technology">
                  Technology
                </option>

                <option value="cultural">
                  Cultural
                </option>

                <option value="fundraising">
                  Fundraising
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </label>
          </div>

          <label className="input-group">
            <span className="input-label">
              Description *
            </span>

            <textarea
              className="modern-textarea"
              rows="5"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
            />
          </label>

          <label className="input-group">
            <span className="input-label">
              Location *
            </span>

            <input
              className="modern-input"
              type="text"
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value
                )
              }
            />
          </label>
        </section>


        {/* ==================================================
            DATE AND TIME
        ================================================== */}

        <section className="form-section">
          <h2>Date and Time</h2>

          <div className="form-grid">
            <label className="input-group">
              <span className="input-label">
                Event Date *
              </span>

              <input
                className="modern-input"
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(
                    event.target.value
                  )
                }
              />
            </label>

            <label className="input-group">
              <span className="input-label">
                Reporting Time *
              </span>

              <input
                className="modern-input"
                type="time"
                value={reportingTime}
                onChange={(event) =>
                  setReportingTime(
                    event.target.value
                  )
                }
              />
            </label>

            <label className="input-group">
              <span className="input-label">
                Start Time *
              </span>

              <input
                className="modern-input"
                type="time"
                value={startTime}
                onChange={(event) =>
                  setStartTime(
                    event.target.value
                  )
                }
              />
            </label>

            <label className="input-group">
              <span className="input-label">
                End Time *
              </span>

              <input
                className="modern-input"
                type="time"
                value={endTime}
                onChange={(event) =>
                  setEndTime(
                    event.target.value
                  )
                }
              />
            </label>

            <label className="input-group">
              <span className="input-label">
                Application Deadline *
              </span>

              <input
                className="modern-input"
                type="date"
                value={applicationDeadline}
                onChange={(event) =>
                  setApplicationDeadline(
                    event.target.value
                  )
                }
              />
            </label>

            <label className="input-group">
              <span className="input-label">
                Confirmation Deadline *
              </span>

              <input
                className="modern-input"
                type="date"
                value={confirmationDeadline}
                onChange={(event) =>
                  setConfirmationDeadline(
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        </section>


        {/* ==================================================
            VOLUNTEER CAPACITY
        ================================================== */}

        <section className="form-section">
          <h2>Volunteer Capacity</h2>

          <div className="form-grid">
            <label className="input-group">
              <span className="input-label">
                Required Volunteers *
              </span>

              <input
                className="modern-input"
                type="number"
                min="1"
                value={requiredVolunteers}
                onChange={(event) => {
                  const value =
                    event.target.value;

                  setRequiredVolunteers(
                    value
                  );

                  setPrimaryLimit(value);
                }}
              />
            </label>

            <label className="input-group">
              <span className="input-label">
                Primary Volunteer Limit *
              </span>

              <input
                className="modern-input"
                type="number"
                min="1"
                value={primaryLimit}
                onChange={(event) =>
                  setPrimaryLimit(
                    event.target.value
                  )
                }
              />
            </label>

            <label className="input-group">
              <span className="input-label">
                Standby Volunteer Limit
              </span>

              <input
                className="modern-input"
                type="number"
                min="0"
                value={standbyLimit}
                onChange={(event) =>
                  setStandbyLimit(
                    event.target.value
                  )
                }
              />
            </label>

            <label className="input-group">
              <span className="input-label">
                Event Duration (Hours) *
              </span>

              <input
                className="modern-input"
                type="number"
                min="1"
                step="0.5"
                value={eventHours}
                onChange={(event) =>
                  setEventHours(
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        </section>


        {/* ==================================================
            SKILLS, ROLES, AND REQUIREMENTS
        ================================================== */}

        <section className="form-section">
          <h2>
            Skills, Roles and Requirements
          </h2>

          <p className="form-helper-text">
            Separate multiple values using commas.
          </p>

          <label className="input-group">
            <span className="input-label">
              Required Skills *
            </span>

            <input
              className="modern-input"
              type="text"
              value={requiredSkills}
              onChange={(event) =>
                setRequiredSkills(
                  event.target.value
                )
              }
            />
          </label>

          <label className="input-group">
            <span className="input-label">
              Available Roles *
            </span>

            <input
              className="modern-input"
              type="text"
              value={availableRoles}
              onChange={(event) =>
                setAvailableRoles(
                  event.target.value
                )
              }
            />
          </label>

          <label className="input-group">
            <span className="input-label">
              Volunteer Requirements *
            </span>

            <textarea
              className="modern-textarea"
              rows="4"
              value={requirements}
              onChange={(event) =>
                setRequirements(
                  event.target.value
                )
              }
            />
          </label>
        </section>


        {/* ==================================================
            EVENT TYPE AND BENEFITS
        ================================================== */}

        <section className="form-section">
          <h2>Event Type and Benefits</h2>

          <div className="form-grid">
            <label className="input-group">
              <span className="input-label">
                Event Type *
              </span>

              <select
                className="modern-select"
                value={eventType}
                onChange={(event) =>
                  setEventType(
                    event.target.value
                  )
                }
              >
                <option value="volunteer">
                  Volunteer Event
                </option>

                <option value="paid">
                  Paid Event
                </option>
              </select>
            </label>

            {eventType === "paid" && (
              <label className="input-group">
                <span className="input-label">
                  Payment Per Volunteer (₹) *
                </span>

                <input
                  className="modern-input"
                  type="number"
                  min="1"
                  value={paymentPerPerson}
                  onChange={(event) =>
                    setPaymentPerPerson(
                      event.target.value
                    )
                  }
                />
              </label>
            )}
          </div>

          <label className="form-checkbox-row">
            <input
              type="checkbox"
              checked={certificateEligible}
              onChange={(event) =>
                setCertificateEligible(
                  event.target.checked
                )
              }
            />

            <span>
              Volunteers who complete this event are eligible
              for a certificate.
            </span>
          </label>
        </section>


        {/* ==================================================
            MESSAGES
        ================================================== */}

        {error && (
          <div className="form-message">
            {error}
          </div>
        )}

        {message && (
          <div className="form-message">
            {message}
          </div>
        )}


        {/* ==================================================
            FORM ACTIONS
        ================================================== */}

        <div className="event-action-buttons">
          <button
            type="button"
            className="secondary-action-button"
            onClick={() =>
              navigate("/my-events")
            }
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={saving}
          >
            {saving
              ? "Saving Changes..."
              : "💾 Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditEvent;