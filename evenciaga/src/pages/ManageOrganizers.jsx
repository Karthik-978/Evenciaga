// ==========================================================
// REACT IMPORTS
// ==========================================================

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  auth,
  db,
} from "../firebase";


// ==========================================================
// COMPONENT IMPORTS
// ==========================================================

import BackButton from "../components/BackButton";


// ==========================================================
// MANAGE ORGANIZERS COMPONENT
// ==========================================================

function ManageOrganizers() {
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
  // DATA STATE
  // --------------------------------------------------------

  const [organizers, setOrganizers] =
    useState([]);

  const [events, setEvents] =
    useState([]);

  const [reports, setReports] =
    useState([]);

  const [payments, setPayments] =
    useState([]);

  const [certificates, setCertificates] =
    useState([]);


  // --------------------------------------------------------
  // UI STATE
  // --------------------------------------------------------

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState("");

  const [error, setError] =
    useState("");

  const [searchText, setSearchText] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [sortBy, setSortBy] =
    useState("organization");


  // ========================================================
  // AUTH LISTENER
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
  // LOAD ADMIN DATA
  // ========================================================

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const loadData =
      async () => {
        if (!currentUser) {
          setError(
            "You must be logged in as an admin."
          );

          setLoading(false);

          return;
        }

        try {
          setLoading(true);
          setError("");

          const [
            usersSnapshot,
            eventsSnapshot,
            reportsSnapshot,
            paymentsSnapshot,
            certificatesSnapshot,
          ] = await Promise.all([
            getDocs(
              collection(
                db,
                "users"
              )
            ),

            getDocs(
              collection(
                db,
                "events"
              )
            ),

            getDocs(
              collection(
                db,
                "reports"
              )
            ),

            getDocs(
              collection(
                db,
                "payments"
              )
            ),

            getDocs(
              collection(
                db,
                "certificates"
              )
            ),
          ]);

          const organizerData =
            usersSnapshot.docs
              .map(
                (userDocument) => ({
                  id:
                    userDocument.id,

                  ...userDocument.data(),
                })
              )
              .filter(
                (user) =>
                  user.organizerApproved ===
                    true ||
                  user.role ===
                    "organizer" ||
                  Boolean(
                    user.organizationName
                  ) ||
                  Boolean(
                    user.organizerStatus
                  ) ||
                  Boolean(
                    user.organizerApplicationStatus
                  )
              );

          setOrganizers(
            organizerData
          );

          setEvents(
            eventsSnapshot.docs.map(
              (eventDocument) => ({
                id:
                  eventDocument.id,

                ...eventDocument.data(),
              })
            )
          );

          setReports(
            reportsSnapshot.docs.map(
              (reportDocument) => ({
                id:
                  reportDocument.id,

                ...reportDocument.data(),
              })
            )
          );

          setPayments(
            paymentsSnapshot.docs.map(
              (paymentDocument) => ({
                id:
                  paymentDocument.id,

                ...paymentDocument.data(),
              })
            )
          );

          setCertificates(
            certificatesSnapshot.docs.map(
              (
                certificateDocument
              ) => ({
                id:
                  certificateDocument.id,

                ...certificateDocument.data(),
              })
            )
          );
        } catch (loadError) {
          console.error(
            "Manage organizers loading error:",
            loadError
          );

          setError(
            loadError?.message ||
              "Unable to load organizers."
          );
        } finally {
          setLoading(false);
        }
      };

    loadData();
  }, [authReady, currentUser]);


  // ========================================================
  // HELPER FUNCTIONS
  // ========================================================

  const getOrganizerStatus = (
    organizer
  ) => {
    if (
      organizer.organizerStatus ===
        "blocked" ||
      organizer.accountStatus ===
        "blocked"
    ) {
      return "blocked";
    }

    if (
      organizer.organizerStatus ===
        "suspended" ||
      organizer.accountStatus ===
        "suspended"
    ) {
      return "suspended";
    }

    if (
      organizer.organizerApproved ===
        true ||
      organizer.organizerStatus ===
        "approved" ||
      organizer
        .organizerApplicationStatus ===
        "approved"
    ) {
      return "verified";
    }

    return "pending";
  };


  const formatCurrency = (
    value
  ) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;


  const getOrganizerMetrics = (
    organizer
  ) => {
    const organizerEvents =
      events.filter(
        (event) =>
          event.organizerId ===
          organizer.id
      );

    const organizerReports =
      reports.filter(
        (report) =>
          report.organizerId ===
            organizer.id ||
          organizerEvents.some(
            (event) =>
              event.id ===
              report.eventId
          )
      );

    const organizerPayments =
      payments.filter(
        (payment) =>
          payment.organizerId ===
            organizer.id ||
          organizerEvents.some(
            (event) =>
              event.id ===
              payment.eventId
          )
      );

    const organizerCertificates =
      certificates.filter(
        (certificate) =>
          certificate.organizerId ===
          organizer.id
      );

    const completedEvents =
      organizerEvents.filter(
        (event) =>
          event.status ===
          "completed"
      ).length;

    const cancelledEvents =
      organizerEvents.filter(
        (event) =>
          event.status ===
          "cancelled"
      ).length;

    const totalPayments =
      organizerPayments.reduce(
        (
          total,
          payment
        ) =>
          total +
          Number(
            payment.amount ||
              payment.paymentAmount ||
              0
          ),
        0
      );

    const openReports =
      organizerReports.filter(
        (report) =>
          report.status !==
            "resolved" &&
          report.status !==
            "closed"
      ).length;

    return {
      totalEvents:
        organizerEvents.length,

      completedEvents,

      cancelledEvents,

      certificatesIssued:
        organizerCertificates.length,

      totalPayments,

      openReports,
    };
  };


  // ========================================================
  // COUNTS
  // ========================================================

  const counts = useMemo(() => {
    return {
      total:
        organizers.length,

      verified:
        organizers.filter(
          (organizer) =>
            getOrganizerStatus(
              organizer
            ) === "verified"
        ).length,

      pending:
        organizers.filter(
          (organizer) =>
            getOrganizerStatus(
              organizer
            ) === "pending"
        ).length,

      blocked:
        organizers.filter(
          (organizer) =>
            getOrganizerStatus(
              organizer
            ) === "blocked"
        ).length,

      suspended:
        organizers.filter(
          (organizer) =>
            getOrganizerStatus(
              organizer
            ) === "suspended"
        ).length,
    };
  }, [organizers]);


  // ========================================================
  // FILTERED ORGANIZERS
  // ========================================================

  const filteredOrganizers =
    useMemo(() => {
      let filtered =
        organizers.map(
          (organizer) => ({
            ...organizer,
            metrics:
              getOrganizerMetrics(
                organizer
              ),
          })
        );

      const normalizedSearch =
        searchText
          .trim()
          .toLowerCase();

      if (normalizedSearch) {
        filtered =
          filtered.filter(
            (organizer) => {
              const searchable =
                [
                  organizer.name,
                  organizer.email,
                  organizer.organizationName,
                  organizer.city,
                  organizer.phone,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();

              return searchable.includes(
                normalizedSearch
              );
            }
          );
      }

      if (
        statusFilter !== "all"
      ) {
        filtered =
          filtered.filter(
            (organizer) =>
              getOrganizerStatus(
                organizer
              ) ===
              statusFilter
          );
      }

      filtered.sort(
        (
          firstOrganizer,
          secondOrganizer
        ) => {
          if (
            sortBy === "events"
          ) {
            return (
              secondOrganizer
                .metrics
                .totalEvents -
              firstOrganizer
                .metrics
                .totalEvents
            );
          }

          if (
            sortBy === "reports"
          ) {
            return (
              secondOrganizer
                .metrics
                .openReports -
              firstOrganizer
                .metrics
                .openReports
            );
          }

          if (
            sortBy === "status"
          ) {
            return getOrganizerStatus(
              firstOrganizer
            ).localeCompare(
              getOrganizerStatus(
                secondOrganizer
              )
            );
          }

          return String(
            firstOrganizer
              .organizationName ||
              firstOrganizer.name ||
              ""
          ).localeCompare(
            String(
              secondOrganizer
                .organizationName ||
                secondOrganizer.name ||
                ""
            )
          );
        }
      );

      return filtered;
    }, [
      organizers,
      events,
      reports,
      payments,
      certificates,
      searchText,
      statusFilter,
      sortBy,
    ]);


  // ========================================================
  // UPDATE ORGANIZER STATUS
  // ========================================================

  const updateOrganizerStatus =
    async (
      organizer,
      nextStatus
    ) => {
      try {
        setProcessingId(
          organizer.id
        );

        const updateData = {
          organizerStatus:
            nextStatus,

          accountStatus:
            nextStatus ===
              "verified"
              ? "active"
              : nextStatus,

          organizerApproved:
            nextStatus ===
              "verified",

          organizerApplicationStatus:
            nextStatus ===
              "verified"
              ? "approved"
              : nextStatus,

          organizerStatusUpdatedAt:
            serverTimestamp(),

          organizerStatusUpdatedBy:
            currentUser.uid,
        };

        await updateDoc(
          doc(
            db,
            "users",
            organizer.id
          ),
          updateData
        );

        setOrganizers(
          (
            currentOrganizers
          ) =>
            currentOrganizers.map(
              (
                currentOrganizer
              ) =>
                currentOrganizer.id ===
                organizer.id
                  ? {
                      ...currentOrganizer,
                      ...updateData,
                    }
                  : currentOrganizer
            )
        );

        alert(
          `Organizer status changed to ${nextStatus}.`
        );
      } catch (updateError) {
        console.error(
          "Organizer status update error:",
          updateError
        );

        alert(
          updateError?.message ||
            "Unable to update organizer status."
        );
      } finally {
        setProcessingId("");
      }
    };


  // ========================================================
  // DELETE ORGANIZER
  // ========================================================

  const deleteOrganizer =
    async (organizer) => {
      const confirmed =
        window.confirm(
          `Delete ${
            organizer.organizationName ||
            organizer.name ||
            "this organizer"
          } from the users collection?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setProcessingId(
          organizer.id
        );

        await deleteDoc(
          doc(
            db,
            "users",
            organizer.id
          )
        );

        setOrganizers(
          (
            currentOrganizers
          ) =>
            currentOrganizers.filter(
              (
                currentOrganizer
              ) =>
                currentOrganizer.id !==
                organizer.id
            )
        );

        alert(
          "Organizer deleted."
        );
      } catch (deleteError) {
        console.error(
          "Organizer delete error:",
          deleteError
        );

        alert(
          deleteError?.message ||
            "Unable to delete organizer."
        );
      } finally {
        setProcessingId("");
      }
    };


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
            🏢
          </div>

          <h2>
            Loading Organizers
          </h2>

          <p>
            Loading organizer profiles and performance data.
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
            Unable to Load Organizers
          </h2>

          <p>{error}</p>
        </div>
      </div>
    );
  }


  // ========================================================
  // PAGE UI
  // ========================================================

  return (
    <div className="page-container">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <section className="page-card organizer-hero">
        <BackButton />

        <div>
          <p className="dashboard-eyebrow">
            Admin Workspace
          </p>

          <h1 className="page-title">
            Manage Organizers
          </h1>

          <p className="page-subtitle">
            Verify organizers, review performance,
            suspend risky accounts, and manage access.
          </p>
        </div>

        <div className="organizer-status approved">
          🏢 {counts.total} Organizers
        </div>
      </section>


      {/* ====================================================
          STATISTICS
      ==================================================== */}

      <section className="dashboard-stats-grid">
        <MetricCard
          icon="🏢"
          label="Total"
          value={counts.total}
        />

        <MetricCard
          icon="✅"
          label="Verified"
          value={counts.verified}
        />

        <MetricCard
          icon="⏳"
          label="Pending"
          value={counts.pending}
        />

        <MetricCard
          icon="⛔"
          label="Blocked"
          value={counts.blocked}
        />

        <MetricCard
          icon="⚠️"
          label="Suspended"
          value={counts.suspended}
        />
      </section>


      {/* ====================================================
          FILTERS
      ==================================================== */}

      <section className="page-card">
        <div className="event-meta-grid">
          <div>
            <label className="input-label">
              Search
            </label>

            <input
              className="modern-input"
              type="text"
              placeholder="Name, email, organization, city..."
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
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
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Statuses
              </option>

              <option value="verified">
                Verified
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="suspended">
                Suspended
              </option>

              <option value="blocked">
                Blocked
              </option>
            </select>
          </div>

          <div>
            <label className="input-label">
              Sort By
            </label>

            <select
              className="modern-select"
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value
                )
              }
            >
              <option value="organization">
                Organization
              </option>

              <option value="events">
                Events Created
              </option>

              <option value="reports">
                Open Reports
              </option>

              <option value="status">
                Status
              </option>
            </select>
          </div>
        </div>

        <p className="page-subtitle">
          Showing {filteredOrganizers.length} of {organizers.length} organizers.
        </p>
      </section>


      {/* ====================================================
          EMPTY STATE
      ==================================================== */}

      {filteredOrganizers.length === 0 && (
        <div className="page-card empty-state">
          <div className="empty-icon">
            🔎
          </div>

          <h2>
            No Organizers Found
          </h2>

          <p>
            Change the filters or search text.
          </p>
        </div>
      )}


      {/* ====================================================
          ORGANIZER CARDS
      ==================================================== */}

      {filteredOrganizers.map(
        (organizer) => {
          const status =
            getOrganizerStatus(
              organizer
            );

          const metrics =
            organizer.metrics;

          const isProcessing =
            processingId ===
            organizer.id;

          return (
            <article
              key={organizer.id}
              className="event-card"
            >
              <div className="event-card-header">
                <div>
                  <p className="dashboard-eyebrow">
                    Organizer Account
                  </p>

                  <h2 className="event-title">
                    {organizer.organizationName ||
                      organizer.name ||
                      "Unnamed Organizer"}
                  </h2>

                  <p className="event-description">
                    {organizer.email ||
                      "Email not provided"}
                  </p>
                </div>

                <span
                  className={
                    status ===
                    "verified"
                      ? "status-active"
                      : status ===
                        "blocked"
                        ? "status-completed"
                        : "event-type-badge certificate"
                  }
                >
                  {status}
                </span>
              </div>


              <div className="event-meta-grid">
                <InfoItem
                  icon="👤"
                  label="Contact Name"
                  value={
                    organizer.name ||
                    "Not provided"
                  }
                />

                <InfoItem
                  icon="📞"
                  label="Phone"
                  value={
                    organizer.phone ||
                    "Not provided"
                  }
                />

                <InfoItem
                  icon="📍"
                  label="City"
                  value={
                    organizer.city ||
                    "Not provided"
                  }
                />

                <InfoItem
                  icon="🏷️"
                  label="Organization Type"
                  value={
                    organizer.organizationType ||
                    "Not provided"
                  }
                />

                <InfoItem
                  icon="📅"
                  label="Events Created"
                  value={
                    metrics.totalEvents
                  }
                />

                <InfoItem
                  icon="✅"
                  label="Completed Events"
                  value={
                    metrics.completedEvents
                  }
                />

                <InfoItem
                  icon="❌"
                  label="Cancelled Events"
                  value={
                    metrics.cancelledEvents
                  }
                />

                <InfoItem
                  icon="🏆"
                  label="Certificates"
                  value={
                    metrics.certificatesIssued
                  }
                />

                <InfoItem
                  icon="💰"
                  label="Payments"
                  value={
                    formatCurrency(
                      metrics.totalPayments
                    )
                  }
                />

                <InfoItem
                  icon="🚩"
                  label="Open Reports"
                  value={
                    metrics.openReports
                  }
                />
              </div>


              {organizer.proofLink && (
                <div className="event-card-section">
                  <h3>
                    Verification Proof
                  </h3>

                  <a
                    href={
                      organizer.proofLink
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="profile-link"
                  >
                    Open Uploaded Proof
                  </a>
                </div>
              )}


              <div className="event-action-buttons">
                <button
                  type="button"
                  className="secondary-action-button"
                  onClick={() =>
                    navigate(
                      `/user-details/${organizer.id}`
                    )
                  }
                >
                  👤 View Profile
                </button>

                <button
                  type="button"
                  className="secondary-action-button"
                  onClick={() =>
                    navigate(
                      `/reports?organizerId=${organizer.id}`
                    )
                  }
                >
                  🚩 View Reports
                </button>

                {status !==
                  "verified" && (
                  <button
                    type="button"
                    className="primary-action-button"
                    onClick={() =>
                      updateOrganizerStatus(
                        organizer,
                        "verified"
                      )
                    }
                    disabled={
                      isProcessing
                    }
                  >
                    ✅ Verify
                  </button>
                )}

                {status !==
                  "suspended" && (
                  <button
                    type="button"
                    className="secondary-action-button"
                    onClick={() =>
                      updateOrganizerStatus(
                        organizer,
                        "suspended"
                      )
                    }
                    disabled={
                      isProcessing
                    }
                  >
                    ⚠️ Suspend
                  </button>
                )}

                {status !==
                  "blocked" ? (
                  <button
                    type="button"
                    className="delete-action-button"
                    onClick={() =>
                      updateOrganizerStatus(
                        organizer,
                        "blocked"
                      )
                    }
                    disabled={
                      isProcessing
                    }
                  >
                    ⛔ Block
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary-action-button"
                    onClick={() =>
                      updateOrganizerStatus(
                        organizer,
                        "verified"
                      )
                    }
                    disabled={
                      isProcessing
                    }
                  >
                    🔓 Unblock
                  </button>
                )}

                <button
                  type="button"
                  className="delete-action-button"
                  onClick={() =>
                    deleteOrganizer(
                      organizer
                    )
                  }
                  disabled={
                    isProcessing
                  }
                >
                  🗑 Delete
                </button>
              </div>
            </article>
          );
        }
      )}
    </div>
  );
}


// ==========================================================
// REUSABLE COMPONENTS
// ==========================================================

function MetricCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        {icon}
      </div>

      <div>
        <p>{label}</p>
        <h2>{value}</h2>
      </div>
    </div>
  );
}


function InfoItem({
  icon,
  label,
  value,
}) {
  return (
    <div className="event-meta-item">
      <span className="event-meta-icon">
        {icon}
      </span>

      <div>
        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  );
}

export default ManageOrganizers;