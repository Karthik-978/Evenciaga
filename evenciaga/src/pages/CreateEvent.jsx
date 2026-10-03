import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

function CreateEvent() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    locationAddress: "",
    category: "",
    expectedCrowd: "",
    eventHours: "",
    eventType: "volunteer",
    paymentPerPerson: "",
    notes: "",
  });

  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    address: "",
    googleMapsUrl: "",
  });

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationError, setLocationError] =
    useState("");

  const [saving, setSaving] = useState(false);

  const [success, setSuccess] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    if (!form.startTime || !form.endTime) {
      return;
    }

    const calculateHours = () => {
      const [startHour, startMinute] =
        form.startTime.split(":").map(Number);

      const [endHour, endMinute] =
        form.endTime.split(":").map(Number);

      let start =
        startHour * 60 + startMinute;

      let end =
        endHour * 60 + endMinute;

      if (end < start) {
        end += 24 * 60;
      }

      const difference = end - start;

      if (difference > 0) {
        const hours = (
          difference / 60
        ).toFixed(2);

        setForm((current) => ({
          ...current,
          eventHours: hours,
        }));
      }
    };

    calculateHours();
  }, [form.startTime, form.endTime]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const getCurrentLocation = () => {
    setLocationLoading(true);
    setLocationError("");
    setError("");
    setSuccess("");

    if (!navigator.geolocation) {
      setLocationError(
        "Location services are not supported by this browser."
      );

      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          const googleMapsUrl =
            `https://www.google.com/maps?q=${latitude},${longitude}`;

          let address =
            `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

          /*
           * Reverse geocoding:
           * Converts GPS coordinates into a readable
           * address.
           *
           * BigDataCloud provides a public client-side
           * reverse geocoding endpoint.
           */
          try {
            const response =
              await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
              );

            if (response.ok) {
              const data =
                await response.json();

              const parts = [
                data.locality,
                data.city,
                data.principalSubdivision,
                data.countryName,
              ].filter(Boolean);

              if (parts.length) {
                address =
                  parts.join(", ");
              }
            }
          } catch (reverseError) {
            console.warn(
              "Reverse geocoding failed:",
              reverseError
            );
          }

          setLocation({
            latitude,
            longitude,
            address,
            googleMapsUrl,
          });

          setForm((current) => ({
            ...current,
            locationAddress: address,
          }));

          setSuccess(
            "Location detected successfully."
          );
        } catch (locationProcessError) {
          console.error(
            "Location processing error:",
            locationProcessError
          );

          setLocationError(
            "Location was detected, but the address could not be processed."
          );
        } finally {
          setLocationLoading(false);
        }
      },

      (geoError) => {
        console.error(
          "Geolocation error:",
          geoError
        );

        let message =
          "Unable to detect your location.";

        if (
          geoError.code ===
          geoError.PERMISSION_DENIED
        ) {
          message =
            "Location permission was denied. Allow location access in your browser and try again.";
        }

        if (
          geoError.code ===
          geoError.POSITION_UNAVAILABLE
        ) {
          message =
            "Your current location is unavailable.";
        }

        if (
          geoError.code ===
          geoError.TIMEOUT
        ) {
          message =
            "Location request timed out. Try again.";
        }

        setLocationError(message);
        setLocationLoading(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const clearLocation = () => {
    setLocation({
      latitude: null,
      longitude: null,
      address: "",
      googleMapsUrl: "",
    });

    setForm((current) => ({
      ...current,
      locationAddress: "",
    }));

    setLocationError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      return "Event title is required.";
    }

    if (!form.description.trim()) {
      return "Event description is required.";
    }

    if (!form.date) {
      return "Event date is required.";
    }

    if (!form.startTime) {
      return "Start time is required.";
    }

    if (!form.endTime) {
      return "End time is required.";
    }

    if (!form.category.trim()) {
      return "Event category is required.";
    }

    if (!form.expectedCrowd) {
      return "Expected crowd is required.";
    }

    if (
      Number(form.expectedCrowd) <= 0
    ) {
      return "Expected crowd must be greater than zero.";
    }

    if (
      !form.eventHours ||
      Number(form.eventHours) <= 0
    ) {
      return "Please provide a valid event duration.";
    }

    if (!form.locationAddress.trim()) {
      return "Event location is required.";
    }

    if (
      form.eventType === "paid" &&
      (
        !form.paymentPerPerson ||
        Number(form.paymentPerPerson) <= 0
      )
    ) {
      return "Enter a valid payment amount for a paid event.";
    }

    return "";
  };

  const createEvent = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setError(
        "You must be logged in to create an event."
      );
      return;
    }

    try {
      setSaving(true);

      /*
       * IMPORTANT:
       *
       * The event is NOT immediately published.
       *
       * It first goes into staffing_pending.
       *
       * Administration prepares the staffing plan.
       */

      const eventData = {
        title: form.title.trim(),

        description:
          form.description.trim(),

        date: form.date,

        startTime: form.startTime,

        endTime: form.endTime,

        eventHours:
          Number(form.eventHours),

        category:
          form.category.trim(),

        expectedCrowd:
          Number(form.expectedCrowd),

        locationAddress:
          form.locationAddress.trim(),

        eventLocation:
          form.locationAddress.trim(),

        latitude:
          location.latitude,

        longitude:
          location.longitude,

        googleMapsUrl:
          location.googleMapsUrl,

        eventType:
          form.eventType,

        paymentPerPerson:
          form.eventType === "paid"
            ? Number(
                form.paymentPerPerson
              )
            : 0,

        notes:
          form.notes.trim(),

        organizerId:
          user.uid,

        organizerEmail:
          user.email || "",

        organizerName:
          user.displayName || "",

        /*
         * Staffing flow.
         */
        staffingStatus:
          "staffing_pending",

        status:
          "staffing_pending",

        requiredVolunteers: 0,

        primaryLimit: 0,

        standbyLimit: 0,

        staffingPlan: [],

        createdAt:
          serverTimestamp(),
      };

      const eventReference =
        await addDoc(
          collection(db, "events"),
          eventData
        );

      /*
       * Create the staffing request that
       * administration will receive.
       */
      await addDoc(
        collection(db, "staffingRequests"),
        {
          eventId:
            eventReference.id,

          eventTitle:
            form.title.trim(),

          eventDate:
            form.date,

          eventLocation:
            form.locationAddress.trim(),

          locationAddress:
            form.locationAddress.trim(),

          latitude:
            location.latitude,

          longitude:
            location.longitude,

          googleMapsUrl:
            location.googleMapsUrl,

          eventCategory:
            form.category.trim(),

          expectedCrowd:
            Number(form.expectedCrowd),

          eventHours:
            Number(form.eventHours),

          eventType:
            form.eventType,

          paymentPerPerson:
            form.eventType === "paid"
              ? Number(
                  form.paymentPerPerson
                )
              : 0,

          notes:
            form.notes.trim(),

          organizerId:
            user.uid,

          organizerEmail:
            user.email || "",

          status:
            "pending",

          proposedRoles: [],

          proposedStandby: 0,

          totalVolunteers: 0,

          createdAt:
            serverTimestamp(),
        }
      );

      /*
       * Notify administration.
       *
       * AdminStaffingRequests reads the
       * staffingRequests collection directly,
       * so this notification is supplementary.
       */
      await addDoc(
        collection(
          db,
          "adminNotifications"
        ),
        {
          type:
            "new_staffing_request",

          title:
            "New Staffing Request",

          message:
            `${form.title.trim()} needs a staffing plan.`,

          eventId:
            eventReference.id,

          organizerId:
            user.uid,

          isRead: false,

          createdAt:
            serverTimestamp(),
        }
      );

      setSuccess(
        "Event created and staffing request submitted successfully."
      );

      /*
       * Give Firestore a moment to complete before
       * returning to the organizer dashboard.
       */
      setTimeout(() => {
        navigate(
          "/organizer-dashboard"
        );
      }, 1200);
    } catch (createError) {
      console.error(
        "Create event error:",
        createError
      );

      setError(
        createError?.message ||
          "Failed to create event."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">

      <section className="page-card organizer-hero">

        <BackButton />

        <div>
          <p className="dashboard-eyebrow">
            Organizer
          </p>

          <h1 className="page-title">
            Create Event
          </h1>

          <p className="page-subtitle">
            Create your event and submit its
            staffing requirements for administration
            to prepare.
          </p>
        </div>

      </section>

      <form
        className="page-card"
        onSubmit={createEvent}
      >

        {error && (
          <div
            style={{
              padding: "14px",
              marginBottom: "20px",
              borderRadius: "10px",
              background: "#ffe8e8",
              color: "#b00020",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: "14px",
              marginBottom: "20px",
              borderRadius: "10px",
              background: "#e8fff0",
              color: "#087f3e",
            }}
          >
            ✓ {success}
          </div>
        )}

        <div className="form-section">

          <div className="panel-header">
            <div>
              <h2>Basic Information</h2>

              <p>
                Tell volunteers what the event
                is about.
              </p>
            </div>
          </div>

          <div className="form-grid">

            <div className="form-group">
              <label>
                Event Title *
              </label>

              <input
                className="modern-input"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Example: Beach Cleanup Drive"
              />
            </div>

            <div className="form-group">
              <label>
                Category *
              </label>

              <input
                className="modern-input"
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="Environment, Education, Health..."
              />
            </div>

          </div>

          <div className="form-group">
            <label>
              Description *
            </label>

            <textarea
              className="modern-input"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="5"
              placeholder="Describe the event, activities and what volunteers will do."
            />
          </div>

        </div>

        <div className="form-section">

          <div className="panel-header">
            <div>
              <h2>Date & Time</h2>

              <p>
                Enter when the event will take place.
              </p>
            </div>
          </div>

          <div className="form-grid">

            <div className="form-group">
              <label>
                Date *
              </label>

              <input
                className="modern-input"
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>
                Start Time *
              </label>

              <input
                className="modern-input"
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>
                End Time *
              </label>

              <input
                className="modern-input"
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>
                Duration
              </label>

              <input
                className="modern-input"
                value={
                  form.eventHours
                    ? `${form.eventHours} hours`
                    : ""
                }
                readOnly
                placeholder="Automatically calculated"
              />
            </div>

          </div>

        </div>

        <div className="form-section">

          <div className="panel-header">
            <div>
              <h2>Venue Location</h2>

              <p>
                Use your current GPS location to
                automatically fill the venue.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading
              ? "📍 Detecting Location..."
              : "📍 Use My Current Location"}
          </button>

          {locationError && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px",
                borderRadius: "8px",
                background: "#fff0f0",
                color: "#b00020",
              }}
            >
              {locationError}
            </div>
          )}

          <div
            className="form-group"
            style={{
              marginTop: "18px",
            }}
          >
            <label>
              Venue Address *
            </label>

            <input
              className="modern-input"
              name="locationAddress"
              value={form.locationAddress}
              onChange={(event) => {
                handleChange(event);

                /*
                 * If organizer manually changes the
                 * address, the GPS coordinates may no
                 * longer represent that typed address.
                 *
                 * Therefore clear the coordinates.
                 */
                setLocation((current) => ({
                  ...current,
                  address:
                    event.target.value,
                  latitude: null,
                  longitude: null,
                  googleMapsUrl: "",
                }));
              }}
              placeholder="Use current location or enter venue address"
            />
          </div>

          {location.latitude &&
            location.longitude && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "16px",
                  borderRadius: "12px",
                  background: "#f5f7fa",
                }}
              >
                <strong>
                  📍 Location Captured
                </strong>

                <p>
                  {location.address}
                </p>

                <p
                  style={{
                    fontSize: "13px",
                    opacity: 0.7,
                  }}
                >
                  Coordinates:{" "}
                  {location.latitude.toFixed(
                    6
                  )}
                  ,{" "}
                  {location.longitude.toFixed(
                    6
                  )}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <a
                    href={
                      location.googleMapsUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-button"
                  >
                    🗺 Open in Google Maps
                  </a>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={clearLocation}
                  >
                    Clear Location
                  </button>
                </div>
              </div>
            )}

        </div>

        <div className="form-section">

          <div className="panel-header">
            <div>
              <h2>Volunteer Requirements</h2>

              <p>
                Administration will create the exact
                staffing plan from this information.
              </p>
            </div>
          </div>

          <div className="form-grid">

            <div className="form-group">
              <label>
                Expected Crowd *
              </label>

              <input
                className="modern-input"
                type="number"
                min="1"
                name="expectedCrowd"
                value={
                  form.expectedCrowd
                }
                onChange={handleChange}
                placeholder="Example: 500"
              />
            </div>

          </div>

          <div
            style={{
              marginTop: "15px",
              padding: "15px",
              borderRadius: "10px",
              background: "#f5f7fa",
            }}
          >
            <strong>
              How staffing works
            </strong>

            <p>
              You don't need to manually decide
              every volunteer position here.
              After submitting the event,
              Evenciaga Administration will prepare
              the staffing plan for you.
            </p>
          </div>

        </div>

        <div className="form-section">

          <div className="panel-header">
            <div>
              <h2>Payment</h2>

              <p>
                Choose whether volunteers are paid.
              </p>
            </div>
          </div>

          <div className="form-grid">

            <div className="form-group">
              <label>
                Event Type
              </label>

              <select
                className="modern-input"
                name="eventType"
                value={form.eventType}
                onChange={handleChange}
              >
                <option value="volunteer">
                  Unpaid Volunteer Event
                </option>

                <option value="paid">
                  Paid Volunteer Event
                </option>
              </select>
            </div>

            {form.eventType ===
              "paid" && (
              <div className="form-group">
                <label>
                  Payment Per Volunteer (₹) *
                </label>

                <input
                  className="modern-input"
                  type="number"
                  min="1"
                  name="paymentPerPerson"
                  value={
                    form.paymentPerPerson
                  }
                  onChange={handleChange}
                  placeholder="Example: 500"
                />
              </div>
            )}

          </div>

        </div>

        <div className="form-section">

          <div className="form-group">
            <label>
              Additional Notes
            </label>

            <textarea
              className="modern-input"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Anything administration should know about staffing?"
            />
          </div>

        </div>

        <div
          style={{
            marginTop: "25px",
            padding: "18px",
            borderRadius: "12px",
            background: "#f5f7fa",
          }}
        >
          <strong>
            Before you submit
          </strong>

          <p>
            Your event will <strong>not</strong>{" "}
            immediately become visible to
            volunteers. It first goes to
            administration for staffing.
          </p>

          <p>
            After administration creates the
            staffing plan, you'll receive it for
            approval. Only after you approve it
            will the event be published.
          </p>
        </div>

        <div
          style={{
            marginTop: "25px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="submit"
            className="primary-button"
            disabled={saving}
          >
            {saving
              ? "Creating Event..."
              : "✓ Create Event & Request Staffing"}
          </button>
        </div>

      </form>
    </div>
  );
}

export default CreateEvent;