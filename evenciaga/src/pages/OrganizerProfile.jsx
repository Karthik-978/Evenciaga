// ==========================================================
// REACT AND ROUTER IMPORTS
// ==========================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";

// ==========================================================
// COMPONENT IMPORTS
// ==========================================================

import BackButton from "../components/BackButton";
import "./OrganizerProfile.css";

// ==========================================================
// INITIAL STATISTICS
// ==========================================================

const INITIAL_STATS = {
  totalEvents: 0,
  activeEvents: 0,
  completedEvents: 0,
  volunteersManaged: 0,
  certificatesIssued: 0,
  averageRating: "0.0",
};

// ==========================================================
// ORGANIZER PROFILE COMPONENT
// ==========================================================

function OrganizerProfile() {
  const navigate = useNavigate();

  const [userData, setUserData] = useState(null);
  const [applicationData, setApplicationData] = useState(null);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(INITIAL_STATS);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ========================================================
  // LOAD ORGANIZER PROFILE DATA
  // ========================================================

  useEffect(() => {
    const loadOrganizerProfile = async () => {
      try {
        setLoading(true);
        setError("");

        const currentUser = auth.currentUser;

        if (!currentUser) {
          setError("You must be logged in.");
          return;
        }

        const userSnapshot = await getDoc(
          doc(db, "users", currentUser.uid)
        );

        if (!userSnapshot.exists()) {
          setError("User profile was not found.");
          return;
        }

        const currentUserData = userSnapshot.data();
        setUserData(currentUserData);

        const applicationSnapshot = await getDocs(
          query(
            collection(db, "organizerApplications"),
            where("uid", "==", currentUser.uid)
          )
        );

        let latestApplication = null;

        if (!applicationSnapshot.empty) {
          const applications = applicationSnapshot.docs.map(
            (applicationDocument) => ({
              id: applicationDocument.id,
              ...applicationDocument.data(),
            })
          );

          applications.sort((first, second) => {
            const firstTime =
              first.submittedAt?.toMillis?.() || 0;
            const secondTime =
              second.submittedAt?.toMillis?.() || 0;

            return secondTime - firstTime;
          });

          latestApplication = applications[0];
          setApplicationData(latestApplication);
        }

        const eventsSnapshot = await getDocs(
          query(
            collection(db, "events"),
            where("organizerId", "==", currentUser.uid)
          )
        );

        const organizerEvents = eventsSnapshot.docs.map(
          (eventDocument) => ({
            id: eventDocument.id,
            ...eventDocument.data(),
          })
        );

        setEvents(organizerEvents);

        const organizerEventIds = organizerEvents.map(
          (event) => event.id
        );

        const joinRequestsSnapshot = await getDocs(
          collection(db, "joinRequests")
        );

        const approvedRequests = joinRequestsSnapshot.docs
          .map((requestDocument) => ({
            id: requestDocument.id,
            ...requestDocument.data(),
          }))
          .filter(
            (request) =>
              organizerEventIds.includes(request.eventId) &&
              request.status === "approved"
          );

        const certificateSnapshot = await getDocs(
          query(
            collection(db, "certificates"),
            where("organizerId", "==", currentUser.uid)
          )
        );

        const ratingsSnapshot = await getDocs(
          collection(db, "ratings")
        );

        const validRatings = ratingsSnapshot.docs
          .map((ratingDocument) => ({
            ...ratingDocument.data(),
          }))
          .filter((rating) =>
            organizerEventIds.includes(rating.eventId)
          )
          .map((rating) => Number(rating.rating || 0))
          .filter(
            (ratingValue) =>
              Number.isFinite(ratingValue) &&
              ratingValue > 0
          );

        const averageRating =
          validRatings.length > 0
            ? (
                validRatings.reduce(
                  (total, ratingValue) =>
                    total + ratingValue,
                  0
                ) / validRatings.length
              ).toFixed(1)
            : "0.0";

        setStats({
          totalEvents: organizerEvents.length,
          activeEvents: organizerEvents.filter(
            (event) => event.status === "active"
          ).length,
          completedEvents: organizerEvents.filter(
            (event) => event.status === "completed"
          ).length,
          volunteersManaged: approvedRequests.length,
          certificatesIssued: certificateSnapshot.size,
          averageRating,
        });
      } catch (profileError) {
        console.error(
          "Organizer profile error:",
          profileError
        );

        setError(
          profileError?.message ||
            "Unable to load organizer profile."
        );
      } finally {
        setLoading(false);
      }
    };

    loadOrganizerProfile();
  }, []);

  // ========================================================
  // DERIVED VALUES
  // ========================================================

  const organizerStatus =
    userData?.organizerStatus ||
    applicationData?.status ||
    (userData?.organizerApproved
      ? "approved"
      : "pending");

  const isApproved = organizerStatus === "approved";

  const organizerName =
    userData?.name ||
    applicationData?.fullName ||
    "Organizer";

  const organizationName =
    userData?.organizationName ||
    applicationData?.organizationName ||
    "Organization name not added";

  const organizationType =
    userData?.organizationType ||
    applicationData?.organizationType ||
    "Organization type not added";

  const city =
    userData?.city ||
    applicationData?.city ||
    "City not added";

  const purpose =
    userData?.organizationPurpose ||
    userData?.purpose ||
    applicationData?.purpose ||
    "No organization description added.";

  const proofLink =
    userData?.proofLink ||
    applicationData?.proofLink ||
    "";

  const profileInitial =
    organizationName?.charAt(0)?.toUpperCase() ||
    organizerName?.charAt(0)?.toUpperCase() ||
    "O";

  const recentEvents = useMemo(() => {
    return [...events]
      .sort((first, second) => {
        const firstDate = new Date(
          first.date ||
            first.createdAt?.toDate?.() ||
            0
        );

        const secondDate = new Date(
          second.date ||
            second.createdAt?.toDate?.() ||
            0
        );

        return secondDate - firstDate;
      })
      .slice(0, 4);
  }, [events]);

  const formatEventDate = (value) => {
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
      <div className="organizer-profile-page">
        <div className="organizer-profile-state">
          <h2>Loading organizer profile...</h2>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="organizer-profile-page">
        <div className="organizer-profile-state error">
          <h2>Unable to load organizer profile</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="organizer-profile-page">
      <div className="organizer-profile-container">

        <div className="organizer-profile-topbar">
          <BackButton />

          <button
            type="button"
            className="organizer-profile-edit-button"
            onClick={() =>
              navigate("/edit-organizer-profile")
            }
          >
            ✏️ Edit Organizer Profile
          </button>
        </div>

        <section className="organizer-profile-hero">
          <div className="organizer-profile-logo">
            {userData.organizationLogo ||
            userData.photoURL ? (
              <img
                src={
                  userData.organizationLogo ||
                  userData.photoURL
                }
                alt={organizationName}
              />
            ) : (
              <span>{profileInitial}</span>
            )}
          </div>

          <div className="organizer-profile-hero-content">
            <p className="organizer-profile-eyebrow">
              Organizer Profile
            </p>

            <h1>{organizationName}</h1>

            <p className="organizer-profile-owner">
              Managed by {organizerName}
            </p>

            <div className="organizer-profile-badges">
              <span
                className={
                  isApproved
                    ? "organizer-profile-status approved"
                    : "organizer-profile-status pending"
                }
              >
                {isApproved
                  ? "✓ Verified Organizer"
                  : "Verification Pending"}
              </span>

              <span className="organizer-profile-type">
                {organizationType}
              </span>
            </div>

            <p className="organizer-profile-location">
              📍 {city}
            </p>
          </div>
        </section>

        <section className="organizer-profile-stats">
          <div className="organizer-profile-stat-card">
            <span>📅</span>
            <strong>{stats.totalEvents}</strong>
            <small>Total Events</small>
          </div>

          <div className="organizer-profile-stat-card">
            <span>🟢</span>
            <strong>{stats.activeEvents}</strong>
            <small>Active Events</small>
          </div>

          <div className="organizer-profile-stat-card">
            <span>✅</span>
            <strong>{stats.completedEvents}</strong>
            <small>Completed</small>
          </div>

          <div className="organizer-profile-stat-card">
            <span>👥</span>
            <strong>{stats.volunteersManaged}</strong>
            <small>Volunteers Managed</small>
          </div>

          <div className="organizer-profile-stat-card">
            <span>🏆</span>
            <strong>{stats.certificatesIssued}</strong>
            <small>Certificates</small>
          </div>

          <div className="organizer-profile-stat-card">
            <span>⭐</span>
            <strong>{stats.averageRating}</strong>
            <small>Average Rating</small>
          </div>
        </section>

        <section className="organizer-profile-card">
          <h2>About Organization</h2>
          <p>{purpose}</p>
        </section>

        <section className="organizer-profile-card">
          <h2>Organization Information</h2>

          <div className="organizer-profile-info-grid">
            <div>
              <span>Organizer Name</span>
              <strong>{organizerName}</strong>
            </div>

            <div>
              <span>Organization Name</span>
              <strong>{organizationName}</strong>
            </div>

            <div>
              <span>Organization Type</span>
              <strong>{organizationType}</strong>
            </div>

            <div>
              <span>City</span>
              <strong>{city}</strong>
            </div>

            <div>
              <span>Email</span>
              <strong>
                {userData.email ||
                  applicationData?.email ||
                  "Not provided"}
              </strong>
            </div>

            <div>
              <span>Phone</span>
              <strong>
                {userData.phone || "Not provided"}
              </strong>
            </div>
          </div>
        </section>

        <section className="organizer-profile-card">
          <h2>Professional Links</h2>

          <div className="organizer-profile-links">
            {userData.website && (
              <a
                href={userData.website}
                target="_blank"
                rel="noreferrer"
              >
                🌐 Website
              </a>
            )}

            {userData.linkedin && (
              <a
                href={userData.linkedin}
                target="_blank"
                rel="noreferrer"
              >
                💼 LinkedIn
              </a>
            )}

            {userData.instagram && (
              <a
                href={userData.instagram}
                target="_blank"
                rel="noreferrer"
              >
                📷 Instagram
              </a>
            )}

            {proofLink && (
              <a
                href={proofLink}
                target="_blank"
                rel="noreferrer"
              >
                📄 Verification Proof
              </a>
            )}

            {!userData.website &&
              !userData.linkedin &&
              !userData.instagram &&
              !proofLink && (
                <p>No professional links added.</p>
              )}
          </div>
        </section>

        <section className="organizer-profile-card">
          <div className="organizer-profile-section-heading">
            <div>
              <p className="organizer-profile-eyebrow">
                Event Activity
              </p>

              <h2>Recent Events</h2>
            </div>

            <button
              type="button"
              onClick={() => navigate("/my-events")}
            >
              View All →
            </button>
          </div>

          {recentEvents.length > 0 ? (
            <div className="organizer-profile-events">
              {recentEvents.map((event) => (
                <article key={event.id}>
                  <div>
                    <h3>
                      {event.title || "Untitled Event"}
                    </h3>

                    <p>
                      📍{" "}
                      {event.location ||
                        "Location not added"}
                    </p>

                    <p>
                      📅 {formatEventDate(event.date)}
                    </p>
                  </div>

                  <span
                    className={`organizer-profile-event-status ${
                      event.status || "active"
                    }`}
                  >
                    {event.status || "active"}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="organizer-profile-empty">
              <span>📅</span>
              <h3>No events created yet</h3>
              <p>Your created events will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default OrganizerProfile;