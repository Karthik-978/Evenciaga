import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase";
import "./VolunteerDetails.css";

function VolunteerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [volunteer, setVolunteer] = useState(null);

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [ratingRecords, setRatingRecords] = useState([]);
  const [certificateRecords, setCertificateRecords] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);

  const [eventTitles, setEventTitles] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadVolunteerDetails = async () => {
      try {
        setLoading(true);
        setError("");

        if (!id) {
          setError("Volunteer ID was not found.");
          return;
        }

        // Load volunteer profile
        const volunteerRef = doc(db, "users", id);
        const volunteerSnapshot = await getDoc(volunteerRef);

        if (!volunteerSnapshot.exists()) {
          setError("Volunteer profile was not found.");
          return;
        }

        setVolunteer({
          id: volunteerSnapshot.id,
          ...volunteerSnapshot.data(),
        });

        // Attendance query
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("volunteerId", "==", id)
        );

        // Ratings query
        const ratingsQuery = query(
          collection(db, "ratings"),
          where("volunteerId", "==", id)
        );

        // Certificates query
        const certificatesQuery = query(
          collection(db, "certificates"),
          where("volunteerId", "==", id)
        );

        // Approved requests query
        const requestsQuery = query(
          collection(db, "joinRequests"),
          where("volunteerId", "==", id),
          where("status", "==", "approved")
        );

        // Run all queries
        const [
          attendanceSnapshot,
          ratingsSnapshot,
          certificatesSnapshot,
          requestsSnapshot,
        ] = await Promise.all([
          getDocs(attendanceQuery),
          getDocs(ratingsQuery),
          getDocs(certificatesQuery),
          getDocs(requestsQuery),
        ]);

        // Convert snapshots to arrays
        const attendanceData = attendanceSnapshot.docs.map((record) => ({
          id: record.id,
          ...record.data(),
        }));

        const ratingsData = ratingsSnapshot.docs.map((record) => ({
          id: record.id,
          ...record.data(),
        }));

        const certificatesData = certificatesSnapshot.docs.map(
          (record) => ({
            id: record.id,
            ...record.data(),
          })
        );

        const requestsData = requestsSnapshot.docs.map((record) => ({
          id: record.id,
          ...record.data(),
        }));

        // Save records
        setAttendanceRecords(attendanceData);
        setRatingRecords(ratingsData);
        setCertificateRecords(certificatesData);
        setApprovedRequests(requestsData);

        // Collect all event IDs
        const allEventIds = [
          ...attendanceData.map((record) => record.eventId),
          ...ratingsData.map((record) => record.eventId),
          ...certificatesData.map((record) => record.eventId),
          ...requestsData.map((record) => record.eventId),
        ].filter(Boolean);

        const uniqueEventIds = [...new Set(allEventIds)];

        // Load event titles from events collection
        const titles = {};

        for (const eventId of uniqueEventIds) {
          try {
            const eventSnapshot = await getDoc(
              doc(db, "events", eventId)
            );

            if (eventSnapshot.exists()) {
              titles[eventId] =
                eventSnapshot.data().title || "Unknown Event";
            } else {
              titles[eventId] = "Unknown Event";
            }
          } catch (eventError) {
            console.error(
              `Unable to load event ${eventId}:`,
              eventError
            );

            titles[eventId] = "Unknown Event";
          }
        }

        setEventTitles(titles);
      } catch (err) {
        console.error("Error loading volunteer details:", err);

        setError(
          err?.message ||
            "Unable to load the volunteer details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadVolunteerDetails();
  }, [id]);

  const statistics = useMemo(() => {
    const presentRecords = attendanceRecords.filter((record) => {
      const status = String(
        record.status ||
          record.attendanceStatus ||
          ""
      ).toLowerCase();

      return status === "present";
    });

    const attendancePercentage =
      attendanceRecords.length > 0
        ? Math.round(
            (presentRecords.length /
              attendanceRecords.length) *
              100
          )
        : 0;

    const validRatings = ratingRecords
      .map((record) =>
        Number(
          record.rating ??
            record.ratingValue ??
            record.stars
        )
      )
      .filter(
        (rating) =>
          Number.isFinite(rating) &&
          rating > 0
      );

    const averageRating =
      validRatings.length > 0
        ? (
            validRatings.reduce(
              (total, rating) =>
                total + rating,
              0
            ) / validRatings.length
          ).toFixed(1)
        : "0.0";

    const totalVolunteerHours =
      approvedRequests.reduce(
        (total, request) => {
          const hours = Number(
            request.eventHours ??
              request.volunteerHours ??
              request.hours ??
              0
          );

          return (
            total +
            (Number.isFinite(hours)
              ? hours
              : 0)
          );
        },
        0
      );

    return {
      attendancePercentage,
      averageRating,
      totalVolunteerHours,
      completedEvents: presentRecords.length,
      certificateCount:
        certificateRecords.length,
    };
  }, [
    attendanceRecords,
    ratingRecords,
    certificateRecords,
    approvedRequests,
  ]);
  const eventHistory = useMemo(() => {
  const historyMap = {};

  approvedRequests.forEach((request) => {
    if (!request.eventId) {
      return;
    }

    historyMap[request.eventId] = {
      eventId: request.eventId,

      eventTitle:
        request.eventTitle ||
        eventTitles[request.eventId] ||
        "Unknown Event",

      eventHours: Number(
        request.eventHours ??
          request.volunteerHours ??
          request.hours ??
          0
      ),

      requestedRole:
        request.requestedRole ||
        request.role ||
        "Role not provided",

      date:
        request.eventDate ||
        request.date ||
        null,

      attendance: "Not marked",

      rating: null,

      feedback: "",
    };
  });

  attendanceRecords.forEach((record) => {
    if (!record.eventId) {
      return;
    }

    if (!historyMap[record.eventId]) {
      historyMap[record.eventId] = {
        eventId: record.eventId,

        eventTitle:
          record.eventTitle ||
          eventTitles[record.eventId] ||
          "Unknown Event",

        eventHours: Number(
          record.eventHours || 0
        ),

        requestedRole:
          record.requestedRole ||
          record.role ||
          "Role not provided",

        date:
          record.eventDate ||
          record.date ||
          null,

        attendance: "Not marked",

        rating: null,

        feedback: "",
      };
    }

    historyMap[record.eventId].attendance =
      record.status ||
      record.attendanceStatus ||
      "Not marked";
  });

  ratingRecords.forEach((record) => {
    if (!record.eventId) {
      return;
    }

    if (!historyMap[record.eventId]) {
      historyMap[record.eventId] = {
        eventId: record.eventId,

        eventTitle:
          record.eventTitle ||
          eventTitles[record.eventId] ||
          "Unknown Event",

        eventHours: Number(
          record.eventHours || 0
        ),

        requestedRole:
          record.requestedRole ||
          record.role ||
          "Role not provided",

        date:
          record.eventDate ||
          record.date ||
          null,

        attendance: "Not marked",

        rating: null,

        feedback: "",
      };
    }

    historyMap[record.eventId].rating =
      record.rating ??
      record.ratingValue ??
      record.stars ??
      null;

    historyMap[record.eventId].feedback =
      record.feedback || "";
  });

  return Object.values(historyMap);
}, [
  approvedRequests,
  attendanceRecords,
  ratingRecords,
  eventTitles,
]);
const renderStars = (rating) => {
  const value = Math.round(Number(rating) || 0);

  return "★".repeat(value) + "☆".repeat(5 - value);
};

const formatDate = (value) => {
  if (!value) {
    return "Date not available";
  }

  if (value?.toDate) {
    return value.toDate().toLocaleDateString();
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return parsedDate.toLocaleDateString();
};

  if (loading) {
    return (
      <div className="volunteer-details-page">
        <div className="volunteer-details-message">
          Loading volunteer details...
        </div>
      </div>
    );
  }

  if (error || !volunteer) {
    return (
      <div className="volunteer-details-page">
        <div className="volunteer-details-message error-message">
          <h2>Unable to open profile</h2>

          <p>
            {error ||
              "Volunteer profile was not found."}
          </p>

          <button
            type="button"
            className="back-button"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const skills = Array.isArray(volunteer.skills)
    ? volunteer.skills
    : volunteer.skills
      ? String(volunteer.skills)
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      : [];

  const interests = Array.isArray(
    volunteer.interests
  )
    ? volunteer.interests
    : volunteer.interests
      ? String(volunteer.interests)
          .split(",")
          .map((interest) =>
            interest.trim()
          )
          .filter(Boolean)
      : [];

  const languages = Array.isArray(
    volunteer.languages
  )
    ? volunteer.languages
    : volunteer.languages
      ? String(volunteer.languages)
          .split(",")
          .map((language) =>
            language.trim()
          )
          .filter(Boolean)
      : [];

  const availability = Array.isArray(volunteer.availability)
    ? volunteer.availability
    : volunteer.availability
      ? String(volunteer.availability)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  const preferredRoles = Array.isArray(volunteer.preferredRoles)
    ? volunteer.preferredRoles
    : volunteer.preferredRoles
      ? String(volunteer.preferredRoles)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  const preferredEventTypes = Array.isArray(
    volunteer.preferredEventTypes
  )
    ? volunteer.preferredEventTypes
    : volunteer.preferredEventTypes
      ? String(volunteer.preferredEventTypes)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  return (
    <div className="volunteer-details-page">
      <div className="volunteer-details-container">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <section className="profile-header-card improved-profile-header">
  <div className="profile-photo-wrapper">
    {volunteer.photoURL ? (
      <img
        src={volunteer.photoURL}
        alt={`${
          volunteer.name ||
          "Volunteer"
        } profile`}
        className="profile-photo"
      />
    ) : (
      <div className="profile-photo-placeholder">
        {volunteer.name
          ?.charAt(0)
          ?.toUpperCase() || "V"}
      </div>
    )}
  </div>

  <div className="profile-header-content">
    <p className="profile-eyebrow">
      Volunteer Profile
    </p>

    <h1>
      {volunteer.name ||
        "Volunteer"}
    </h1>

    <div className="profile-rating-row">
      <span className="profile-stars">
        {renderStars(
          statistics.averageRating
        )}
      </span>

      <strong>
        {statistics.averageRating}/5
      </strong>
    </div>

    <p className="profile-subtitle">
      {volunteer.college ||
        "College not provided"}
    </p>

    <p className="profile-location">
      📍{" "}
      {volunteer.city ||
        "City not provided"}
    </p>

    <div className="profile-badges">
      <span className="profile-summary-badge">
        {
          statistics.attendancePercentage
        }
        % Attendance
      </span>

      <span className="profile-summary-badge">
        {statistics.completedEvents}{" "}
        Events Attended
      </span>

      <span className="profile-summary-badge">
        {statistics.certificateCount}{" "}
        Certificates
      </span>
    </div>
  </div>
</section>

        <section className="statistics-grid">
  <div className="stat-card">
    <span className="stat-icon">
      ⭐
    </span>

    <span className="stat-value">
      {statistics.averageRating}
    </span>

    <span className="stat-label">
      Average Rating
    </span>
  </div>

  <div className="stat-card">
    <span className="stat-icon">
      📅
    </span>

    <span className="stat-value">
      {
        statistics.attendancePercentage
      }
      %
    </span>

    <span className="stat-label">
      Attendance
    </span>
  </div>

  <div className="stat-card">
    <span className="stat-icon">
      🏆
    </span>

    <span className="stat-value">
      {statistics.completedEvents}
    </span>

    <span className="stat-label">
      Events Attended
    </span>
  </div>

  <div className="stat-card">
    <span className="stat-icon">
      ⏰
    </span>

    <span className="stat-value">
      {statistics.totalVolunteerHours}
    </span>

    <span className="stat-label">
      Volunteer Hours
    </span>
  </div>

  <div className="stat-card">
    <span className="stat-icon">
      🎖
    </span>

    <span className="stat-value">
      {statistics.certificateCount}
    </span>

    <span className="stat-label">
      Certificates
    </span>
  </div>
</section>
        <section className="details-card">
          <h2>Personal Information</h2>

          <div className="information-grid">
            <div className="information-item">
              <span className="information-label">
                Name
              </span>

              <span>
                {volunteer.name ||
                  "Not provided"}
              </span>
            </div>

            <div className="information-item">
              <span className="information-label">
                Age
              </span>

              <span>
                {volunteer.age ||
                  "Not provided"}
              </span>
            </div>

            <div className="information-item">
              <span className="information-label">
                City
              </span>

              <span>
                {volunteer.city ||
                  "Not provided"}
              </span>
            </div>

            <div className="information-item">
              <span className="information-label">
                College
              </span>

              <span>
                {volunteer.college ||
                  "Not provided"}
              </span>
            </div>

            <div className="information-item">
              <span className="information-label">
                Email
              </span>

              <span>
                {volunteer.email ||
                  "Not provided"}
              </span>
            </div>

            <div className="information-item">
              <span className="information-label">
                Phone
              </span>

              <span>
                {volunteer.phone ||
                  "Not provided"}
              </span>
            </div>
          </div>
        </section>

        <section className="details-card">
          <h2>About Me</h2>

          <p className="profile-bio">
            {volunteer.bio || "No bio provided."}
          </p>
        </section>

        <section className="details-card">
          <h2>Education</h2>

          <div className="information-grid">
            <div className="information-item">
              <span className="information-label">College</span>
              <span>{volunteer.college || "Not provided"}</span>
            </div>

            <div className="information-item">
              <span className="information-label">Degree</span>
              <span>{volunteer.degree || "Not provided"}</span>
            </div>

            <div className="information-item">
              <span className="information-label">Graduation Year</span>
              <span>{volunteer.graduationYear || "Not provided"}</span>
            </div>

            <div className="information-item">
              <span className="information-label">State</span>
              <span>{volunteer.state || "Not provided"}</span>
            </div>
          </div>
        </section>

        <section className="details-card">
          <h2>Skills</h2>

          <div className="tag-list">
            {skills.length > 0 ? (
              skills.map(
                (skill, index) => (
                  <span
                    className="profile-tag"
                    key={`${skill}-${index}`}
                  >
                    {skill}
                  </span>
                )
              )
            ) : (
              <p className="empty-text">
                No skills added.
              </p>
            )}
          </div>
        </section>

        <section className="details-card">
          <h2>Languages</h2>

          <div className="tag-list">
            {languages.length > 0 ? (
              languages.map(
                (language, index) => (
                  <span
                    className="profile-tag"
                    key={`${language}-${index}`}
                  >
                    {language}
                  </span>
                )
              )
            ) : (
              <p className="empty-text">
                No languages added.
              </p>
            )}
          </div>
        </section>

        <section className="details-card">
          <h2>Interests</h2>

          <div className="tag-list">
            {interests.length > 0 ? (
              interests.map(
                (interest, index) => (
                  <span
                    className="profile-tag"
                    key={`${interest}-${index}`}
                  >
                    {interest}
                  </span>
                )
              )
            ) : (
              <p className="empty-text">
                No interests added.
              </p>
            )}
          </div>
        </section>

        <section className="details-card">
          <h2>Availability</h2>

          <div className="tag-list">
            {availability.length > 0 ? (
              availability.map((item, index) => (
                <span className="profile-tag" key={`${item}-${index}`}>
                  {item}
                </span>
              ))
            ) : (
              <p className="empty-text">No availability added.</p>
            )}
          </div>
        </section>

        <section className="details-card">
          <h2>Preferred Roles</h2>

          <div className="tag-list">
            {preferredRoles.length > 0 ? (
              preferredRoles.map((item, index) => (
                <span className="profile-tag" key={`${item}-${index}`}>
                  {item}
                </span>
              ))
            ) : (
              <p className="empty-text">No preferred roles added.</p>
            )}
          </div>
        </section>

        <section className="details-card">
          <h2>Preferred Event Types</h2>

          <div className="tag-list">
            {preferredEventTypes.length > 0 ? (
              preferredEventTypes.map((item, index) => (
                <span className="profile-tag" key={`${item}-${index}`}>
                  {item}
                </span>
              ))
            ) : (
              <p className="empty-text">No preferred event types added.</p>
            )}
          </div>
        </section>

        <section className="details-card">
          <h2>LinkedIn</h2>

          {volunteer.linkedin ? (
            <a
              href={volunteer.linkedin}
              target="_blank"
              rel="noreferrer"
              className="certificate-link"
            >
              Open LinkedIn Profile
            </a>
          ) : (
            <p className="empty-text">No LinkedIn profile added.</p>
          )}
        </section>

      <section className="details-card">
  <div className="section-heading-row">
    <div>
      <p className="section-eyebrow">
        Experience
      </p>

      <h2>Event History</h2>
    </div>

    <span className="history-count">
      {eventHistory.length} Events
    </span>
  </div>

  {eventHistory.length > 0 ? (
    <div className="history-list">
      {eventHistory.map((event) => (
        <div
          className="history-item improved-history-item"
          key={event.eventId}
        >
          <div className="history-main-content">
            <div className="history-title-row">
              <h3>
                {event.eventTitle}
              </h3>

              <span
                className={`attendance-badge ${String(
  event.attendance
)
  .toLowerCase()
  .replaceAll(" ", "-")}`}
              >
                {event.attendance}
              </span>
            </div>

            <div className="history-details-grid">
              <p>
                <span>📅 Date</span>

                <strong>
                  {formatDate(
                    event.date
                  )}
                </strong>
              </p>

              <p>
                <span>⏰ Hours</span>

                <strong>
                  {event.eventHours || 0}
                </strong>
              </p>

              <p>
                <span>🧑‍💼 Role</span>

                <strong>
                  {event.requestedRole}
                </strong>
              </p>

              <p>
                <span>⭐ Rating</span>

                <strong>
                  {event.rating
                    ? `${renderStars(
                        event.rating
                      )} ${
                        event.rating
                      }/5`
                    : "Not rated"}
                </strong>
              </p>
            </div>

            {event.feedback && (
              <div className="feedback-box">
                <strong>
                  Organizer feedback
                </strong>

                <p>
                  {event.feedback}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="profile-empty-state">
      <span>📅</span>

      <h3>
        No event history yet
      </h3>

      <p>
        This volunteer has no recorded
        event participation.
      </p>
    </div>
  )}
</section>

        <section className="details-card">
          <h2>Certificates</h2>

          {certificateRecords.length >
          0 ? (
            <div className="history-list">
              {certificateRecords.map(
                (certificate) => (
                  <div
                    className="history-item"
                    key={certificate.id}
                  >
                    <div>
                      <h3>
                        {certificate.eventTitle ||
                          eventTitles[
                            certificate.eventId
                          ] ||
                          certificate.certificateTitle ||
                          "Participation Certificate"}
                      </h3>

                      <p>
                        Certificate issued
                      </p>
                    </div>

                    {certificate.certificateURL && (
                      <a
                        href={
                          certificate.certificateURL
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="certificate-link"
                      >
                        View Certificate
                      </a>
                    )}
                  </div>
                )
              )}
            </div>
          ) : (
            <p className="empty-text">
              No certificates available.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export default VolunteerDetails;