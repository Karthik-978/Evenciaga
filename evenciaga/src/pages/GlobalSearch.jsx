import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
  db,
} from "../firebase";

import BackButton from "../components/BackButton";


// ==========================================================
// SAFE HELPERS
// ==========================================================

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value
      .join(" ")
      .toLowerCase();
  }

  return String(
    value ?? ""
  ).toLowerCase();
}


function isOrganizerProfile(user) {
  return (
    user.role === "organizer" ||
    user.organizerApproved === true ||
    Boolean(user.organizationName) ||
    Boolean(user.organizerStatus) ||
    Boolean(
      user.organizerApplicationStatus
    )
  );
}


function isVolunteerProfile(user) {
  return (
    !isOrganizerProfile(user) &&
    user.role !== "admin"
  );
}


function formatDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  if (value?.toDate) {
    return value
      .toDate()
      .toLocaleDateString();
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? "Date unavailable"
    : date.toLocaleDateString();
}


function getUserRole(profile) {
  if (
    profile?.role === "admin" ||
    profile?.isAdmin === true
  ) {
    return "admin";
  }

  if (
    profile?.role === "organizer" ||
    profile?.organizerApproved === true ||
    profile?.organizerStatus === "approved" ||
    profile?.organizerApplicationStatus === "approved"
  ) {
    return "organizer";
  }

  return "volunteer";
}


// ==========================================================
// GLOBAL SEARCH
// ==========================================================

function GlobalSearch() {
  const navigate =
    useNavigate();

  const [authReady, setAuthReady] =
    useState(false);

  const [currentUser, setCurrentUser] =
    useState(null);

  const [currentUserProfile, setCurrentUserProfile] =
    useState(null);

  const [events, setEvents] =
    useState([]);

  const [users, setUsers] =
    useState([]);

  const [certificates, setCertificates] =
    useState([]);

  const [reports, setReports] =
    useState([]);

  const [joinRequests, setJoinRequests] =
    useState([]);

  const [searchText, setSearchText] =
    useState("");

  const [activeFilter, setActiveFilter] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [warnings, setWarnings] =
    useState([]);


  // ========================================================
  // AUTHENTICATION
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
  // LOAD ROLE AND SEARCH DATA
  // ========================================================

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const loadData =
      async () => {
        if (!currentUser) {
          setError(
            "You must be logged in to use global search."
          );

          setLoading(false);

          return;
        }

        try {
          setLoading(true);
          setError("");
          setWarnings([]);

          const profileSnapshot =
            await getDoc(
              doc(
                db,
                "users",
                currentUser.uid
              )
            );

          const profile =
            profileSnapshot.exists()
              ? {
                  id:
                    profileSnapshot.id,

                  ...profileSnapshot.data(),
                }
              : {
                  id:
                    currentUser.uid,

                  email:
                    currentUser.email,

                  role:
                    "volunteer",
                };

          setCurrentUserProfile(
            profile
          );

          const collectionNames = [
            "events",
            "users",
            "certificates",
            "reports",
            "joinRequests",
          ];

          const results =
            await Promise.allSettled(
              collectionNames.map(
                (collectionName) =>
                  getDocs(
                    collection(
                      db,
                      collectionName
                    )
                  )
              )
            );

          const failedCollections = [];

          const readResult = (
            result,
            collectionName
          ) => {
            if (
              result.status ===
              "fulfilled"
            ) {
              return result.value.docs.map(
                (document) => ({
                  id:
                    document.id,

                  ...document.data(),
                })
              );
            }

            console.error(
              `Unable to load ${collectionName}:`,
              result.reason
            );

            failedCollections.push(
              collectionName
            );

            return [];
          };

          setEvents(
            readResult(
              results[0],
              "events"
            )
          );

          setUsers(
            readResult(
              results[1],
              "users"
            )
          );

          setCertificates(
            readResult(
              results[2],
              "certificates"
            )
          );

          setReports(
            readResult(
              results[3],
              "reports"
            )
          );

          setJoinRequests(
            readResult(
              results[4],
              "joinRequests"
            )
          );

          if (
            failedCollections.length > 0
          ) {
            setWarnings(
              failedCollections
            );
          }
        } catch (loadError) {
          console.error(
            "Global search error:",
            loadError
          );

          setError(
            loadError?.message ||
              "Unable to load global search."
          );
        } finally {
          setLoading(false);
        }
      };

    loadData();
  }, [
    authReady,
    currentUser,
  ]);


  // ========================================================
  // ROLE
  // ========================================================

  const currentRole =
    useMemo(
      () =>
        getUserRole(
          currentUserProfile
        ),
      [currentUserProfile]
    );


  // ========================================================
  // ROLE-BASED DATA ACCESS
  // ========================================================

  const accessibleData =
    useMemo(() => {
      if (
        currentRole === "admin"
      ) {
        return {
          events,
          users,
          certificates,
          reports,
        };
      }

      if (
        currentRole === "organizer"
      ) {
        const organizerEvents =
          events.filter(
            (event) =>
              event.organizerId ===
              currentUser?.uid
          );

        const organizerEventIds =
          new Set(
            organizerEvents.map(
              (event) =>
                event.id
            )
          );

        const connectedRequests =
          joinRequests.filter(
            (request) =>
              organizerEventIds.has(
                request.eventId
              )
          );

        const connectedVolunteerIds =
          new Set(
            connectedRequests
              .map(
                (request) =>
                  request.volunteerId
              )
              .filter(Boolean)
          );

        const connectedUsers =
          users.filter(
            (user) =>
              connectedVolunteerIds.has(
                user.id
              )
          );

        const organizerCertificates =
          certificates.filter(
            (certificate) =>
              certificate.organizerId ===
                currentUser?.uid ||
              organizerEventIds.has(
                certificate.eventId
              )
          );

        const organizerReports =
          reports.filter(
            (report) =>
              report.organizerId ===
                currentUser?.uid ||
              organizerEventIds.has(
                report.eventId
              )
          );

        return {
          events:
            organizerEvents,

          users:
            connectedUsers,

          certificates:
            organizerCertificates,

          reports:
            organizerReports,
        };
      }

      // Volunteer access:
      // - active/upcoming events
      // - organizer profiles
      // - only their own certificates
      // - no reports
      const volunteerEvents =
        events.filter(
          (event) =>
            event.status !==
              "cancelled" &&
            event.status !==
              "deleted"
        );

      const organizerUsers =
        users.filter(
          isOrganizerProfile
        );

      const ownCertificates =
        certificates.filter(
          (certificate) =>
            certificate.volunteerId ===
            currentUser?.uid
        );

      return {
        events:
          volunteerEvents,

        users:
          organizerUsers,

        certificates:
          ownCertificates,

        reports:
          [],
      };
    }, [
      currentRole,
      currentUser,
      events,
      users,
      certificates,
      reports,
      joinRequests,
    ]);


  // ========================================================
  // BUILD SEARCH RESULTS
  // ========================================================

  const allResults =
    useMemo(() => {
      const eventResults =
        accessibleData.events.map(
          (event) => ({
            id:
              `event-${event.id}`,

            type:
              "events",

            icon:
              "📅",

            title:
              event.title ||
              "Untitled Event",

            subtitle:
              event.location ||
              "Location unavailable",

            description:
              event.description ||
              `Event date: ${formatDate(
                event.date
              )}`,

            route:
              currentRole ===
                "volunteer"
                ? "/dashboard"
                : "/my-events",

            searchable:
              [
                event.title,
                event.location,
                event.description,
                event.eventType,
                event.status,
                event.organizerEmail,
              ]
                .map(
                  normalizeValue
                )
                .join(" "),
          })
        );

      const volunteerResults =
        currentRole === "admin" ||
        currentRole === "organizer"
          ? accessibleData.users
              .filter(
                isVolunteerProfile
              )
              .map(
                (user) => ({
                  id:
                    `volunteer-${user.id}`,

                  type:
                    "volunteers",

                  icon:
                    "🙋",

                  title:
                    user.name ||
                    user.email ||
                    "Volunteer",

                  subtitle:
                    user.email ||
                    "Email unavailable",

                  description:
                    [
                      user.city,
                      Array.isArray(
                        user.skills
                      )
                        ? user.skills.join(
                            ", "
                          )
                        : user.skills,
                    ]
                      .filter(Boolean)
                      .join(" · ") ||
                    "Volunteer profile",

                  route:
                    `/volunteer-details/${user.id}`,

                  searchable:
                    [
                      user.name,
                      user.email,
                      user.phone,
                      user.city,
                      user.college,
                      user.skills,
                      user.languages,
                      user.interests,
                    ]
                      .map(
                        normalizeValue
                      )
                      .join(" "),
                })
              )
          : [];

      const organizerResults =
        currentRole === "admin" ||
        currentRole === "volunteer"
          ? accessibleData.users
              .filter(
                isOrganizerProfile
              )
              .map(
                (user) => ({
                  id:
                    `organizer-${user.id}`,

                  type:
                    "organizers",

                  icon:
                    "🏢",

                  title:
                    user.organizationName ||
                    user.name ||
                    "Organizer",

                  subtitle:
                    user.email ||
                    "Email unavailable",

                  description:
                    [
                      user.organizationType,
                      user.city,
                    ]
                      .filter(Boolean)
                      .join(" · ") ||
                    "Organizer profile",

                  route:
                    currentRole === "admin"
                      ? `/user-details/${user.id}`
                      : "/dashboard",

                  searchable:
                    [
                      user.organizationName,
                      user.name,
                      user.email,
                      user.phone,
                      user.city,
                      user.organizationType,
                    ]
                      .map(
                        normalizeValue
                      )
                      .join(" "),
                })
              )
          : [];

      const certificateResults =
        accessibleData.certificates.map(
          (certificate) => ({
            id:
              `certificate-${certificate.id}`,

            type:
              "certificates",

            icon:
              "🏆",

            title:
              certificate.eventTitle ||
              "Certificate",

            subtitle:
              certificate.certificateNumber ||
              "Certificate number unavailable",

            description:
              certificate.volunteerName
                ? `Issued to ${certificate.volunteerName}`
                : "Issued certificate",

            route:
              `/certificate/${certificate.id}`,

            searchable:
              [
                certificate.certificateNumber,
                certificate.eventTitle,
                certificate.volunteerName,
                certificate.location,
              ]
                .map(
                  normalizeValue
                )
                .join(" "),
          })
        );

      const reportResults =
        currentRole === "admin" ||
        currentRole === "organizer"
          ? accessibleData.reports.map(
              (report) => ({
                id:
                  `report-${report.id}`,

                type:
                  "reports",

                icon:
                  "🚩",

                title:
                  report.title ||
                  report.reason ||
                  "Report",

                subtitle:
                  report.status ||
                  "Status unavailable",

                description:
                  report.description ||
                  report.details ||
                  report.message ||
                  "Report details unavailable",

                route:
                  "/reports",

                searchable:
                  [
                    report.title,
                    report.reason,
                    report.description,
                    report.details,
                    report.message,
                    report.status,
                    report.eventTitle,
                  ]
                    .map(
                      normalizeValue
                    )
                    .join(" "),
              })
            )
          : [];

      return [
        ...eventResults,
        ...volunteerResults,
        ...organizerResults,
        ...certificateResults,
        ...reportResults,
      ];
    }, [
      accessibleData,
      currentRole,
    ]);


  // ========================================================
  // FILTER RESULTS
  // ========================================================

  const filteredResults =
    useMemo(() => {
      const queryText =
        searchText
          .trim()
          .toLowerCase();

      return allResults.filter(
        (result) => {
          const categoryMatches =
            activeFilter ===
              "all" ||
            result.type ===
              activeFilter;

          const textMatches =
            !queryText ||
            result.searchable.includes(
              queryText
            );

          return (
            categoryMatches &&
            textMatches
          );
        }
      );
    }, [
      allResults,
      searchText,
      activeFilter,
    ]);


  const counts =
    useMemo(() => {
      const getCount = (
        type
      ) =>
        allResults.filter(
          (result) =>
            result.type === type
        ).length;

      return {
        all:
          allResults.length,

        events:
          getCount(
            "events"
          ),

        volunteers:
          getCount(
            "volunteers"
          ),

        organizers:
          getCount(
            "organizers"
          ),

        certificates:
          getCount(
            "certificates"
          ),

        reports:
          getCount(
            "reports"
          ),
      };
    }, [allResults]);


  // ========================================================
  // ROLE-BASED FILTER BUTTONS
  // ========================================================

  const filters =
    useMemo(() => {
      const availableFilters = [
        {
          key:
            "all",

          label:
            `All (${counts.all})`,
        },
        {
          key:
            "events",

          label:
            `Events (${counts.events})`,
        },
      ];

      if (
        currentRole === "admin" ||
        currentRole === "organizer"
      ) {
        availableFilters.push({
          key:
            "volunteers",

          label:
            `Volunteers (${counts.volunteers})`,
        });
      }

      if (
        currentRole === "admin" ||
        currentRole === "volunteer"
      ) {
        availableFilters.push({
          key:
            "organizers",

          label:
            `Organizers (${counts.organizers})`,
        });
      }

      availableFilters.push({
        key:
          "certificates",

        label:
          `Certificates (${counts.certificates})`,
      });

      if (
        currentRole === "admin" ||
        currentRole === "organizer"
      ) {
        availableFilters.push({
          key:
            "reports",

          label:
            `Reports (${counts.reports})`,
        });
      }

      return availableFilters;
    }, [
      counts,
      currentRole,
    ]);


  // ========================================================
  // RESET INVALID FILTER AFTER ROLE LOAD
  // ========================================================

  useEffect(() => {
    const filterExists =
      filters.some(
        (filter) =>
          filter.key ===
          activeFilter
      );

    if (!filterExists) {
      setActiveFilter(
        "all"
      );
    }
  }, [
    filters,
    activeFilter,
  ]);


  // ========================================================
  // LOADING / ERROR
  // ========================================================

  if (
    !authReady ||
    loading
  ) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">
            🔎
          </div>

          <h2>
            Loading Global Search
          </h2>

          <p>
            Loading role-based searchable records.
          </p>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="page-container">
        <BackButton />

        <div className="page-card empty-state">
          <div className="empty-icon">
            ⚠️
          </div>

          <h2>
            Unable to Load Search
          </h2>

          <p>
            {error}
          </p>
        </div>
      </div>
    );
  }


  // ========================================================
  // UI
  // ========================================================

  return (
    <div className="page-container">
      <section className="page-card organizer-hero">
        <BackButton />

        <div>
          <p className="dashboard-eyebrow">
            {currentRole === "admin"
              ? "Admin Search"
              : currentRole === "organizer"
                ? "Organizer Search"
                : "Volunteer Search"}
          </p>

          <h1 className="page-title">
            Global Search
          </h1>

          <p className="page-subtitle">
            {currentRole === "admin"
              ? "Search the entire platform."
              : currentRole === "organizer"
                ? "Search your events, connected volunteers, certificates, and reports."
                : "Search available events, organizers, and your certificates."}
          </p>
        </div>

        <div className="organizer-status approved">
          🔎 {filteredResults.length} Results
        </div>
      </section>


      {warnings.length > 0 && (
        <div className="form-message error">
          Some collections could not be read:
          {" "}
          {warnings.join(", ")}.
          Check Firestore rules.
        </div>
      )}


      <section className="page-card">
        <label className="input-label">
          Search
        </label>

        <input
          className="modern-input"
          type="text"
          placeholder="Search names, emails, skills, events, locations, certificates..."
          value={searchText}
          onChange={(event) =>
            setSearchText(
              event.target.value
            )
          }
          autoFocus
        />

        <div
          className="event-action-buttons"
          style={{
            marginTop:
              "16px",
          }}
        >
          {filters.map(
            (filter) => (
              <button
                key={
                  filter.key
                }
                type="button"
                className={
                  activeFilter ===
                  filter.key
                    ? "primary-action-button"
                    : "secondary-action-button"
                }
                onClick={() =>
                  setActiveFilter(
                    filter.key
                  )
                }
              >
                {filter.label}
              </button>
            )
          )}

          <button
            type="button"
            className="secondary-action-button"
            onClick={() => {
              setSearchText("");
              setActiveFilter("all");
            }}
          >
            Reset
          </button>
        </div>
      </section>


      {filteredResults.length === 0 ? (
        <div className="page-card empty-state">
          <div className="empty-icon">
            🔎
          </div>

          <h2>
            No Matching Results
          </h2>

          <p>
            Try another search term or category.
          </p>
        </div>
      ) : (
        <div
          style={{
            display:
              "grid",

            gap:
              "16px",
          }}
        >
          {filteredResults.map(
            (result) => (
              <article
                key={
                  result.id
                }
                className="event-card"
              >
                <div className="event-card-header">
                  <div>
                    <p className="dashboard-eyebrow">
                      {
                        result.type
                      }
                    </p>

                    <h2 className="event-title">
                      {
                        result.title
                      }
                    </h2>

                    <p className="event-description">
                      {
                        result.subtitle
                      }
                    </p>
                  </div>

                  <span className="event-type-badge volunteer">
                    {result.icon}
                    {" "}
                    {
                      result.type
                    }
                  </span>
                </div>

                <div className="event-card-section">
                  <p className="event-description">
                    {
                      result.description
                    }
                  </p>
                </div>

                <div className="event-action-buttons">
                  <button
                    type="button"
                    className="primary-action-button"
                    onClick={() =>
                      navigate(
                        result.route
                      )
                    }
                  >
                    Open Result
                  </button>
                </div>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;