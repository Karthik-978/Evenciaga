// ==========================================================
// REACT AND ROUTER IMPORTS
// ==========================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";


// ==========================================================
// COMPONENT IMPORTS
// ==========================================================

import BackButton from "../components/BackButton";
import "./Profile.css";


// ==========================================================
// INITIAL STATISTICS
// ==========================================================

const INITIAL_STATS = {
  rating: 0,
  ratingCount: 0,

  eventsCompleted: 0,
  volunteerHours: 0,

  attendancePercentage: 0,

  certificatesEarned: 0,
  noShows: 0,
  excusedAbsences: 0,

  trustScore: 0,
};


// ==========================================================
// TRUST SCORE CONFIGURATION
//
// Maximum score before penalties: 100
//
// Attendance:          30 points
// Average rating:      25 points
// Certificates:        15 points
// Completed events:    15 points
// Volunteer hours:     10 points
// Profile completion:   5 points
//
// Each no-show removes 15 points.
// ==========================================================

const TRUST_SCORE_WEIGHTS = {
  attendance: 30,
  rating: 25,
  certificates: 15,
  completedEvents: 15,
  volunteerHours: 10,
  profileCompletion: 5,

  noShowPenalty: 15,
};


// ==========================================================
// PROFILE COMPONENT
// ==========================================================

function Profile() {
  // --------------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------------

  const navigate = useNavigate();


  // --------------------------------------------------------
  // AUTH STATE
  // --------------------------------------------------------

  const [currentUser, setCurrentUser] =
    useState(null);

  const [authReady, setAuthReady] =
    useState(false);


  // --------------------------------------------------------
  // COMPONENT STATE
  // --------------------------------------------------------

  const [userData, setUserData] =
    useState(null);

  const [stats, setStats] =
    useState(INITIAL_STATS);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // ========================================================
  // WAIT FOR FIREBASE AUTHENTICATION
  // ========================================================

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          setCurrentUser(
            user || null
          );

          setAuthReady(true);
        }
      );

    return unsubscribe;
  }, []);


  // ========================================================
  // HELPER: CONVERT VALUE TO ARRAY
  // ========================================================

  const toArray = (value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (!value) {
      return [];
    }

    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };


  // ========================================================
  // PROFILE COMPLETION SCORE
  // ========================================================

  const calculateProfileCompletion = (
    profile
  ) => {
    const profileFields = [
      profile.name,
      profile.phone,
      profile.age,
      profile.city,
      profile.state,
      profile.college,
      profile.degree,
      profile.bio,
      profile.photoURL,
      profile.linkedin,
    ];

    const arrayFields = [
      toArray(profile.skills),
      toArray(profile.languages),
      toArray(profile.interests),
      toArray(profile.availability),
      toArray(profile.preferredRoles),
      toArray(
        profile.preferredEventTypes
      ),
    ];

    const completedTextFields =
      profileFields.filter(Boolean).length;

    const completedArrayFields =
      arrayFields.filter(
        (items) =>
          items.length > 0
      ).length;

    const totalFields =
      profileFields.length +
      arrayFields.length;

    const completedFields =
      completedTextFields +
      completedArrayFields;

    return totalFields > 0
      ? Math.round(
          (
            completedFields /
            totalFields
          ) *
          100
        )
      : 0;
  };


  // ========================================================
  // TRUST SCORE CALCULATION
  // ========================================================

  const calculateTrustScore = ({
    attendancePercentage,
    averageRating,
    certificatesEarned,
    eventsCompleted,
    volunteerHours,
    profileCompletion,
    noShows,
  }) => {
    const attendancePoints =
      (
        Math.min(
          100,
          Math.max(
            0,
            attendancePercentage
          )
        ) /
        100
      ) *
      TRUST_SCORE_WEIGHTS.attendance;

    const ratingPoints =
      (
        Math.min(
          5,
          Math.max(
            0,
            averageRating
          )
        ) /
        5
      ) *
      TRUST_SCORE_WEIGHTS.rating;

    // Full certificate points after 5 certificates.
    const certificatePoints =
      Math.min(
        certificatesEarned / 5,
        1
      ) *
      TRUST_SCORE_WEIGHTS.certificates;

    // Full event points after 10 completed events.
    const completedEventPoints =
      Math.min(
        eventsCompleted / 10,
        1
      ) *
      TRUST_SCORE_WEIGHTS.completedEvents;

    // Full hour points after 50 verified hours.
    const volunteerHourPoints =
      Math.min(
        volunteerHours / 50,
        1
      ) *
      TRUST_SCORE_WEIGHTS.volunteerHours;

    const profilePoints =
      (
        Math.min(
          100,
          Math.max(
            0,
            profileCompletion
          )
        ) /
        100
      ) *
      TRUST_SCORE_WEIGHTS.profileCompletion;

    const noShowPenalty =
      noShows *
      TRUST_SCORE_WEIGHTS.noShowPenalty;

    const rawScore =
      attendancePoints +
      ratingPoints +
      certificatePoints +
      completedEventPoints +
      volunteerHourPoints +
      profilePoints -
      noShowPenalty;

    return Math.round(
      Math.min(
        100,
        Math.max(
          0,
          rawScore
        )
      )
    );
  };


  // ========================================================
  // TRUST LEVEL
  // ========================================================

  const getTrustLevel = (
    trustScore
  ) => {
    if (trustScore >= 90) {
      return {
        label:
          "Highly Trusted",

        description:
          "Excellent attendance, reliability, and verified contribution history.",
      };
    }

    if (trustScore >= 75) {
      return {
        label:
          "Trusted",

        description:
          "Strong and dependable volunteer record.",
      };
    }

    if (trustScore >= 55) {
      return {
        label:
          "Developing",

        description:
          "A growing record with room to improve reliability and participation.",
      };
    }

    return {
      label:
        "New / Limited Record",

      description:
        "Complete more verified events to build a stronger trust record.",
    };
  };


  // ========================================================
  // LOAD PROFILE AND REPUTATION STATISTICS
  // ========================================================

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const fetchProfile =
      async () => {
        if (!currentUser) {
          setError(
            "User is not logged in."
          );

          setLoading(false);

          return;
        }

        try {
          setLoading(true);
          setError("");

          const uid =
            currentUser.uid;


          // ================================================
          // LOAD USER PROFILE
          // ================================================

          const userReference =
            doc(
              db,
              "users",
              uid
            );

          const userSnapshot =
            await getDoc(
              userReference
            );

          if (
            !userSnapshot.exists()
          ) {
            setError(
              "Profile was not found."
            );

            return;
          }

          const profileData =
            userSnapshot.data();

          setUserData(
            profileData
          );


          // ================================================
          // LOAD ATTENDANCE RECORDS
          // ================================================

          const attendanceSnapshot =
            await getDocs(
              query(
                collection(
                  db,
                  "attendance"
                ),

                where(
                  "volunteerId",
                  "==",
                  uid
                )
              )
            );

          const attendanceRecords =
            attendanceSnapshot.docs.map(
              (
                attendanceDocument
              ) => ({
                id:
                  attendanceDocument.id,

                ...attendanceDocument.data(),
              })
            );


          // ================================================
          // CLASSIFY ATTENDANCE RECORDS
          // ================================================

          const completedRecords =
            attendanceRecords.filter(
              (record) => {
                const status =
                  String(
                    record.attendanceStatus ||
                      record.status ||
                      ""
                  ).toLowerCase();

                return (
                  status ===
                    "completed" ||
                  status ===
                    "present" ||
                  status ===
                    "partial-approved" ||
                  status ===
                    "organizer-corrected"
                );
              }
            );

          const noShowRecords =
            attendanceRecords.filter(
              (record) => {
                const status =
                  String(
                    record.attendanceStatus ||
                      record.status ||
                      ""
                  ).toLowerCase();

                return (
                  status ===
                  "no-show"
                );
              }
            );

          const excusedRecords =
            attendanceRecords.filter(
              (record) => {
                const status =
                  String(
                    record.attendanceStatus ||
                      record.status ||
                      ""
                  ).toLowerCase();

                return (
                  status ===
                  "excused-absence"
                );
              }
            );


          // ================================================
          // ATTENDANCE PERCENTAGE
          //
          // Excused absences are excluded.
          // Only completed events and no-shows count.
          // ================================================

          const countableAttendance =
            completedRecords.length +
            noShowRecords.length;

          const attendancePercentage =
            countableAttendance > 0
              ? Math.round(
                  (
                    completedRecords.length /
                    countableAttendance
                  ) *
                  100
                )
              : 0;


          // ================================================
          // VERIFIED VOLUNTEER HOURS
          // ================================================

          const totalVolunteerHours =
            completedRecords.reduce(
              (
                total,
                record
              ) => {
                const hours =
                  Number(
                    record.workedHours ??
                      record.completedHours ??
                      record.volunteerHours ??
                      record.eventHours ??
                      record.hours ??
                      0
                  );

                return (
                  total +
                  (
                    Number.isFinite(
                      hours
                    )
                      ? hours
                      : 0
                  )
                );
              },

              0
            );


          // ================================================
          // LOAD CERTIFICATES
          // ================================================

          const certificatesSnapshot =
            await getDocs(
              query(
                collection(
                  db,
                  "certificates"
                ),

                where(
                  "volunteerId",
                  "==",
                  uid
                )
              )
            );


          // ================================================
          // LOAD RATINGS
          // ================================================

          const ratingsSnapshot =
            await getDocs(
              query(
                collection(
                  db,
                  "ratings"
                ),

                where(
                  "volunteerId",
                  "==",
                  uid
                )
              )
            );

          const validRatings =
            ratingsSnapshot.docs
              .map(
                (
                  ratingDocument
                ) =>
                  Number(
                    ratingDocument
                      .data()
                      .rating ??
                      ratingDocument
                        .data()
                        .ratingValue ??
                      ratingDocument
                        .data()
                        .stars ??
                      0
                  )
              )
              .filter(
                (ratingValue) =>
                  Number.isFinite(
                    ratingValue
                  ) &&
                  ratingValue > 0
              );

          const averageRating =
            validRatings.length > 0
              ? validRatings.reduce(
                  (
                    total,
                    ratingValue
                  ) =>
                    total +
                    ratingValue,

                  0
                ) /
                validRatings.length
              : Number(
                  profileData.rating ||
                    0
                );


          // ================================================
          // PROFILE COMPLETION
          // ================================================

          const profileCompletion =
            calculateProfileCompletion(
              profileData
            );


          // ================================================
          // TRUST SCORE
          // ================================================

          const trustScore =
            calculateTrustScore({
              attendancePercentage,

              averageRating,

              certificatesEarned:
                certificatesSnapshot.size,

              eventsCompleted:
                completedRecords.length,

              volunteerHours:
                totalVolunteerHours,

              profileCompletion,

              noShows:
                noShowRecords.length,
            });


          // ================================================
          // FINAL STATISTICS
          // ================================================

          const calculatedStats = {
            rating:
              Number(
                averageRating.toFixed(
                  1
                )
              ),

            ratingCount:
              validRatings.length,

            eventsCompleted:
              completedRecords.length,

            volunteerHours:
              Number(
                totalVolunteerHours.toFixed(
                  2
                )
              ),

            attendancePercentage,

            certificatesEarned:
              certificatesSnapshot.size,

            noShows:
              noShowRecords.length,

            excusedAbsences:
              excusedRecords.length,

            trustScore,
          };

          setStats(
            calculatedStats
          );


          // ================================================
          // SAVE REPUTATION SUMMARY TO USER DOCUMENT
          // ================================================

          await updateDoc(
            userReference,
            {
              rating:
                calculatedStats.rating,

              ratingCount:
                calculatedStats.ratingCount,

              eventsCompleted:
                calculatedStats.eventsCompleted,

              volunteerHours:
                calculatedStats.volunteerHours,

              attendancePercentage:
                calculatedStats.attendancePercentage,

              attendancePercent:
                calculatedStats.attendancePercentage,

              certificatesEarned:
                calculatedStats.certificatesEarned,

              noShows:
                calculatedStats.noShows,

              excusedAbsences:
                calculatedStats.excusedAbsences,

              trustScore:
                calculatedStats.trustScore,

              profileCompletion,

              reputationUpdatedAt:
                serverTimestamp(),
            }
          );
        } catch (fetchError) {
          console.error(
            "Profile loading error:",
            fetchError
          );

          setError(
            fetchError?.message ||
              "Unable to load profile."
          );
        } finally {
          setLoading(false);
        }
      };

    fetchProfile();
  }, [authReady, currentUser]);


  // ========================================================
  // HELPER: RENDER TAG LIST
  // ========================================================

  const renderTags = (
    items,
    emptyMessage
  ) =>
    items.length > 0 ? (
      <div className="profile-tag-list">
        {items.map(
          (item, index) => (
            <span
              className="profile-tag"
              key={`${item}-${index}`}
            >
              {item}
            </span>
          )
        )}
      </div>
    ) : (
      <p className="profile-empty-text">
        {emptyMessage}
      </p>
    );


  // ========================================================
  // LOADING SCREEN
  // ========================================================

  if (
    !authReady ||
    loading
  ) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <h2>
            Loading profile...
          </h2>
        </div>
      </div>
    );
  }


  // ========================================================
  // ERROR SCREEN
  // ========================================================

  if (
    error ||
    !userData
  ) {
    return (
      <div className="profile-page">
        <div className="profile-error">
          <h2>
            Unable to load profile
          </h2>

          <p>
            {error ||
              "Profile was not found."}
          </p>
        </div>
      </div>
    );
  }


  // ========================================================
  // PREPARE PROFILE VALUES
  // ========================================================

  const skills =
    toArray(
      userData.skills
    );

  const interests =
    toArray(
      userData.interests
    );

  const languages =
    toArray(
      userData.languages
    );

  const availability =
    toArray(
      userData.availability
    );

  const preferredRoles =
    toArray(
      userData.preferredRoles
    );

  const preferredEventTypes =
    toArray(
      userData.preferredEventTypes
    );

  const rating =
    Number(
      stats.rating || 0
    );

  const roundedRating =
    Math.max(
      0,
      Math.min(
        5,
        Math.round(rating)
      )
    );

  const stars =
    "★".repeat(
      roundedRating
    ) +
    "☆".repeat(
      5 -
      roundedRating
    );

  const trustLevel =
    getTrustLevel(
      stats.trustScore
    );


  // ========================================================
  // PROFILE UI
  // ========================================================

  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* ==================================================
            TOP BAR
        ================================================== */}

        <div className="profile-topbar">
          <BackButton />

          <div className="profile-topbar-actions">
            <button
              type="button"
              className="profile-edit-button"
              onClick={() =>
                navigate(
                  "/volunteer-history"
                )
              }
            >
              📚 View History
            </button>

            <button
              type="button"
              className="profile-edit-button"
              onClick={() =>
                navigate(
                  "/edit-profile"
                )
              }
            >
              ✏️ Edit Profile
            </button>
          </div>
        </div>


        {/* ==================================================
            PROFILE HERO
        ================================================== */}

        <section className="profile-hero">
          {userData.photoURL ? (
            <img
              src={
                userData.photoURL
              }
              alt={`${
                userData.name ||
                "Volunteer"
              } profile`}
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar-placeholder">
              {userData.name
                ?.charAt(0)
                ?.toUpperCase() ||
                "V"}
            </div>
          )}

          <div className="profile-hero-content">
            <p className="profile-eyebrow">
              Verified Volunteer Identity
            </p>

            <h1 className="profile-name">
              {userData.name ||
                "Volunteer"}
            </h1>

            <p className="profile-role">
              Volunteer
            </p>

            <div className="profile-rating-row">
              <span className="profile-stars">
                {stars}
              </span>

              <strong>
                {rating.toFixed(
                  1
                )}
                /5
              </strong>

              <span>
                (
                {
                  stats.ratingCount
                }
                {" ratings)"}
              </span>
            </div>

            <p className="profile-location">
              📍{" "}
              {userData.city ||
                "City not provided"}

              {userData.state
                ? `, ${userData.state}`
                : ""}
            </p>
          </div>
        </section>


        {/* ==================================================
            TRUST SCORE
        ================================================== */}

        <section className="profile-card trust-score-card">
          <div className="trust-score-header">
            <div>
              <p className="profile-eyebrow">
                Volunteer Reputation
              </p>

              <h2>
                Trust Score
              </h2>

              <p className="profile-empty-text">
                Based on verified attendance, ratings,
                certificates, completed events, hours,
                profile completion, and no-shows.
              </p>
            </div>

            <div className="trust-score-value">
              <strong>
                {stats.trustScore}
              </strong>

              <span>
                /100
              </span>
            </div>
          </div>

          <div className="trust-score-progress">
            <div
              className="trust-score-progress-fill"
              style={{
                width:
                  `${stats.trustScore}%`,
              }}
            />
          </div>

          <div className="trust-level-row">
            <strong>
              🛡️ {trustLevel.label}
            </strong>

            <span>
              {
                trustLevel.description
              }
            </span>
          </div>
        </section>


        {/* ==================================================
            CALCULATED STATISTICS
        ================================================== */}

        <section className="profile-statistics-grid">
          <div className="profile-stat-card">
            <span className="profile-stat-icon">
              🛡️
            </span>

            <span className="profile-stat-value">
              {stats.trustScore}
            </span>

            <span className="profile-stat-label">
              Trust Score
            </span>
          </div>

          <div className="profile-stat-card">
            <span className="profile-stat-icon">
              ⭐
            </span>

            <span className="profile-stat-value">
              {rating.toFixed(1)}
            </span>

            <span className="profile-stat-label">
              Rating
            </span>
          </div>

          <div className="profile-stat-card">
            <span className="profile-stat-icon">
              🏆
            </span>

            <span className="profile-stat-value">
              {
                stats.eventsCompleted
              }
            </span>

            <span className="profile-stat-label">
              Events
            </span>
          </div>

          <div className="profile-stat-card">
            <span className="profile-stat-icon">
              ⏰
            </span>

            <span className="profile-stat-value">
              {
                stats.volunteerHours
              }
            </span>

            <span className="profile-stat-label">
              Hours
            </span>
          </div>

          <div className="profile-stat-card">
            <span className="profile-stat-icon">
              ✅
            </span>

            <span className="profile-stat-value">
              {
                stats.attendancePercentage
              }
              %
            </span>

            <span className="profile-stat-label">
              Attendance
            </span>
          </div>

          <div className="profile-stat-card">
            <span className="profile-stat-icon">
              🎖
            </span>

            <span className="profile-stat-value">
              {
                stats.certificatesEarned
              }
            </span>

            <span className="profile-stat-label">
              Certificates
            </span>
          </div>

          <div className="profile-stat-card">
            <span className="profile-stat-icon">
              ❌
            </span>

            <span className="profile-stat-value">
              {
                stats.noShows
              }
            </span>

            <span className="profile-stat-label">
              No-Shows
            </span>
          </div>

          <div className="profile-stat-card">
            <span className="profile-stat-icon">
              🟡
            </span>

            <span className="profile-stat-value">
              {
                stats.excusedAbsences
              }
            </span>

            <span className="profile-stat-label">
              Excused
            </span>
          </div>
        </section>


        {/* ==================================================
            ABOUT ME
        ================================================== */}

        <section className="profile-card">
          <h2>
            About Me
          </h2>

          <p className="profile-bio">
            {userData.bio ||
              "No bio added yet."}
          </p>
        </section>


        {/* ==================================================
            PERSONAL INFORMATION
        ================================================== */}

        <section className="profile-card">
          <h2>
            Personal Information
          </h2>

          <div className="profile-info-grid">
            <div className="profile-info-item">
              <span className="profile-info-label">
                Email
              </span>

              <span className="profile-info-value">
                {userData.email ||
                  "Not provided"}
              </span>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">
                Phone
              </span>

              <span className="profile-info-value">
                {userData.phone ||
                  "Not provided"}
              </span>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">
                Age
              </span>

              <span className="profile-info-value">
                {userData.age ||
                  "Not provided"}
              </span>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">
                City
              </span>

              <span className="profile-info-value">
                {userData.city ||
                  "Not provided"}
              </span>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">
                State
              </span>

              <span className="profile-info-value">
                {userData.state ||
                  "Not provided"}
              </span>
            </div>
          </div>
        </section>


        {/* ==================================================
            EDUCATION
        ================================================== */}

        <section className="profile-card">
          <h2>
            Education
          </h2>

          <div className="profile-info-grid">
            <div className="profile-info-item">
              <span className="profile-info-label">
                College
              </span>

              <span className="profile-info-value">
                {userData.college ||
                  "Not provided"}
              </span>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">
                Degree
              </span>

              <span className="profile-info-value">
                {userData.degree ||
                  "Not provided"}
              </span>
            </div>

            <div className="profile-info-item">
              <span className="profile-info-label">
                Graduation Year
              </span>

              <span className="profile-info-value">
                {userData.graduationYear ||
                  "Not provided"}
              </span>
            </div>
          </div>
        </section>


        {/* ==================================================
            SKILLS
        ================================================== */}

        <section className="profile-card">
          <h2>
            Skills
          </h2>

          {renderTags(
            skills,
            "No skills added."
          )}
        </section>


        {/* ==================================================
            LANGUAGES
        ================================================== */}

        <section className="profile-card">
          <h2>
            Languages
          </h2>

          {renderTags(
            languages,
            "No languages added."
          )}
        </section>


        {/* ==================================================
            INTERESTS
        ================================================== */}

        <section className="profile-card">
          <h2>
            Interests
          </h2>

          {renderTags(
            interests,
            "No interests added."
          )}
        </section>


        {/* ==================================================
            AVAILABILITY
        ================================================== */}

        <section className="profile-card">
          <h2>
            Availability
          </h2>

          {renderTags(
            availability,
            "No availability added."
          )}
        </section>


        {/* ==================================================
            PREFERRED ROLES
        ================================================== */}

        <section className="profile-card">
          <h2>
            Preferred Roles
          </h2>

          {renderTags(
            preferredRoles,
            "No preferred roles added."
          )}
        </section>


        {/* ==================================================
            PREFERRED EVENT TYPES
        ================================================== */}

        <section className="profile-card">
          <h2>
            Preferred Event Types
          </h2>

          {renderTags(
            preferredEventTypes,
            "No preferred event types added."
          )}
        </section>


        {/* ==================================================
            LINKEDIN
        ================================================== */}

        <section className="profile-card">
          <h2>
            LinkedIn
          </h2>

          {userData.linkedin ? (
            <a
              href={
                userData.linkedin
              }
              target="_blank"
              rel="noreferrer"
              className="profile-link"
            >
              Open LinkedIn Profile
            </a>
          ) : (
            <p className="profile-empty-text">
              No LinkedIn profile added.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

export default Profile;