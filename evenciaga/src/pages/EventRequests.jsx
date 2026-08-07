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


// ==========================================================
// EVENT REQUESTS COMPONENT
// ==========================================================

function EventRequests() {
  // --------------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------------

  const navigate = useNavigate();


  // --------------------------------------------------------
  // AUTH STATE
  // --------------------------------------------------------

  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);


  // --------------------------------------------------------
  // PAGE STATE
  // --------------------------------------------------------

  const [requests, setRequests] = useState([]);
  const [eventsById, setEventsById] = useState({});

  const [loading, setLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] =
    useState("");

  const [error, setError] = useState("");

  const [selectedEventFilter, setSelectedEventFilter] =
    useState("");
  const [searchText, setSearchText] =
    useState("");
  const [statusFilter, setStatusFilter] =
    useState("pending");
  const [recommendationFilter, setRecommendationFilter] =
    useState("all");
  const [minimumTrustScore, setMinimumTrustScore] =
    useState(0);
  const [sortBy, setSortBy] =
    useState("match");


  // ========================================================
  // LOAD ORGANIZER REQUESTS
  // ========================================================

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      if (!currentUser) {
        setError("You must be logged in as an organizer.");
        return;
      }

      // ----------------------------------------------------
      // LOAD THIS ORGANIZER'S EVENTS
      // ----------------------------------------------------

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

      const eventMap = {};

      organizerEvents.forEach((event) => {
        eventMap[event.id] = event;
      });

      setEventsById(eventMap);

      const organizerEventIds = organizerEvents.map(
        (event) => event.id
      );

      // ----------------------------------------------------
      // LOAD REQUESTS FOR THOSE EVENTS
      // ----------------------------------------------------

      const requestsSnapshot = await getDocs(
        collection(db, "joinRequests")
      );

      const organizerRequests = requestsSnapshot.docs
        .map((requestDocument) => ({
          id: requestDocument.id,
          ...requestDocument.data(),
        }))
        .filter((request) =>
          organizerEventIds.includes(request.eventId)
        )
        .sort((firstRequest, secondRequest) => {
          const firstTime =
            firstRequest.requestedAt?.toMillis?.() || 0;

          const secondTime =
            secondRequest.requestedAt?.toMillis?.() || 0;

          return secondTime - firstTime;
        });

      // ----------------------------------------------------
      // LOAD CURRENT VOLUNTEER REPUTATION PROFILES
      // ----------------------------------------------------

      const requestsWithProfiles = await Promise.all(
        organizerRequests.map(async (request) => {
          if (!request.volunteerId) {
            return {
              ...request,
              trustScore: 0,
              currentRating: Number(request.rating || 0),
              attendancePercentage: 0,
              eventsCompleted: 0,
              volunteerHours: 0,
              certificatesEarned: 0,
              noShows: 0,
            };
          }

          try {
            const profileSnapshot = await getDoc(
              doc(db, "users", request.volunteerId)
            );

            const profile = profileSnapshot.exists()
              ? profileSnapshot.data()
              : {};

            return {
              ...request,

              trustScore: Number(
                profile.trustScore || 0
              ),

              currentRating: Number(
                profile.rating ??
                request.rating ??
                0
              ),

              attendancePercentage: Number(
                profile.attendancePercentage ??
                profile.attendancePercent ??
                0
              ),

              eventsCompleted: Number(
                profile.eventsCompleted || 0
              ),

              volunteerHours: Number(
                profile.volunteerHours || 0
              ),

              certificatesEarned: Number(
                profile.certificatesEarned || 0
              ),

              noShows: Number(
                profile.noShows || 0
              ),

              profileCompletion: Number(
                profile.profileCompletion || 0
              ),
            };
          } catch (profileError) {
            console.error(
              "Volunteer profile loading error:",
              profileError
            );

            return {
              ...request,
              trustScore: 0,
              currentRating: Number(request.rating || 0),
              attendancePercentage: 0,
              eventsCompleted: 0,
              volunteerHours: 0,
              certificatesEarned: 0,
              noShows: 0,
            };
          }
        })
      );

      // ----------------------------------------------------
      // CALCULATE EVENT-SPECIFIC MATCH SCORES
      // ----------------------------------------------------

      const rankedRequests =
        requestsWithProfiles
          .map((request) => {
            const eventData =
              eventMap[
                request.eventId
              ];

            const volunteerScore =
              calculateVolunteerScore(
                request,
                eventData
              );

            return {
              ...request,

              volunteerScore,

              skillMatchScore:
                calculateSkillMatch(
                  request,
                  eventData
                ),

              availabilityScore:
                calculateAvailabilityScore(
                  request
                ),
            };
          })
          .sort(
            (
              firstRequest,
              secondRequest
            ) => {
              const firstPending =
                firstRequest
                  .applicationStatus ===
                  "pending" ||
                (
                  !firstRequest
                    .applicationStatus &&
                  firstRequest.status ===
                    "pending"
                );

              const secondPending =
                secondRequest
                  .applicationStatus ===
                  "pending" ||
                (
                  !secondRequest
                    .applicationStatus &&
                  secondRequest.status ===
                    "pending"
                );

              // Keep pending applications first.
              if (
                firstPending &&
                !secondPending
              ) {
                return -1;
              }

              if (
                !firstPending &&
                secondPending
              ) {
                return 1;
              }

              // Then rank by smart match score.
              if (
                secondRequest
                  .volunteerScore !==
                firstRequest
                  .volunteerScore
              ) {
                return (
                  secondRequest
                    .volunteerScore -
                  firstRequest
                    .volunteerScore
                );
              }

              // Final fallback: newest request first.
              const firstTime =
                firstRequest
                  .requestedAt
                  ?.toMillis?.() ||
                0;

              const secondTime =
                secondRequest
                  .requestedAt
                  ?.toMillis?.() ||
                0;

              return (
                secondTime -
                firstTime
              );
            }
          );

      setRequests(
        rankedRequests
      );
    } catch (requestError) {
      console.error(
        "Load event requests error:",
        requestError
      );

      setError(
        requestError?.message ||
          "Unable to load event requests."
      );
    } finally {
      setLoading(false);
    }
  };


  // ========================================================
  // WAIT FOR FIREBASE AUTHENTICATION
  // ========================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user || null);
        setAuthReady(true);
      }
    );

    return unsubscribe;
  }, []);


  // ========================================================
  // INITIAL LOAD
  // ========================================================

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!currentUser) {
      setError("You must be logged in as an organizer.");
      setLoading(false);
      return;
    }

    fetchRequests();
  }, [authReady, currentUser]);


  // ========================================================
  // DERIVED COUNTS
  // ========================================================

  const counts = useMemo(() => {
    return {
      total: requests.length,

      pending: requests.filter(
        (request) =>
          request.applicationStatus === "pending" ||
          (
            !request.applicationStatus &&
            request.status === "pending"
          )
      ).length,

      primary: requests.filter(
        (request) =>
          request.selectionType === "primary" ||
          (
            !request.selectionType &&
            request.status === "approved"
          )
      ).length,

      standby: requests.filter(
        (request) =>
          request.selectionType === "standby" ||
          request.status === "standby"
      ).length,

      rejected: requests.filter(
        (request) =>
          request.applicationStatus === "rejected" ||
          request.status === "rejected"
      ).length,


      recommended:
        requests.filter(
          (request) =>
            (
              request.applicationStatus === "pending" ||
              request.applicationStatus === "shortlisted" ||
              (
                !request.applicationStatus &&
                request.status === "pending"
              )
            ) &&
            Number(
              request.volunteerScore ||
              0
            ) >= 90
        ).length,

      shortlisted:
        requests.filter(
          (request) =>
            request.applicationStatus === "shortlisted"
        ).length,
    };
  }, [requests]);


  // ========================================================
  // HELPER: CHECK REQUEST IS PENDING
  // ========================================================

  const isPendingRequest = (request) => {
    if (request.applicationStatus) {
      return (
        request.applicationStatus === "pending" ||
        request.applicationStatus === "shortlisted"
      );
    }

    return request.status === "pending";
  };


  // ========================================================
  // HELPER: GET REQUEST DISPLAY STATUS
  // ========================================================

  const getRequestStatus = (request) => {
    if (
      request.selectionType === "primary" ||
      (
        !request.selectionType &&
        request.status === "approved"
      )
    ) {
      return "primary";
    }

    if (
      request.selectionType === "standby" ||
      request.status === "standby"
    ) {
      return "standby";
    }

    if (
      request.applicationStatus === "rejected" ||
      request.status === "rejected"
    ) {
      return "rejected";
    }

    if (
      request.applicationStatus === "shortlisted"
    ) {
      return "shortlisted";
    }

    return "pending";
  };


  // ========================================================
  // HELPER: FORMAT ARRAY VALUES
  // ========================================================

  const formatList = (value) => {
    if (Array.isArray(value)) {
      return value.length > 0
        ? value.join(", ")
        : "Not provided";
    }

    return value || "Not provided";
  };


  const getTrustLevel = (score) => {
    const trustScore = Number(score || 0);

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


  // ========================================================
  // SMART VOLUNTEER MATCH SCORE
  //
  // Maximum practical score is close to 150.
  //
  // Trust Score:       up to 50 points
  // Rating:            up to 25 points
  // Attendance:        up to 20 points
  // Completed Events:  up to 20 points
  // Certificates:      up to 10 points
  // Volunteer Hours:   up to 10 points
  // Skill Match:       up to 20 points
  // Availability:      up to 10 points
  // No-show penalty:  -15 points each
  // ========================================================

  const normalizeList = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) =>
          String(item)
            .trim()
            .toLowerCase()
        )
        .filter(Boolean);
    }

    if (!value) {
      return [];
    }

    return String(value)
      .split(",")
      .map((item) =>
        item
          .trim()
          .toLowerCase()
      )
      .filter(Boolean);
  };


  const calculateSkillMatch = (
    request,
    eventData
  ) => {
    const volunteerSkills =
      normalizeList(
        request.skills
      );

    const requiredSkills =
      normalizeList(
        eventData?.requiredSkills ??
        eventData?.skillsRequired ??
        eventData?.skills
      );

    // If the organizer did not define required skills,
    // do not punish the volunteer.
    if (
      requiredSkills.length === 0
    ) {
      return 10;
    }

    if (
      volunteerSkills.length === 0
    ) {
      return 0;
    }

    const matchedSkills =
      requiredSkills.filter(
        (requiredSkill) =>
          volunteerSkills.some(
            (volunteerSkill) =>
              volunteerSkill.includes(
                requiredSkill
              ) ||
              requiredSkill.includes(
                volunteerSkill
              )
          )
      ).length;

    return Number(
      (
        (
          matchedSkills /
          requiredSkills.length
        ) *
        20
      ).toFixed(1)
    );
  };


  const calculateAvailabilityScore = (
    request
  ) => {
    const availability =
      String(
        request.availabilityType ||
        ""
      ).toLowerCase();

    if (
      availability.includes(
        "full"
      ) ||
      availability.includes(
        "all day"
      )
    ) {
      return 10;
    }

    if (
      availability.includes(
        "partial"
      ) ||
      availability.includes(
        "limited"
      )
    ) {
      return 5;
    }

    // Older applications may not contain this field.
    return 3;
  };


  const calculateVolunteerScore = (
    request,
    eventData
  ) => {
    let score = 0;

    score +=
      Number(
        request.trustScore || 0
      ) *
      0.5;

    score +=
      Number(
        request.currentRating || 0
      ) *
      5;

    score +=
      Number(
        request.attendancePercentage ||
        0
      ) *
      0.2;

    score +=
      Math.min(
        Number(
          request.eventsCompleted ||
          0
        ),
        20
      );

    score +=
      Math.min(
        Number(
          request.certificatesEarned ||
          0
        ),
        10
      );

    score +=
      Math.min(
        Number(
          request.volunteerHours ||
          0
        ) /
        10,
        10
      );

    score +=
      calculateSkillMatch(
        request,
        eventData
      );

    score +=
      calculateAvailabilityScore(
        request
      );

    score -=
      Number(
        request.noShows || 0
      ) *
      15;

    return Number(
      Math.max(
        0,
        score
      ).toFixed(1)
    );
  };


  const getRecommendation = (
    score
  ) => {
    const matchScore =
      Number(score || 0);

    if (matchScore >= 115) {
      return {
        label:
          "Excellent Match",

        icon:
          "🌟",

        className:
          "status-active",
      };
    }

    if (matchScore >= 90) {
      return {
        label:
          "Strong Match",

        icon:
          "✅",

        className:
          "event-type-badge paid",
      };
    }

    if (matchScore >= 65) {
      return {
        label:
          "Good Match",

        icon:
          "👍",

        className:
          "event-type-badge volunteer",
      };
    }

    if (matchScore >= 40) {
      return {
        label:
          "Moderate Match",

        icon:
          "⚠️",

        className:
          "event-type-badge certificate",
      };
    }

    return {
      label:
        "Low Match",

      icon:
        "❌",

      className:
        "status-completed",
    };
  };


  // ========================================================
  // FILTERED AND SORTED APPLICATIONS
  // ========================================================

  const filteredRequests = useMemo(() => {
    let filtered = [...requests];

    if (selectedEventFilter) {
      filtered = filtered.filter(
        (request) =>
          request.eventId === selectedEventFilter
      );
    }

    const searchValue =
      searchText.trim().toLowerCase();

    if (searchValue) {
      filtered = filtered.filter((request) => {
        const searchableValues = [
          request.volunteerName,
          request.eventTitle,
          request.requestedRole,
          request.applicationNote,
          request.suitabilityReason,
          Array.isArray(request.skills)
            ? request.skills.join(" ")
            : request.skills,
        ];

        return searchableValues
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(searchValue);
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (request) =>
          getRequestStatus(request) ===
          statusFilter
      );
    }

    if (recommendationFilter !== "all") {
      filtered = filtered.filter(
        (request) =>
          getRecommendation(
            request.volunteerScore
          ).label === recommendationFilter
      );
    }

    filtered = filtered.filter(
      (request) =>
        Number(request.trustScore || 0) >=
        Number(minimumTrustScore || 0)
    );

    filtered.sort((first, second) => {
      if (sortBy === "trust") {
        return (
          Number(second.trustScore || 0) -
          Number(first.trustScore || 0)
        );
      }

      if (sortBy === "rating") {
        return (
          Number(
            second.currentRating ??
            second.rating ??
            0
          ) -
          Number(
            first.currentRating ??
            first.rating ??
            0
          )
        );
      }

      if (sortBy === "newest") {
        const firstTime =
          first.requestedAt?.toMillis?.() || 0;
        const secondTime =
          second.requestedAt?.toMillis?.() || 0;

        return secondTime - firstTime;
      }

      return (
        Number(second.volunteerScore || 0) -
        Number(first.volunteerScore || 0)
      );
    });

    return filtered;
  }, [
    requests,
    selectedEventFilter,
    searchText,
    statusFilter,
    recommendationFilter,
    minimumTrustScore,
    sortBy,
  ]);


  // ========================================================
  // HELPER: GET ALL REQUESTS FOR ONE EVENT
  // ========================================================

  const getEventRequests = async (eventId) => {
    const snapshot = await getDocs(
      query(
        collection(db, "joinRequests"),
        where("eventId", "==", eventId)
      )
    );

    return snapshot.docs.map((requestDocument) => ({
      id: requestDocument.id,
      ...requestDocument.data(),
    }));
  };


  // ========================================================
  // SHORTLIST VOLUNTEER
  // ========================================================

  const shortlistRequest = async (request) => {
    try {
      setProcessingRequestId(request.id);

      const eventSnapshot = await getDoc(
        doc(db, "events", request.eventId)
      );

      if (
        eventSnapshot.exists() &&
        eventSnapshot.data().status === "completed"
      ) {
        alert("Completed events cannot be changed.");
        return;
      }

      await updateDoc(
        doc(db, "joinRequests", request.id),
        {
          status: "pending",
          applicationStatus: "shortlisted",
          shortlistedAt: serverTimestamp(),
          shortlistedBy: currentUser.uid,
          updatedAt: serverTimestamp(),
        }
      );

      await addDoc(
        collection(db, "notifications"),
        {
          volunteerId: request.volunteerId,
          eventId: request.eventId,
          eventTitle: request.eventTitle,

          title: "Application Shortlisted",
          message:
            `Your application for "${request.eventTitle}" has been shortlisted for further review.`,

          type: "application-shortlisted",
          category: "information",
          requiresAction: false,

          actionRoute: "/my-applications",
          actionLabel: "View Application",

          isRead: false,
          createdAt: serverTimestamp(),
        }
      );

      alert("Volunteer shortlisted successfully.");
      await fetchRequests();
    } catch (shortlistError) {
      console.error(
        "Shortlist request error:",
        shortlistError
      );

      alert(
        shortlistError?.message ||
          "Failed to shortlist volunteer."
      );
    } finally {
      setProcessingRequestId("");
    }
  };


  const removeFromShortlist = async (request) => {
    try {
      setProcessingRequestId(request.id);

      await updateDoc(
        doc(db, "joinRequests", request.id),
        {
          status: "pending",
          applicationStatus: "pending",
          shortlistedAt: null,
          shortlistedBy: null,
          updatedAt: serverTimestamp(),
        }
      );

      alert("Volunteer removed from shortlist.");
      await fetchRequests();
    } catch (removeError) {
      console.error(
        "Remove shortlist error:",
        removeError
      );

      alert(
        removeError?.message ||
          "Failed to remove volunteer from shortlist."
      );
    } finally {
      setProcessingRequestId("");
    }
  };


  // ========================================================
  // SELECT VOLUNTEER AS PRIMARY
  // ========================================================

  const selectAsPrimary = async (request) => {
    try {
      setProcessingRequestId(request.id);

      const eventSnapshot = await getDoc(
        doc(db, "events", request.eventId)
      );

      if (!eventSnapshot.exists()) {
        alert("Event was not found.");
        return;
      }

      const eventData = eventSnapshot.data();

      if (eventData.status === "completed") {
        alert("Completed events cannot accept volunteers.");
        return;
      }

      const eventRequests = await getEventRequests(
        request.eventId
      );

      const primaryCount = eventRequests.filter(
        (eventRequest) =>
          eventRequest.selectionType === "primary" ||
          (
            !eventRequest.selectionType &&
            eventRequest.status === "approved"
          )
      ).length;

      const primaryLimit = Number(
        eventData.primaryLimit ??
          eventData.requiredVolunteers ??
          0
      );

      if (primaryCount >= primaryLimit) {
        alert("Primary volunteer limit has been reached.");
        return;
      }

      await updateDoc(
        doc(db, "joinRequests", request.id),
        {
          status: "approved",

          applicationStatus: "selected",
          selectionType: "primary",

          standbyPosition: null,

          confirmationStatus: "pending",

          selectedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      await addDoc(
        collection(db, "notifications"),
        {
          volunteerId: request.volunteerId,

          eventId: request.eventId,
          eventTitle: request.eventTitle,

          title: "Selected as Primary Volunteer",

          message:
            `You were selected as a primary volunteer for "${request.eventTitle}". Please confirm your attendance.`,

          type: "primary-selected",
          category: "action",
          requiresAction: true,

          actionRoute: "/my-applications",
          actionLabel: "Confirm Attendance",

          isRead: false,

          createdAt: serverTimestamp(),
        }
      );

      alert("Volunteer selected as primary.");

      await fetchRequests();
    } catch (selectionError) {
      console.error(
        "Primary selection error:",
        selectionError
      );

      alert(
        selectionError?.message ||
          "Failed to select primary volunteer."
      );
    } finally {
      setProcessingRequestId("");
    }
  };


  // ========================================================
  // ADD VOLUNTEER TO STANDBY
  // ========================================================

  const addToStandby = async (request) => {
    try {
      setProcessingRequestId(request.id);

      const eventSnapshot = await getDoc(
        doc(db, "events", request.eventId)
      );

      if (!eventSnapshot.exists()) {
        alert("Event was not found.");
        return;
      }

      const eventData = eventSnapshot.data();

      if (eventData.status === "completed") {
        alert("Completed events cannot accept volunteers.");
        return;
      }

      const eventRequests = await getEventRequests(
        request.eventId
      );

      const standbyRequests = eventRequests.filter(
        (eventRequest) =>
          eventRequest.selectionType === "standby" ||
          eventRequest.status === "standby"
      );

      const standbyLimit = Number(
        eventData.standbyLimit || 0
      );

      if (standbyLimit <= 0) {
        alert(
          "This event does not have standby positions."
        );

        return;
      }

      if (standbyRequests.length >= standbyLimit) {
        alert("Standby volunteer limit has been reached.");
        return;
      }

      const nextStandbyPosition =
        standbyRequests.length + 1;

      await updateDoc(
        doc(db, "joinRequests", request.id),
        {
          status: "standby",

          applicationStatus: "selected",
          selectionType: "standby",

          standbyPosition: nextStandbyPosition,

          confirmationStatus: "not-requested",

          selectedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      await addDoc(
        collection(db, "notifications"),
        {
          volunteerId: request.volunteerId,

          eventId: request.eventId,
          eventTitle: request.eventTitle,

          title: "Added to Standby List",

          message:
            `You were added to the standby list for "${request.eventTitle}" at position ${nextStandbyPosition}.`,

          type: "standby-selected",
          category: "information",
          requiresAction: false,

          actionRoute: "/my-applications",
          actionLabel: "View Application",

          isRead: false,

          createdAt: serverTimestamp(),
        }
      );

      alert(
        `Volunteer added to standby position ${nextStandbyPosition}.`
      );

      await fetchRequests();
    } catch (standbyError) {
      console.error(
        "Standby selection error:",
        standbyError
      );

      alert(
        standbyError?.message ||
          "Failed to add volunteer to standby."
      );
    } finally {
      setProcessingRequestId("");
    }
  };


  // ========================================================
  // REJECT VOLUNTEER
  // ========================================================

  const rejectRequest = async (request) => {
    try {
      setProcessingRequestId(request.id);

      const eventSnapshot = await getDoc(
        doc(db, "events", request.eventId)
      );

      if (
        eventSnapshot.exists() &&
        eventSnapshot.data().status === "completed"
      ) {
        alert("Completed events cannot be changed.");
        return;
      }

      await updateDoc(
        doc(db, "joinRequests", request.id),
        {
          status: "rejected",

          applicationStatus: "rejected",
          selectionType: null,

          standbyPosition: null,
          confirmationStatus: "not-requested",

          rejectedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      await addDoc(
        collection(db, "notifications"),
        {
          volunteerId: request.volunteerId,

          eventId: request.eventId,
          eventTitle: request.eventTitle,

          title: "Application Not Selected",

          message:
            `Your application for "${request.eventTitle}" was not selected.`,

          type: "rejection",
          category: "information",
          requiresAction: false,

          actionRoute: "/my-applications",
          actionLabel: "View Applications",

          isRead: false,

          createdAt: serverTimestamp(),
        }
      );

      alert("Volunteer application rejected.");

      await fetchRequests();
    } catch (rejectionError) {
      console.error(
        "Reject request error:",
        rejectionError
      );

      alert(
        rejectionError?.message ||
          "Failed to reject application."
      );
    } finally {
      setProcessingRequestId("");
    }
  };


  // ========================================================
  // LOADING SCREEN
  // ========================================================

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">📩</div>

          <h2>Loading Applications</h2>

          <p>
            Fetching volunteer applications for your events.
          </p>
        </div>
      </div>
    );
  }


  // ========================================================
  // ERROR SCREEN
  // ========================================================

  if (error) {
    return (
      <div className="page-container">
        <BackButton />

        <div className="page-card empty-state">
          <div className="empty-icon">⚠️</div>

          <h2>Unable to Load Applications</h2>

          <p>{error}</p>
        </div>
      </div>
    );
  }


  // ========================================================
  // EVENT REQUESTS UI
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
            Event Applications
          </h1>

          <p className="page-subtitle">
            Review volunteer applications and select primary
            or standby volunteers for each event.
          </p>
        </div>

        <div className="organizer-status approved">
          📩 {counts.pending} Pending
        </div>
      </section>


      {/* ====================================================
          APPLICATION STATISTICS
      ==================================================== */}

      <section className="dashboard-stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📩</div>

          <div>
            <p>Total Applications</p>
            <h2>{counts.total}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>

          <div>
            <p>Pending</p>
            <h2>{counts.pending}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>

          <div>
            <p>Primary</p>
            <h2>{counts.primary}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🧍</div>

          <div>
            <p>Standby</p>
            <h2>{counts.standby}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">❌</div>

          <div>
            <p>Rejected</p>
            <h2>{counts.rejected}</h2>
          </div>
        </div>


        <div className="stat-card">
          <div className="stat-icon">🧠</div>

          <div>
            <p>Recommended</p>
            <h2>{counts.recommended}</h2>
          </div>
        </div>


        <div className="stat-card">
          <div className="stat-icon">📌</div>

          <div>
            <p>Shortlisted</p>
            <h2>{counts.shortlisted}</h2>
          </div>
        </div>
      </section>


      {/* ====================================================
          FILTERS
      ==================================================== */}

      <section className="page-card">
        <div className="event-card-header">
          <div>
            <p className="dashboard-eyebrow">
              Application Controls
            </p>

            <h2 className="page-title">
              Search, Filter and Sort
            </h2>

            <p className="page-subtitle">
              Showing {filteredRequests.length} of {requests.length}
              applications.
            </p>
          </div>

          <button
            type="button"
            className="secondary-action-button"
            onClick={() => {
              setSelectedEventFilter("");
              setSearchText("");
              setStatusFilter("pending");
              setRecommendationFilter("all");
              setMinimumTrustScore(0);
              setSortBy("match");
            }}
          >
            Reset Filters
          </button>
        </div>

        <div className="event-meta-grid">
          <div>
            <label className="input-label">
              Event
            </label>

            <select
              className="modern-select"
              value={selectedEventFilter}
              onChange={(event) =>
                setSelectedEventFilter(
                  event.target.value
                )
              }
            >
              <option value="">
                All Events
              </option>

              {Object.values(eventsById).map((event) => (
                <option
                  key={event.id}
                  value={event.id}
                >
                  {event.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">
              Search
            </label>

            <input
              type="text"
              className="modern-input"
              placeholder="Volunteer, skill, role..."
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
            />
          </div>

          <div>
            <label className="input-label">
              Status
            </label>

            <select
              className="modern-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="primary">Primary</option>
              <option value="standby">Standby</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="input-label">
              Recommendation
            </label>

            <select
              className="modern-select"
              value={recommendationFilter}
              onChange={(event) =>
                setRecommendationFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Recommendations
              </option>
              <option value="Excellent Match">
                Excellent Match
              </option>
              <option value="Strong Match">
                Strong Match
              </option>
              <option value="Good Match">
                Good Match
              </option>
              <option value="Moderate Match">
                Moderate Match
              </option>
              <option value="Low Match">
                Low Match
              </option>
            </select>
          </div>

          <div>
            <label className="input-label">
              Minimum Trust Score
            </label>

            <input
              type="number"
              className="modern-input"
              min="0"
              max="100"
              value={minimumTrustScore}
              onChange={(event) =>
                setMinimumTrustScore(
                  event.target.value
                )
              }
            />
          </div>

          <div>
            <label className="input-label">
              Sort By
            </label>

            <select
              className="modern-select"
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value)
              }
            >
              <option value="match">Match Score</option>
              <option value="trust">Trust Score</option>
              <option value="rating">Rating</option>
              <option value="newest">
                Newest Application
              </option>
            </select>
          </div>
        </div>
      </section>


      {/* ====================================================
          EMPTY STATE
      ==================================================== */}

      {requests.length === 0 && (
        <div className="page-card empty-state">
          <div className="empty-icon">📩</div>

          <h2>No Applications Yet</h2>

          <p>
            Volunteer applications for your events will
            appear here.
          </p>
        </div>
      )}


      {requests.length > 0 &&
        filteredRequests.length === 0 && (
          <div className="page-card empty-state">
            <div className="empty-icon">
              🔎
            </div>

            <h2>
              No Matching Applications
            </h2>

            <p>
              Change or reset the filters to see more applications.
            </p>
          </div>
        )}


      {/* ====================================================
          APPLICATION CARDS
      ==================================================== */}

      {filteredRequests.map((request) => {
        const status =
          getRequestStatus(request);

        const eventData =
          eventsById[request.eventId];

        const isProcessing =
          processingRequestId === request.id;

        const recommendation =
          getRecommendation(
            request.volunteerScore
          );

        return (
          <article
            key={request.id}
            className="event-card"
          >
            <div className="event-card-header">
              <div>
                <p className="dashboard-eyebrow">
                  Volunteer Application
                </p>

                <h2 className="event-title">
                  {request.eventTitle ||
                    eventData?.title ||
                    "Untitled Event"}
                </h2>

                <p className="event-description">
                  {request.volunteerName ||
                    "Volunteer"}
                  {" applied for "}
                  {request.requestedRole ||
                    "an available role"}
                </p>
              </div>

              {status === "primary" ? (
                <span className="status-active">
                  Primary
                </span>
              ) : status === "standby" ? (
                <span className="event-type-badge certificate">
                  Standby #{request.standbyPosition || "-"}
                </span>
              ) : status === "rejected" ? (
                <span className="status-completed">
                  Rejected
                </span>
              ) : status === "shortlisted" ? (
                <span className="event-type-badge certificate">
                  Shortlisted
                </span>
              ) : (
                <span className="event-type-badge volunteer">
                  Pending
                </span>
              )}

              <span
                className={
                  recommendation.className
                }
              >
                {recommendation.icon}
                {" "}
                {recommendation.label}
              </span>
            </div>


            {/* ==============================================
                APPLICATION SUMMARY
            ============================================== */}

            <div className="event-meta-grid">
              <div className="event-meta-item">
                <span className="event-meta-icon">👤</span>

                <div>
                  <small>Volunteer</small>

                  <strong>
                    {request.volunteerName ||
                      "Not provided"}
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">🎯</span>

                <div>
                  <small>Requested Role</small>

                  <strong>
                    {request.requestedRole ||
                      "Not provided"}
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">⭐</span>

                <div>
                  <small>Rating</small>

                  <strong>
                    {Number(
                      request.currentRating ??
                      request.rating ??
                      0
                    ).toFixed(1)}
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">🛡️</span>

                <div>
                  <small>Trust Score</small>

                  <strong>
                    {request.trustScore || 0}/100
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">🧠</span>

                <div>
                  <small>Match Score</small>

                  <strong>
                    {request.volunteerScore || 0}
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">🎯</span>

                <div>
                  <small>Skill Match</small>

                  <strong>
                    {request.skillMatchScore || 0}/20
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">📆</span>

                <div>
                  <small>Availability Score</small>

                  <strong>
                    {request.availabilityScore || 0}/10
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">✅</span>

                <div>
                  <small>Attendance</small>

                  <strong>
                    {request.attendancePercentage || 0}%
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">⏱️</span>

                <div>
                  <small>Volunteer Hours</small>

                  <strong>
                    {Number(request.volunteerHours || 0).toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">🏆</span>

                <div>
                  <small>Completed Events</small>

                  <strong>
                    {request.eventsCompleted || 0}
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">🎖️</span>

                <div>
                  <small>Certificates</small>

                  <strong>
                    {request.certificatesEarned || 0}
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">❌</span>

                <div>
                  <small>No-Shows</small>

                  <strong>
                    {request.noShows || 0}
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">🕒</span>

                <div>
                  <small>Availability</small>

                  <strong>
                    {request.availabilityType ||
                      "Not provided"}
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">📞</span>

                <div>
                  <small>Emergency Contact</small>

                  <strong>
                    {request.emergencyContact ||
                      "Not provided"}
                  </strong>
                </div>
              </div>

              <div className="event-meta-item">
                <span className="event-meta-icon">🛠</span>

                <div>
                  <small>Skills</small>

                  <strong>
                    {formatList(request.skills)}
                  </strong>
                </div>
              </div>
            </div>


            {/* ==============================================
                VOLUNTEER REPUTATION SUMMARY
            ============================================== */}

            <div className="event-card-section">
              <h3>
                {recommendation.icon}
                {" "}
                {recommendation.label}
              </h3>

              <p className="event-description">
                Smart match score: {request.volunteerScore || 0}
                {" · "}
                Trust: {request.trustScore || 0}/100
                {" · "}
                Skill match: {request.skillMatchScore || 0}/20
                {" · "}
                Attendance: {request.attendancePercentage || 0}%
                {" · "}
                No-shows: {request.noShows || 0}
              </p>

              <p className="event-description">
                Trust level: {getTrustLevel(request.trustScore)}.
                This score is a recommendation aid, not an automatic
                selection decision.
              </p>
            </div>


            {/* ==============================================
                APPLICATION DETAILS
            ============================================== */}

            <div className="event-card-section">
              <h3>Why this volunteer is suitable</h3>

              <p className="event-description">
                {request.suitabilityReason ||
                  "No suitability explanation provided."}
              </p>
            </div>

            <div className="event-card-section">
              <h3>Application Note</h3>

              <p className="event-description">
                {request.applicationNote ||
                  "No application note provided."}
              </p>
            </div>

            <div className="event-benefits-row">
              <span
                className={
                  request.attendanceConfirmed
                    ? "event-type-badge paid"
                    : "event-type-badge certificate"
                }
              >
                {request.attendanceConfirmed
                  ? "✓ Attendance commitment accepted"
                  : "Attendance commitment unavailable"}
              </span>

              {eventData && (
                <>
                  <span className="event-type-badge volunteer">
                    Primary limit:{" "}
                    {eventData.primaryLimit ??
                      eventData.requiredVolunteers ??
                      0}
                  </span>

                  <span className="event-type-badge certificate">
                    Standby limit:{" "}
                    {eventData.standbyLimit || 0}
                  </span>
                </>
              )}
            </div>


            {/* ==============================================
                PROFILE ACTION
            ============================================== */}

            <div className="event-action-buttons">
              <button
                type="button"
                className="secondary-action-button"
                onClick={() =>
                  navigate(
                    `/volunteer-details/${request.volunteerId}`
                  )
                }
              >
                👤 View Volunteer Profile
              </button>
            </div>


            {/* ==============================================
                SELECTION ACTIONS
            ============================================== */}

            {isPendingRequest(request) && (
              <div className="event-action-buttons">
                {status === "pending" && (
                  <button
                    type="button"
                    className="secondary-action-button"
                    onClick={() =>
                      shortlistRequest(request)
                    }
                    disabled={isProcessing}
                  >
                    {isProcessing
                      ? "Processing..."
                      : "📌 Shortlist"}
                  </button>
                )}

                {status === "shortlisted" && (
                  <button
                    type="button"
                    className="secondary-action-button"
                    onClick={() =>
                      removeFromShortlist(request)
                    }
                    disabled={isProcessing}
                  >
                    {isProcessing
                      ? "Processing..."
                      : "↩ Remove Shortlist"}
                  </button>
                )}

                <button
                  type="button"
                  className="primary-action-button"
                  onClick={() =>
                    selectAsPrimary(request)
                  }
                  disabled={isProcessing}
                >
                  {isProcessing
                    ? "Processing..."
                    : "✅ Select Primary"}
                </button>

                <button
                  type="button"
                  className="secondary-action-button"
                  onClick={() =>
                    addToStandby(request)
                  }
                  disabled={isProcessing}
                >
                  {isProcessing
                    ? "Processing..."
                    : "🧍 Add to Standby"}
                </button>

                <button
                  type="button"
                  className="delete-action-button"
                  onClick={() =>
                    rejectRequest(request)
                  }
                  disabled={isProcessing}
                >
                  {isProcessing
                    ? "Processing..."
                    : "❌ Reject"}
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default EventRequests;