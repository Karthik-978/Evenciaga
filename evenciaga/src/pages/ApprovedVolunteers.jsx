// ==========================================================
// REACT AND ROUTER IMPORTS
// ==========================================================

import { useEffect, useMemo, useState } from "react";

import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import {
  addDoc,
  collection,
  doc,
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


// ==========================================================
// APPROVED VOLUNTEERS COMPONENT
//
// Performance improvements:
// - Organizer events and user profiles load once.
// - Switching events only queries joinRequests.
// - Profile data is merged from a local cache.
// - Promote/move actions update local state instead of
//   reloading every volunteer from Firestore.
// ==========================================================

function ApprovedVolunteers() {
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
  // PAGE STATE
  // --------------------------------------------------------

  const [events, setEvents] =
    useState([]);

  const [usersById, setUsersById] =
    useState({});

  const [selectedEvent, setSelectedEvent] =
    useState("");

  const [selectedEventData, setSelectedEventData] =
    useState(null);

  const [volunteers, setVolunteers] =
    useState([]);

  const [loadingEvents, setLoadingEvents] =
    useState(true);

  const [loadingVolunteers, setLoadingVolunteers] =
    useState(false);

  const [processingId, setProcessingId] =
    useState("");

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
  // LOAD ORGANIZER EVENTS AND USER PROFILE CACHE
  // ========================================================

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const loadInitialData =
      async () => {
        if (!currentUser) {
          setEvents([]);
          setUsersById({});

          setError(
            "You must be logged in as an organizer."
          );

          setLoadingEvents(false);

          return;
        }

        try {
          setLoadingEvents(true);
          setError("");

          const [
            eventsSnapshot,
            usersSnapshot,
          ] = await Promise.all([
            getDocs(
              query(
                collection(
                  db,
                  "events"
                ),

                where(
                  "organizerId",
                  "==",
                  currentUser.uid
                )
              )
            ),

            getDocs(
              collection(
                db,
                "users"
              )
            ),
          ]);

          const eventData =
            eventsSnapshot.docs
              .map(
                (eventDocument) => ({
                  id:
                    eventDocument.id,

                  ...eventDocument.data(),
                })
              )
              .sort(
                (
                  firstEvent,
                  secondEvent
                ) =>
                  new Date(
                    firstEvent.date || 0
                  ) -
                  new Date(
                    secondEvent.date || 0
                  )
              );

          const profileMap = {};

          usersSnapshot.docs.forEach(
            (userDocument) => {
              profileMap[
                userDocument.id
              ] = userDocument.data();
            }
          );

          setEvents(
            eventData
          );

          setUsersById(
            profileMap
          );
        } catch (initialError) {
          console.error(
            "Approved volunteers initial loading error:",
            initialError
          );

          setError(
            initialError?.message ||
              "Unable to load organizer data."
          );
        } finally {
          setLoadingEvents(false);
        }
      };

    loadInitialData();
  }, [authReady, currentUser]);


  // ========================================================
  // HELPER FUNCTIONS
  // ========================================================

  const formatList = (value) => {
    if (Array.isArray(value)) {
      return value.length > 0
        ? value.join(", ")
        : "Not provided";
    }

    return value || "Not provided";
  };


  const getTrustLevel = (
    score
  ) => {
    const trustScore =
      Number(score || 0);

    if (trustScore >= 90) {
      return "Highly Trusted";
    }

    if (trustScore >= 75) {
      return "Trusted";
    }

    if (trustScore >= 55) {
      return "Developing";
    }

    return "New / Limited Record";
  };


  const getSelectionType = (
    volunteer
  ) => {
    if (
      volunteer.selectionType ===
        "primary" ||
      (
        !volunteer.selectionType &&
        volunteer.status ===
          "approved"
      )
    ) {
      return "primary";
    }

    return "standby";
  };


  const getConfirmationLabel = (
    status
  ) => {
    if (status === "confirmed") {
      return "Confirmed";
    }

    if (status === "declined") {
      return "Declined";
    }

    if (
      status ===
      "callback-requested"
    ) {
      return "Callback Requested";
    }

    if (status === "pending") {
      return "Waiting Confirmation";
    }

    if (status === "emergency-reported") {
      return "Emergency Reported";
    }

    return "Not Requested";
  };


  const calculateReplacementScore = (
    volunteer
  ) => {
    let score = 0;

    score +=
      Number(
        volunteer.trustScore || 0
      ) *
      0.5;

    score +=
      Number(
        volunteer.currentRating ??
          volunteer.rating ??
          0
      ) *
      5;

    score +=
      Number(
        volunteer.attendancePercentage ||
          0
      ) *
      0.2;

    score +=
      Math.min(
        Number(
          volunteer.eventsCompleted ||
            0
        ),
        15
      );

    score +=
      Math.min(
        Number(
          volunteer.volunteerHours ||
            0
        ) /
          10,
        10
      );

    score -=
      Number(
        volunteer.noShows || 0
      ) *
      15;

    // Earlier standby position gets a small advantage.
    const standbyPosition =
      Number(
        volunteer.standbyPosition ||
          999
      );

    if (
      standbyPosition !== 999
    ) {
      score +=
        Math.max(
          0,
          10 -
            standbyPosition
        );
    }

    return Number(
      Math.max(
        0,
        score
      ).toFixed(1)
    );
  };


  const mergeVolunteerProfile = (
    volunteer
  ) => {
    const profile =
      usersById[
        volunteer.volunteerId
      ] || {};

    return {
      ...volunteer,

      trustScore:
        Number(
          profile.trustScore ||
            0
        ),

      currentRating:
        Number(
          profile.rating ??
            volunteer.rating ??
            0
        ),

      attendancePercentage:
        Number(
          profile
            .attendancePercentage ??
            profile
              .attendancePercent ??
            0
        ),

      eventsCompleted:
        Number(
          profile.eventsCompleted ||
            0
        ),

      volunteerHours:
        Number(
          profile.volunteerHours ||
            0
        ),

      certificatesEarned:
        Number(
          profile.certificatesEarned ||
            0
        ),

      noShows:
        Number(
          profile.noShows ||
            0
        ),
    };
  };


  // ========================================================
  // LOAD PRIMARY AND STANDBY VOLUNTEERS
  // ========================================================

  const loadVolunteers =
    async (eventId) => {
      setSelectedEvent(
        eventId
      );

      setSelectedEventData(
        null
      );

      setVolunteers([]);
      setError("");

      if (!eventId) {
        setLoadingVolunteers(
          false
        );

        return;
      }

      const eventData =
        events.find(
          (event) =>
            event.id === eventId
        ) || null;

      if (!eventData) {
        setError(
          "Selected event was not found."
        );

        return;
      }

      setSelectedEventData(
        eventData
      );

      try {
        setLoadingVolunteers(
          true
        );

        const requestsSnapshot =
          await getDocs(
            query(
              collection(
                db,
                "joinRequests"
              ),

              where(
                "eventId",
                "==",
                eventId
              )
            )
          );

        const selectedVolunteers =
          requestsSnapshot.docs
            .map(
              (
                requestDocument
              ) => ({
                id:
                  requestDocument.id,

                ...requestDocument.data(),
              })
            )
            .filter(
              (request) => {
                const isPrimary =
                  request.selectionType ===
                    "primary" ||
                  (
                    !request.selectionType &&
                    request.status ===
                      "approved"
                  );

                const isStandby =
                  request.selectionType ===
                    "standby" ||
                  request.status ===
                    "standby";

                return (
                  isPrimary ||
                  isStandby
                );
              }
            )
            .map(
              (volunteer) => {
                const merged =
                  mergeVolunteerProfile(
                    volunteer
                  );

                return {
                  ...merged,

                  replacementScore:
                    calculateReplacementScore(
                      merged
                    ),
                };
              }
            )
            .sort(
              (
                firstVolunteer,
                secondVolunteer
              ) => {
                const firstType =
                  getSelectionType(
                    firstVolunteer
                  );

                const secondType =
                  getSelectionType(
                    secondVolunteer
                  );

                if (
                  firstType ===
                    "primary" &&
                  secondType !==
                    "primary"
                ) {
                  return -1;
                }

                if (
                  firstType !==
                    "primary" &&
                  secondType ===
                    "primary"
                ) {
                  return 1;
                }

                if (
                  firstType ===
                    "standby" &&
                  secondType ===
                    "standby"
                ) {
                  if (
                    secondVolunteer
                      .replacementScore !==
                    firstVolunteer
                      .replacementScore
                  ) {
                    return (
                      secondVolunteer
                        .replacementScore -
                      firstVolunteer
                        .replacementScore
                    );
                  }

                  return (
                    Number(
                      firstVolunteer
                        .standbyPosition ||
                        0
                    ) -
                    Number(
                      secondVolunteer
                        .standbyPosition ||
                        0
                    )
                  );
                }

                return 0;
              }
            );

        setVolunteers(
          selectedVolunteers
        );
      } catch (volunteerError) {
        console.error(
          "Load approved volunteers error:",
          volunteerError
        );

        setError(
          volunteerError?.message ||
            "Unable to load selected volunteers."
        );
      } finally {
        setLoadingVolunteers(
          false
        );
      }
    };


  // ========================================================
  // DERIVED COUNTS
  // ========================================================

  const counts = useMemo(() => {
    return {
      total:
        volunteers.length,

      primary:
        volunteers.filter(
          (volunteer) =>
            getSelectionType(
              volunteer
            ) === "primary"
        ).length,

      standby:
        volunteers.filter(
          (volunteer) =>
            getSelectionType(
              volunteer
            ) === "standby"
        ).length,

      confirmed:
        volunteers.filter(
          (volunteer) =>
            volunteer
              .confirmationStatus ===
              "confirmed"
        ).length,

      declined:
        volunteers.filter(
          (volunteer) =>
            volunteer
              .confirmationStatus ===
              "declined"
        ).length,

      callbackRequested:
        volunteers.filter(
          (volunteer) =>
            volunteer
              .confirmationStatus ===
              "callback-requested"
        ).length,

      emergencyReported:
        volunteers.filter(
          (volunteer) =>
            volunteer.emergencyStatus ===
              "reported" ||
            volunteer.emergencyStatus ===
              "replacement-requested"
        ).length,
    };
  }, [volunteers]);


  const bestReplacement = useMemo(() => {
    return (
      volunteers
        .filter(
          (volunteer) =>
            getSelectionType(
              volunteer
            ) === "standby" &&
            volunteer.replacementRequestStatus !==
              "pending"
        )
        .sort(
          (
            firstVolunteer,
            secondVolunteer
          ) =>
            Number(
              secondVolunteer
                .replacementScore ||
                0
            ) -
            Number(
              firstVolunteer
                .replacementScore ||
                0
            )
        )[0] ||
      null
    );
  }, [volunteers]);


  // ========================================================
  // UPDATE VOLUNTEER LOCALLY
  // ========================================================

  const updateVolunteerLocally = (
    volunteerId,
    changes
  ) => {
    setVolunteers(
      (currentVolunteers) =>
        currentVolunteers.map(
          (volunteer) =>
            volunteer.id ===
            volunteerId
              ? {
                  ...volunteer,
                  ...changes,
                }
              : volunteer
        )
    );
  };


  // ========================================================
  // PROMOTE STANDBY TO PRIMARY
  // ========================================================

  const promoteToPrimary =
    async (volunteer) => {
      try {
        setProcessingId(
          volunteer.id
        );

        if (!selectedEventData) {
          alert(
            "Select an event first."
          );

          return;
        }

        if (
          selectedEventData.status ===
          "completed"
        ) {
          alert(
            "Completed events cannot be changed."
          );

          return;
        }

        const primaryCount =
          volunteers.filter(
            (
              currentVolunteer
            ) =>
              getSelectionType(
                currentVolunteer
              ) ===
                "primary" &&
              currentVolunteer.id !==
                volunteer.id
          ).length;

        const primaryLimit =
          Number(
            selectedEventData
              .primaryLimit ??
              selectedEventData
                .requiredVolunteers ??
              0
          );

        if (
          primaryCount >=
          primaryLimit
        ) {
          alert(
            "Primary volunteer limit has already been reached."
          );

          return;
        }

        await updateDoc(
          doc(
            db,
            "joinRequests",
            volunteer.id
          ),
          {
            status:
              "approved",

            applicationStatus:
              "selected",

            selectionType:
              "primary",

            standbyPosition:
              null,

            confirmationStatus:
              "pending",

            promotedAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );

        await addDoc(
          collection(
            db,
            "notifications"
          ),
          {
            volunteerId:
              volunteer.volunteerId,

            eventId:
              volunteer.eventId,

            eventTitle:
              volunteer.eventTitle,

            title:
              "Promoted to Primary Volunteer",

            message:
              `You were promoted from standby to primary for "${volunteer.eventTitle}". Please confirm your attendance.`,

            type:
              "standby-promoted",

            category:
              "action",

            requiresAction:
              true,

            actionRoute:
              "/my-applications",

            actionLabel:
              "Confirm Attendance",

            isRead:
              false,

            createdAt:
              serverTimestamp(),
          }
        );

        updateVolunteerLocally(
          volunteer.id,
          {
            status:
              "approved",

            applicationStatus:
              "selected",

            selectionType:
              "primary",

            standbyPosition:
              null,

            confirmationStatus:
              "pending",
          }
        );

        alert(
          "Standby volunteer promoted to primary."
        );
      } catch (promotionError) {
        console.error(
          "Promote standby error:",
          promotionError
        );

        alert(
          promotionError?.message ||
            "Unable to promote standby volunteer."
        );
      } finally {
        setProcessingId("");
      }
    };


  // ========================================================
  // PROMOTE BEST REPLACEMENT
  // ========================================================

  const promoteBestReplacement =
    async () => {
      if (!bestReplacement) {
        alert(
          "No standby volunteer is available."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Promote ${bestReplacement.volunteerName || "the top-ranked standby volunteer"} with replacement score ${bestReplacement.replacementScore}?`
        );

      if (!confirmed) {
        return;
      }

      await promoteToPrimary(
        bestReplacement
      );
    };


  // ========================================================
  // REQUEST EMERGENCY REPLACEMENT
  // Sends the request to the highest-ranked available
  // standby volunteer. The standby volunteer must accept
  // before becoming a primary volunteer.
  // ========================================================

  const requestEmergencyReplacement =
    async (primaryVolunteer) => {
      try {
        setProcessingId(primaryVolunteer.id);

        if (!selectedEventData) {
          alert("Select an event first.");
          return;
        }

        if (selectedEventData.status === "completed") {
          alert("Completed events cannot request replacements.");
          return;
        }

        const candidates = volunteers
          .filter((candidate) => {
            if (getSelectionType(candidate) !== "standby") {
              return false;
            }

            const sameEmergency =
              candidate.replacementForJoinRequestId ===
              primaryVolunteer.id;

            if (
              sameEmergency &&
              ["pending", "declined", "accepted"].includes(
                candidate.replacementRequestStatus
              )
            ) {
              return false;
            }

            return candidate.replacementRequestStatus !== "pending";
          })
          .sort(
            (firstCandidate, secondCandidate) =>
              Number(secondCandidate.replacementScore || 0) -
              Number(firstCandidate.replacementScore || 0)
          );

        const candidate = candidates[0];

        if (!candidate) {
          alert(
            "No available standby volunteer remains for this emergency."
          );
          return;
        }

        const confirmed = window.confirm(
          `Send an emergency replacement request to ${
            candidate.volunteerName || "the top-ranked standby volunteer"
          }? Replacement score: ${candidate.replacementScore || 0}.`
        );

        if (!confirmed) {
          return;
        }

        await updateDoc(
          doc(db, "joinRequests", primaryVolunteer.id),
          {
            emergencyStatus: "replacement-requested",
            replacementCandidateId: candidate.volunteerId,
            replacementCandidateJoinRequestId: candidate.id,
            replacementRequestedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        await updateDoc(
          doc(db, "joinRequests", candidate.id),
          {
            emergencyStatus: "replacement-requested",
            replacementRequestStatus: "pending",
            replacementForVolunteerId: primaryVolunteer.volunteerId,
            replacementForVolunteerName:
              primaryVolunteer.volunteerName || "Volunteer",
            replacementForJoinRequestId: primaryVolunteer.id,
            replacementRequestedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        await addDoc(
          collection(db, "notifications"),
          {
            volunteerId: candidate.volunteerId,
            recipientId: candidate.volunteerId,
            recipientRole: "volunteer",
            organizerId: currentUser.uid,

            eventId: candidate.eventId,
            eventTitle: candidate.eventTitle,

            title: "Emergency Replacement Request",
            message: `"${candidate.eventTitle}" urgently needs a replacement volunteer. You are the highest-ranked available standby candidate. Please accept or decline the request.`,

            type: "emergency-replacement-request",
            category: "action",
            requiresAction: true,

            actionRoute: "/my-applications",
            actionLabel: "Respond Now",

            emergencyForVolunteerId: primaryVolunteer.volunteerId,
            emergencyForJoinRequestId: primaryVolunteer.id,

            isRead: false,
            createdAt: serverTimestamp(),
          }
        );

        updateVolunteerLocally(
          primaryVolunteer.id,
          {
            emergencyStatus: "replacement-requested",
            replacementCandidateId: candidate.volunteerId,
            replacementCandidateJoinRequestId: candidate.id,
          }
        );

        updateVolunteerLocally(
          candidate.id,
          {
            emergencyStatus: "replacement-requested",
            replacementRequestStatus: "pending",
            replacementForVolunteerId: primaryVolunteer.volunteerId,
            replacementForVolunteerName:
              primaryVolunteer.volunteerName || "Volunteer",
            replacementForJoinRequestId: primaryVolunteer.id,
          }
        );

        alert(
          `Emergency replacement request sent to ${
            candidate.volunteerName || "the selected standby volunteer"
          }.`
        );
      } catch (emergencyError) {
        console.error(
          "Emergency replacement request error:",
          emergencyError
        );

        alert(
          emergencyError?.message ||
            "Unable to request an emergency replacement."
        );
      } finally {
        setProcessingId("");
      }
    };


  // ========================================================
  // MOVE PRIMARY VOLUNTEER TO STANDBY
  // ========================================================

  const moveToStandby =
    async (volunteer) => {
      try {
        setProcessingId(
          volunteer.id
        );

        if (!selectedEventData) {
          return;
        }

        if (
          selectedEventData.status ===
          "completed"
        ) {
          alert(
            "Completed events cannot be changed."
          );

          return;
        }

        const standbyCount =
          volunteers.filter(
            (
              currentVolunteer
            ) =>
              getSelectionType(
                currentVolunteer
              ) ===
                "standby" &&
              currentVolunteer.id !==
                volunteer.id
          ).length;

        const standbyLimit =
          Number(
            selectedEventData
              .standbyLimit ||
              0
          );

        if (
          standbyLimit <= 0
        ) {
          alert(
            "This event has no standby capacity."
          );

          return;
        }

        if (
          standbyCount >=
          standbyLimit
        ) {
          alert(
            "Standby volunteer limit has been reached."
          );

          return;
        }

        const nextPosition =
          standbyCount + 1;

        await updateDoc(
          doc(
            db,
            "joinRequests",
            volunteer.id
          ),
          {
            status:
              "standby",

            applicationStatus:
              "selected",

            selectionType:
              "standby",

            standbyPosition:
              nextPosition,

            confirmationStatus:
              "not-requested",

            updatedAt:
              serverTimestamp(),
          }
        );

        await addDoc(
          collection(
            db,
            "notifications"
          ),
          {
            volunteerId:
              volunteer.volunteerId,

            eventId:
              volunteer.eventId,

            eventTitle:
              volunteer.eventTitle,

            title:
              "Moved to Standby List",

            message:
              `Your selection for "${volunteer.eventTitle}" was changed to standby position ${nextPosition}.`,

            type:
              "moved-to-standby",

            category:
              "information",

            requiresAction:
              false,

            actionRoute:
              "/my-applications",

            actionLabel:
              "View Application",

            isRead:
              false,

            createdAt:
              serverTimestamp(),
          }
        );

        const movedVolunteer = {
          ...volunteer,

          status:
            "standby",

          applicationStatus:
            "selected",

          selectionType:
            "standby",

          standbyPosition:
            nextPosition,

          confirmationStatus:
            "not-requested",
        };

        movedVolunteer.replacementScore =
          calculateReplacementScore(
            movedVolunteer
          );

        updateVolunteerLocally(
          volunteer.id,
          movedVolunteer
        );

        alert(
          `Volunteer moved to standby position ${nextPosition}.`
        );
      } catch (standbyError) {
        console.error(
          "Move to standby error:",
          standbyError
        );

        alert(
          standbyError?.message ||
            "Unable to move volunteer to standby."
        );
      } finally {
        setProcessingId("");
      }
    };


  // ========================================================
  // LOADING SCREEN
  // ========================================================

  if (
    !authReady ||
    loadingEvents
  ) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">
            👥
          </div>

          <h2>
            Loading Volunteers
          </h2>

          <p>
            Loading events and volunteer profiles.
          </p>
        </div>
      </div>
    );
  }


  // ========================================================
  // ERROR SCREEN
  // ========================================================

  if (
    error &&
    events.length === 0
  ) {
    return (
      <div className="page-container">
        <BackButton />

        <div className="page-card empty-state">
          <div className="empty-icon">
            ⚠️
          </div>

          <h2>
            Unable to Load Volunteers
          </h2>

          <p>
            {error}
          </p>
        </div>
      </div>
    );
  }


  // ========================================================
  // APPROVED VOLUNTEERS UI
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
            Selected Volunteers
          </h1>

          <p className="page-subtitle">
            Manage primary and standby volunteers,
            confirmations, and ranked replacements.
          </p>
        </div>

        <div className="organizer-status approved">
          👥 {counts.total} Volunteers
        </div>
      </section>


      {/* ====================================================
          EVENT SELECTION
      ==================================================== */}

      <section className="page-card">
        <label className="input-label">
          Select Event
        </label>

        <select
          className="modern-select"
          value={selectedEvent}
          onChange={(event) =>
            loadVolunteers(
              event.target.value
            )
          }
          disabled={
            loadingVolunteers
          }
        >
          <option value="">
            Choose an Event
          </option>

          {events.map((event) => (
            <option
              key={event.id}
              value={event.id}
            >
              {event.title}
            </option>
          ))}
        </select>
      </section>


      {/* ====================================================
          SELECTION STATISTICS
      ==================================================== */}

      {selectedEvent && (
        <section className="dashboard-stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              ✅
            </div>

            <div>
              <p>
                Primary
              </p>

              <h2>
                {counts.primary}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              🧍
            </div>

            <div>
              <p>
                Standby
              </p>

              <h2>
                {counts.standby}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              📌
            </div>

            <div>
              <p>
                Confirmed
              </p>

              <h2>
                {counts.confirmed}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              ❌
            </div>

            <div>
              <p>
                Declined
              </p>

              <h2>
                {counts.declined}
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              📞
            </div>

            <div>
              <p>
                Callback Requests
              </p>

              <h2>
                {
                  counts
                    .callbackRequested
                }
              </h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              🚨
            </div>

            <div>
              <p>Emergency Cases</p>
              <h2>{counts.emergencyReported}</h2>
            </div>
          </div>
        </section>
      )}


      {/* ====================================================
          CAPACITY AND REPLACEMENT
      ==================================================== */}

      {selectedEventData && (
        <section className="page-card">
          <div className="event-card-header">
            <div>
              <h2 className="page-title">
                Event Capacity
              </h2>

              <div className="event-benefits-row">
                <span className="event-type-badge volunteer">
                  Primary: {counts.primary}/
                  {selectedEventData.primaryLimit ??
                    selectedEventData.requiredVolunteers ??
                    0}
                </span>

                <span className="event-type-badge certificate">
                  Standby: {counts.standby}/
                  {selectedEventData.standbyLimit || 0}
                </span>

                <span className="event-type-badge paid">
                  Confirmed: {counts.confirmed}
                </span>

                {counts.emergencyReported > 0 && (
                  <span className="status-completed">
                    🚨 Emergency: {counts.emergencyReported}
                  </span>
                )}
              </div>
            </div>

            {bestReplacement && (
              <button
                type="button"
                className="primary-action-button"
                onClick={
                  promoteBestReplacement
                }
                disabled={
                  Boolean(
                    processingId
                  )
                }
              >
                ⚡ Promote Best Replacement
              </button>
            )}
          </div>

          {bestReplacement && (
            <p className="page-subtitle">
              Recommended replacement:{" "}
              <strong>
                {bestReplacement.volunteerName ||
                  "Volunteer"}
              </strong>
              {" · "}
              score{" "}
              {
                bestReplacement
                  .replacementScore
              }
              {" · "}
              trust{" "}
              {
                bestReplacement
                  .trustScore
              }
              /100
            </p>
          )}
        </section>
      )}


      {/* ====================================================
          ERROR MESSAGE
      ==================================================== */}

      {error && (
        <div className="form-message error">
          {error}
        </div>
      )}


      {/* ====================================================
          LOADING VOLUNTEERS
      ==================================================== */}

      {loadingVolunteers && (
        <div className="page-card empty-state">
          <div className="empty-icon">
            ⏳
          </div>

          <h2>
            Loading Selected Volunteers
          </h2>
        </div>
      )}


      {/* ====================================================
          EMPTY STATE
      ==================================================== */}

      {!loadingVolunteers &&
        selectedEvent &&
        volunteers.length === 0 && (
          <div className="page-card empty-state">
            <div className="empty-icon">
              👥
            </div>

            <h2>
              No Selected Volunteers
            </h2>

            <p>
              No primary or standby volunteers were found for this event.
            </p>
          </div>
        )}


      {!loadingVolunteers &&
        !selectedEvent && (
          <div className="page-card empty-state">
            <div className="empty-icon">
              📅
            </div>

            <h2>
              Select an Event
            </h2>

            <p>
              Choose an event to view primary and standby volunteers.
            </p>
          </div>
        )}


      {/* ====================================================
          VOLUNTEER CARDS
      ==================================================== */}

      {!loadingVolunteers &&
        volunteers.map(
          (volunteer) => {
            const selectionType =
              getSelectionType(
                volunteer
              );

            const confirmationStatus =
              volunteer.confirmationStatus ||
              (
                selectionType ===
                  "primary"
                  ? "pending"
                  : "not-requested"
              );

            const isProcessing =
              processingId ===
              volunteer.id;

            const isBestReplacement =
              bestReplacement?.id ===
              volunteer.id;

            return (
              <article
                key={
                  volunteer.id
                }
                className="event-card"
              >
                <div className="event-card-header">
                  <div>
                    <p className="dashboard-eyebrow">
                      {selectionType ===
                      "primary"
                        ? "Primary Volunteer"
                        : `Standby Volunteer #${
                            volunteer.standbyPosition ||
                            "-"
                          }`}
                    </p>

                    <h2 className="event-title">
                      {volunteer.volunteerName ||
                        "Volunteer"}
                    </h2>

                    <p className="event-description">
                      {volunteer.requestedRole ||
                        "Role not provided"}
                    </p>
                  </div>

                  <div className="event-benefits-row">
                    {selectionType ===
                    "primary" ? (
                      <span className="status-active">
                        Primary
                      </span>
                    ) : (
                      <span className="event-type-badge certificate">
                        Standby #
                        {
                          volunteer
                            .standbyPosition
                        }
                      </span>
                    )}

                    {isBestReplacement && (
                      <span className="event-type-badge paid">
                        ⚡ Best Replacement
                      </span>
                    )}

                    {(volunteer.emergencyStatus === "reported" ||
                      volunteer.emergencyStatus === "replacement-requested") &&
                      selectionType === "primary" && (
                        <span className="status-completed">
                          🚨 Emergency Reported
                        </span>
                      )}

                    {volunteer.replacementRequestStatus === "pending" && (
                      <span className="event-type-badge certificate">
                        🚨 Replacement Request Pending
                      </span>
                    )}
                  </div>
                </div>


                {/* ============================================
                    VOLUNTEER INFORMATION
                ============================================ */}

                <div className="event-meta-grid">
                  <div className="event-meta-item">
                    <span className="event-meta-icon">
                      ⭐
                    </span>

                    <div>
                      <small>
                        Rating
                      </small>

                      <strong>
                        {Number(
                          volunteer.currentRating ??
                            volunteer.rating ??
                            0
                        ).toFixed(1)}
                      </strong>
                    </div>
                  </div>

                  <div className="event-meta-item">
                    <span className="event-meta-icon">
                      🛡️
                    </span>

                    <div>
                      <small>
                        Trust Score
                      </small>

                      <strong>
                        {volunteer.trustScore ||
                          0}
                        /100
                      </strong>
                    </div>
                  </div>

                  <div className="event-meta-item">
                    <span className="event-meta-icon">
                      ⚡
                    </span>

                    <div>
                      <small>
                        Replacement Score
                      </small>

                      <strong>
                        {volunteer.replacementScore ||
                          0}
                      </strong>
                    </div>
                  </div>

                  <div className="event-meta-item">
                    <span className="event-meta-icon">
                      ✅
                    </span>

                    <div>
                      <small>
                        Attendance
                      </small>

                      <strong>
                        {
                          volunteer
                            .attendancePercentage
                        }
                        %
                      </strong>
                    </div>
                  </div>

                  <div className="event-meta-item">
                    <span className="event-meta-icon">
                      ⏱️
                    </span>

                    <div>
                      <small>
                        Volunteer Hours
                      </small>

                      <strong>
                        {Number(
                          volunteer.volunteerHours ||
                            0
                        ).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div className="event-meta-item">
                    <span className="event-meta-icon">
                      🏆
                    </span>

                    <div>
                      <small>
                        Completed Events
                      </small>

                      <strong>
                        {volunteer.eventsCompleted ||
                          0}
                      </strong>
                    </div>
                  </div>

                  <div className="event-meta-item">
                    <span className="event-meta-icon">
                      🎖️
                    </span>

                    <div>
                      <small>
                        Certificates
                      </small>

                      <strong>
                        {volunteer.certificatesEarned ||
                          0}
                      </strong>
                    </div>
                  </div>

                  <div className="event-meta-item">
                    <span className="event-meta-icon">
                      ❌
                    </span>

                    <div>
                      <small>
                        No-Shows
                      </small>

                      <strong>
                        {volunteer.noShows ||
                          0}
                      </strong>
                    </div>
                  </div>

                  <div className="event-meta-item">
                    <span className="event-meta-icon">
                      🛠
                    </span>

                    <div>
                      <small>
                        Skills
                      </small>

                      <strong>
                        {formatList(
                          volunteer.skills
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="event-meta-item">
                    <span className="event-meta-icon">
                      🎯
                    </span>

                    <div>
                      <small>
                        Requested Role
                      </small>

                      <strong>
                        {volunteer.requestedRole ||
                          "Not provided"}
                      </strong>
                    </div>
                  </div>

                  <div className="event-meta-item">
                    <span className="event-meta-icon">
                      🕒
                    </span>

                    <div>
                      <small>
                        Availability
                      </small>

                      <strong>
                        {volunteer.availabilityType ||
                          "Not provided"}
                      </strong>
                    </div>
                  </div>

                  <div className="event-meta-item">
                    <span className="event-meta-icon">
                      📞
                    </span>

                    <div>
                      <small>
                        Contact
                      </small>

                      <strong>
                        {volunteer.volunteerPhone ||
                          volunteer.emergencyContact ||
                          "Not provided"}
                      </strong>
                    </div>
                  </div>

                  <div className="event-meta-item">
                    <span className="event-meta-icon">
                      📌
                    </span>

                    <div>
                      <small>
                        Confirmation
                      </small>

                      <strong>
                        {getConfirmationLabel(
                          confirmationStatus
                        )}
                      </strong>
                    </div>
                  </div>
                </div>


                {/* ============================================
                    VOLUNTEER REPUTATION
                ============================================ */}

                <div className="event-card-section">
                  <h3>
                    🛡️{" "}
                    {getTrustLevel(
                      volunteer.trustScore
                    )}
                  </h3>

                  <p className="event-description">
                    Trust:{" "}
                    {volunteer.trustScore ||
                      0}
                    /100 · Attendance:{" "}
                    {
                      volunteer
                        .attendancePercentage
                    }
                    % · No-shows:{" "}
                    {volunteer.noShows ||
                      0}
                  </p>
                </div>


                {/* ============================================
                    CONFIRMATION STATUS
                ============================================ */}

                <div className="event-card-section">
                  <h3>
                    Attendance Confirmation
                  </h3>

                  <div className="event-benefits-row">
                    {confirmationStatus ===
                      "confirmed" && (
                      <span className="event-type-badge paid">
                        ✓ Confirmed
                      </span>
                    )}

                    {confirmationStatus ===
                      "declined" && (
                      <span className="status-completed">
                        Declined
                      </span>
                    )}

                    {confirmationStatus ===
                      "callback-requested" && (
                      <span className="event-type-badge certificate">
                        Callback Requested
                      </span>
                    )}

                    {confirmationStatus ===
                      "pending" && (
                      <span className="event-type-badge volunteer">
                        Waiting Confirmation
                      </span>
                    )}

                    {confirmationStatus ===
                      "not-requested" && (
                      <span className="event-type-badge certificate">
                        Confirmation Not Requested
                      </span>
                    )}

                    {confirmationStatus === "emergency-reported" && (
                      <span className="status-completed">
                        🚨 Emergency Reported
                      </span>
                    )}
                  </div>

                  {volunteer.declineReason && (
                    <p className="event-description">
                      Reason:{" "}
                      {
                        volunteer
                          .declineReason
                      }
                    </p>
                  )}

                  {volunteer.emergencyReason && (
                    <p className="event-description">
                      Emergency reason: {volunteer.emergencyReason}
                    </p>
                  )}
                </div>


                {/* ============================================
                    VOLUNTEER ACTIONS
                ============================================ */}

                <div className="event-action-buttons">
                  <button
                    type="button"
                    className="secondary-action-button"
                    onClick={() =>
                      navigate(
                        `/volunteer-details/${volunteer.volunteerId}`
                      )
                    }
                  >
                    👤 View Profile
                  </button>

                  {selectionType === "primary" &&
                    (volunteer.emergencyStatus === "reported" ||
                      volunteer.confirmationStatus === "emergency-reported") && (
                      <button
                        type="button"
                        className="delete-action-button"
                        onClick={() =>
                          requestEmergencyReplacement(volunteer)
                        }
                        disabled={
                          isProcessing ||
                          volunteer.emergencyStatus ===
                            "replacement-requested"
                        }
                      >
                        {isProcessing
                          ? "Sending Request..."
                          : volunteer.emergencyStatus ===
                              "replacement-requested"
                            ? "🚨 Replacement Requested"
                            : "🚨 Request Emergency Replacement"}
                      </button>
                    )}

                  {selectionType ===
                    "standby" && (
                    <button
                      type="button"
                      className="primary-action-button"
                      onClick={() =>
                        promoteToPrimary(
                          volunteer
                        )
                      }
                      disabled={
                        isProcessing ||
                        volunteer.replacementRequestStatus ===
                          "pending"
                      }
                    >
                      {isProcessing
                        ? "Processing..."
                        : "⬆ Promote to Primary"}
                    </button>
                  )}

                  {selectionType ===
                    "primary" &&
                    confirmationStatus ===
                      "declined" && (
                      <button
                        type="button"
                        className="secondary-action-button"
                        onClick={() =>
                          moveToStandby(
                            volunteer
                          )
                        }
                        disabled={
                          isProcessing
                        }
                      >
                        {isProcessing
                          ? "Processing..."
                          : "🧍 Move to Standby"}
                      </button>
                    )}
                </div>
              </article>
            );
          }
        )}
    </div>
  );
}

export default ApprovedVolunteers;