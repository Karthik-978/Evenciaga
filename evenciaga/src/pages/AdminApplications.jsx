import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../firebase";
import BackButton from "../components/BackButton";

function AdminApplications() {
  const [applications, setApplications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState("");

  const [search, setSearch] =
    useState("");

  const refreshApplications =
    async () => {
      try {
        setLoading(true);

        const querySnapshot =
          await getDocs(
            collection(
              db,
              "organizerApplications"
            )
          );

        const data =
          querySnapshot.docs.map(
            (document) => ({
              id: document.id,
              ...document.data(),
            })
          );

        data.sort(
          (
            firstApplication,
            secondApplication
          ) => {
            const firstTime =
              firstApplication
                .submittedAt
                ?.toMillis?.() || 0;

            const secondTime =
              secondApplication
                .submittedAt
                ?.toMillis?.() || 0;

            return (
              secondTime -
              firstTime
            );
          }
        );

        setApplications(data);
      } catch (error) {
        console.error(
          "Load organizer applications error:",
          error
        );

        alert(
          "Unable to load organizer applications."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    refreshApplications();
  }, []);

  const approveApplication =
    async (application) => {
      const confirmed =
        window.confirm(
          `Approve "${application.organizationName}" as an organizer?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setProcessingId(
          application.id
        );

        await updateDoc(
          doc(
            db,
            "organizerApplications",
            application.id
          ),
          {
            status:
              "approved",
          }
        );

        await updateDoc(
          doc(
            db,
            "users",
            application.uid
          ),
          {
            role:
              "organizer",

            organizerStatus:
              "approved",

            organizerApproved:
              true,
          }
        );

        await refreshApplications();

        alert(
          "Application approved successfully."
        );
      } catch (error) {
        console.error(
          "Approve organizer application error:",
          error
        );

        alert(
          "Approval failed."
        );
      } finally {
        setProcessingId("");
      }
    };

  const rejectApplication =
    async (application) => {
      const confirmed =
        window.confirm(
          `Reject "${application.organizationName}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setProcessingId(
          application.id
        );

        await updateDoc(
          doc(
            db,
            "organizerApplications",
            application.id
          ),
          {
            status:
              "rejected",
          }
        );

        await updateDoc(
          doc(
            db,
            "users",
            application.uid
          ),
          {
            organizerStatus:
              "rejected",

            organizerApproved:
              false,
          }
        );

        await refreshApplications();

        alert(
          "Application rejected."
        );
      } catch (error) {
        console.error(
          "Reject organizer application error:",
          error
        );

        alert(
          "Rejection failed."
        );
      } finally {
        setProcessingId("");
      }
    };

  const filteredApplications =
    search.trim() === ""
      ? applications
      : applications.filter(
          (application) => {
            const query =
              search
                .trim()
                .toLowerCase();

            return (
              application
                .organizationName
                ?.toLowerCase()
                .includes(query) ||
              application
                .email
                ?.toLowerCase()
                .includes(query) ||
              application
                .city
                ?.toLowerCase()
                .includes(query) ||
              application
                .organizationType
                ?.toLowerCase()
                .includes(query)
            );
          }
        );

  const pendingCount =
    applications.filter(
      (application) =>
        application.status ===
        "pending"
    ).length;

  const approvedCount =
    applications.filter(
      (application) =>
        application.status ===
        "approved"
    ).length;

  const rejectedCount =
    applications.filter(
      (application) =>
        application.status ===
        "rejected"
    ).length;

  const formatDate =
    (value) => {
      if (!value) {
        return "Not available";
      }

      if (value?.toDate) {
        return value
          .toDate()
          .toLocaleString();
      }

      const parsedDate =
        new Date(value);

      return Number.isNaN(
        parsedDate.getTime()
      )
        ? "Not available"
        : parsedDate
            .toLocaleString();
    };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">

          <div className="empty-icon">
            📝
          </div>

          <h2>
            Loading Applications
          </h2>

          <p>
            Fetching organizer applications
            from Firestore.
          </p>

        </div>
      </div>
    );
  }

  return (
    <div className="page-container">

      {/* ===============================
          HEADER
      =============================== */}

      <section className="page-card organizer-hero">

        <div>
          <BackButton />

          <p className="dashboard-eyebrow">
            Admin Panel
          </p>

          <h1 className="page-title">
            📝 Organizer Applications
          </h1>

          <p className="page-subtitle">
            Review organizations requesting
            organizer access and approve or
            reject their applications.
          </p>
        </div>

        <div className="organizer-status approved">
          {pendingCount} Pending
        </div>

      </section>

      {/* ===============================
          STATISTICS
      =============================== */}

      <section className="dashboard-stats-grid">

        <div className="stat-card">

          <div className="stat-icon">
            📄
          </div>

          <div>
            <p>
              Total Applications
            </p>

            <h2>
              {applications.length}
            </h2>
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon">
            ⏳
          </div>

          <div>
            <p>
              Pending
            </p>

            <h2>
              {pendingCount}
            </h2>
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon">
            ✅
          </div>

          <div>
            <p>
              Approved
            </p>

            <h2>
              {approvedCount}
            </h2>
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon">
            ❌
          </div>

          <div>
            <p>
              Rejected
            </p>

            <h2>
              {rejectedCount}
            </h2>
          </div>

        </div>

      </section>

      {/* ===============================
          APPLICATION DIRECTORY
      =============================== */}

      <section className="page-card">

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: "16px",
            flexWrap:
              "wrap",
            marginBottom:
              "22px",
          }}
        >

          <div>
            <p className="dashboard-eyebrow">
              Verification Queue
            </p>

            <h2
              className="page-title"
              style={{
                fontSize:
                  "24px",
                marginBottom:
                  "4px",
              }}
            >
              Applications
            </h2>

            <p className="page-subtitle">
              {
                filteredApplications.length
              }{" "}
              application
              {
                filteredApplications.length ===
                1
                  ? ""
                  : "s"
              }{" "}
              found
            </p>
          </div>

          <div
            style={{
              minWidth:
                "280px",
              flex:
                "0 1 380px",
            }}
          >
            <input
              type="text"
              placeholder="🔎 Search organization, email, city..."
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              style={{
                width: "100%",
                padding:
                  "13px 15px",
                borderRadius:
                  "10px",
                border:
                  "1px solid #d1d5db",
                outline: "none",
                fontSize:
                  "14px",
                background:
                  "#ffffff",
              }}
            />
          </div>

        </div>

        {filteredApplications.length ===
        0 ? (

          <div className="empty-state">

            <div className="empty-icon">
              📝
            </div>

            <h2>
              No Applications Found
            </h2>

            <p>
              No organizer applications
              match your current search.
            </p>

          </div>

        ) : (

          <div
            style={{
              display: "grid",
              gap: "18px",
            }}
          >

            {filteredApplications.map(
              (application) => {

                const status =
                  application.status ||
                  "pending";

                const isProcessing =
                  processingId ===
                  application.id;

                return (
                  <article
                    key={
                      application.id
                    }
                    className="event-card"
                  >

                    {/* HEADER */}

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap:
                          "16px",
                        flexWrap:
                          "wrap",
                      }}
                    >

                      <div
                        style={{
                          display:
                            "flex",
                          gap:
                            "14px",
                          alignItems:
                            "center",
                        }}
                      >

                        <div
                          style={{
                            width:
                              "54px",
                            height:
                              "54px",
                            borderRadius:
                              "14px",
                            background:
                              "#eff6ff",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            fontSize:
                              "24px",
                          }}
                        >
                          🏢
                        </div>

                        <div>

                          <p className="dashboard-eyebrow">
                            Organization
                          </p>

                          <h2 className="event-title">
                            {
                              application.organizationName ||
                              "Unnamed Organization"
                            }
                          </h2>

                          <p
                            className="event-description"
                            style={{
                              margin:
                                0,
                            }}
                          >
                            {
                              application.email ||
                              "Email not provided"
                            }
                          </p>

                        </div>

                      </div>

                      <span
                        className={
                          status ===
                          "approved"
                            ? "status-active"
                            : status ===
                                "rejected"
                              ? "status-completed"
                              : "event-type-badge certificate"
                        }
                      >
                        {status ===
                        "approved"
                          ? "✅ Approved"
                          : status ===
                              "rejected"
                            ? "❌ Rejected"
                            : "⏳ Pending"}
                      </span>

                    </div>

                    {/* INFORMATION */}

                    <div
                      className="event-meta-grid"
                      style={{
                        marginTop:
                          "20px",
                      }}
                    >

                      <div className="event-meta-item">

                        <span className="event-meta-icon">
                          🏷️
                        </span>

                        <div>
                          <small>
                            Organization Type
                          </small>

                          <strong>
                            {
                              application.organizationType ||
                              "Not provided"
                            }
                          </strong>
                        </div>

                      </div>

                      <div className="event-meta-item">

                        <span className="event-meta-icon">
                          📍
                        </span>

                        <div>
                          <small>
                            City
                          </small>

                          <strong>
                            {
                              application.city ||
                              "Not provided"
                            }
                          </strong>
                        </div>

                      </div>

                      <div className="event-meta-item">

                        <span className="event-meta-icon">
                          👤
                        </span>

                        <div>
                          <small>
                            Applicant
                          </small>

                          <strong>
                            {
                              application.fullName ||
                              "Not provided"
                            }
                          </strong>
                        </div>

                      </div>

                      <div className="event-meta-item">

                        <span className="event-meta-icon">
                          🕒
                        </span>

                        <div>
                          <small>
                            Submitted
                          </small>

                          <strong>
                            {
                              formatDate(
                                application.submittedAt
                              )
                            }
                          </strong>
                        </div>

                      </div>

                    </div>

                    {/* PURPOSE */}

                    <div
                      style={{
                        marginTop:
                          "18px",
                        padding:
                          "16px",
                        borderRadius:
                          "10px",
                        background:
                          "#f8fafc",
                      }}
                    >

                      <small
                        style={{
                          color:
                            "#64748b",
                          fontWeight:
                            "700",
                        }}
                      >
                        PURPOSE
                      </small>

                      <p
                        style={{
                          margin:
                            "8px 0 0",
                          color:
                            "#334155",
                          lineHeight:
                            "1.6",
                        }}
                      >
                        {
                          application.purpose ||
                          "Purpose not provided."
                        }
                      </p>

                    </div>

                    {/* PROOF */}

                    <div
                      style={{
                        marginTop:
                          "14px",
                      }}
                    >

                      <small
                        style={{
                          color:
                            "#64748b",
                          fontWeight:
                            "700",
                        }}
                      >
                        VERIFICATION PROOF
                      </small>

                      {application.proofLink ? (
                        <div
                          style={{
                            marginTop:
                              "8px",
                          }}
                        >

                          <a
                            href={
                              application.proofLink
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="secondary-action-button"
                            style={{
                              display:
                                "inline-block",
                              textDecoration:
                                "none",
                            }}
                          >
                            🔗 Open Proof Link
                          </a>

                        </div>
                      ) : (
                        <p
                          style={{
                            margin:
                              "6px 0 0",
                            color:
                              "#94a3b8",
                          }}
                        >
                          No proof link
                          provided.
                        </p>
                      )}

                    </div>

                    {/* ACTIONS */}

                    {status ===
                      "pending" && (

                      <div
                        className="event-action-buttons"
                        style={{
                          marginTop:
                            "22px",
                        }}
                      >

                        <button
                          type="button"
                          className="primary-action-button"
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            approveApplication(
                              application
                            )
                          }
                        >
                          {isProcessing
                            ? "Processing..."
                            : "✅ Approve Organizer"}
                        </button>

                        <button
                          type="button"
                          className="delete-action-button"
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            rejectApplication(
                              application
                            )
                          }
                        >
                          {isProcessing
                            ? "Processing..."
                            : "❌ Reject Application"}
                        </button>

                      </div>

                    )}

                  </article>
                );
              }
            )}

          </div>
        )}

      </section>

    </div>
  );
}

export default AdminApplications;