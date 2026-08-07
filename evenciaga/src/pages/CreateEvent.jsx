// ==========================================================
// REACT IMPORTS
// ==========================================================

import { useState } from "react";


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase";


// ==========================================================
// COMPONENT IMPORTS
// ==========================================================

import BackButton from "../components/BackButton";


// ==========================================================
// CREATE EVENT COMPONENT
// ==========================================================

function CreateEvent() {
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

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);


  // ========================================================
  // HELPER: CONVERT COMMA-SEPARATED TEXT TO ARRAY
  // ========================================================

  const convertToArray = (value) =>
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);


  // ========================================================
  // VALIDATE EVENT FORM
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

    const requiredCount = Number(requiredVolunteers);
    const primaryCount = Number(primaryLimit);
    const standbyCount = Number(standbyLimit || 0);

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
  // CREATE EVENT
  // ========================================================

  const handleCreateEvent = async (formEvent) => {
    formEvent.preventDefault();

    setMessage("");

    const validationMessage = validateForm();

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    try {
      setLoading(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        setMessage("Please log in again.");
        return;
      }

      await addDoc(
        collection(db, "events"),
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

          // VOLUNTEER REQUIREMENTS
          requiredVolunteers: Number(requiredVolunteers),
          primaryLimit: Number(primaryLimit),
          standbyLimit: Number(standbyLimit || 0),

          requiredSkills: convertToArray(requiredSkills),
          availableRoles: convertToArray(availableRoles),
          requirements: convertToArray(requirements),

          // EVENT TYPE AND BENEFITS
          eventType,
          eventHours: Number(eventHours),

          paymentPerPerson:
            eventType === "paid"
              ? Number(paymentPerPerson)
              : 0,

          certificateEligible,

          // ORGANIZER DETAILS
          organizerId: currentUser.uid,
          organizerEmail: currentUser.email,

          // EVENT STATUS
          status: "active",
          createdAt: serverTimestamp(),
        }
      );

      setMessage("Event created successfully.");

      // RESET FORM
      setTitle("");
      setDescription("");
      setEventCategory("");
      setLocation("");

      setDate("");
      setReportingTime("");
      setStartTime("");
      setEndTime("");
      setApplicationDeadline("");
      setConfirmationDeadline("");

      setRequiredVolunteers("");
      setPrimaryLimit("");
      setStandbyLimit("");

      setRequiredSkills("");
      setAvailableRoles("");
      setRequirements("");

      setEventType("volunteer");
      setEventHours("");
      setPaymentPerPerson("");
      setCertificateEligible(true);
    } catch (error) {
      console.error("Create event error:", error);

      setMessage(
        error?.message ||
          "Failed to create event."
      );
    } finally {
      setLoading(false);
    }
  };


  // ========================================================
  // CREATE EVENT UI
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
            Create Event
          </h1>

          <p className="page-subtitle">
            Add event details, roles, skills, volunteer limits,
            deadlines, and participation benefits.
          </p>
        </div>

        <div className="organizer-status approved">
          ➕ New Event
        </div>
      </section>


      {/* ====================================================
          EVENT FORM
      ==================================================== */}

      <form
        className="page-card form-card"
        onSubmit={handleCreateEvent}
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
                placeholder="Enter event title"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
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
                  setEventCategory(event.target.value)
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
              placeholder="Explain the purpose and activities of the event."
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
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
              placeholder="Enter event venue or address"
              value={location}
              onChange={(event) =>
                setLocation(event.target.value)
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
                  setDate(event.target.value)
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
                  setReportingTime(event.target.value)
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
                  setStartTime(event.target.value)
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
                  setEndTime(event.target.value)
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
                placeholder="Example: 10"
                value={requiredVolunteers}
                onChange={(event) => {
                  const value = event.target.value;

                  setRequiredVolunteers(value);
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
                placeholder="Example: 10"
                value={primaryLimit}
                onChange={(event) =>
                  setPrimaryLimit(event.target.value)
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
                placeholder="Example: 5"
                value={standbyLimit}
                onChange={(event) =>
                  setStandbyLimit(event.target.value)
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
                placeholder="Example: 6"
                value={eventHours}
                onChange={(event) =>
                  setEventHours(event.target.value)
                }
              />
            </label>
          </div>
        </section>


        {/* ==================================================
            SKILLS, ROLES, AND REQUIREMENTS
        ================================================== */}

        <section className="form-section">
          <h2>Skills, Roles and Requirements</h2>

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
              placeholder="Communication, First Aid, Photography"
              value={requiredSkills}
              onChange={(event) =>
                setRequiredSkills(event.target.value)
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
              placeholder="Registration, Logistics, Crowd Management"
              value={availableRoles}
              onChange={(event) =>
                setAvailableRoles(event.target.value)
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
              placeholder="Age 18+, carry ID card, wear formal clothing"
              value={requirements}
              onChange={(event) =>
                setRequirements(event.target.value)
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
                  setEventType(event.target.value)
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
                  placeholder="Example: 500"
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
            FORM MESSAGE
        ================================================== */}

        {message && (
          <div className="form-message">
            {message}
          </div>
        )}


        {/* ==================================================
            CREATE EVENT BUTTON
        ================================================== */}

        <button
          className="primary-button"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Creating Event..."
            : "➕ Create Event"}
        </button>
      </form>
    </div>
  );
}

export default CreateEvent;