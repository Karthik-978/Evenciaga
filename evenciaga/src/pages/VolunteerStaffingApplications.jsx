import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

function VolunteerStaffingApplications() {
  const [applications, setApplications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const loadApplications = async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user) return;

      const q = query(
        collection(
          db,
          "staffingApplications"
        ),
        where(
          "volunteerId",
          "==",
          user.uid
        )
      );

      const snapshot =
        await getDocs(q);

      const data =
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

      data.sort((a, b) => {
        const aTime =
          a.appliedAt?.seconds || 0;

        const bTime =
          b.appliedAt?.seconds || 0;

        return bTime - aTime;
      });

      setApplications(data);
    } catch (error) {
      console.error(
        "Load applications:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const getStatusLabel = (
    application
  ) => {
    if (
      application.selectionStatus ===
      "primary"
    ) {
      return "Primary Selected";
    }

    if (
      application.selectionStatus ===
      "standby"
    ) {
      return "Standby";
    }

    if (
      application.selectionStatus ===
      "rejected"
    ) {
      return "Not Selected";
    }

    return "Under Review";
  };

  const getStatusClass = (
    application
  ) => {
    if (
      application.selectionStatus ===
      "primary"
    ) {
      return "approved";
    }

    if (
      application.selectionStatus ===
      "standby"
    ) {
      return "organizer_review";
    }

    if (
      application.selectionStatus ===
      "rejected"
    ) {
      return "rejected";
    }

    return "pending";
  };

  return (
    <div className="page-container">
      <section className="page-card">
        <BackButton />

        <span className="dashboard-eyebrow">
          Volunteer
        </span>

        <h1 className="page-title">
          My Staffing Applications
        </h1>

        <p className="page-subtitle">
          Track the events and positions you
          have applied for.
        </p>
      </section>

      <section className="page-card">
        {loading ? (
          <div className="empty-staffing-state">
            Loading applications...
          </div>
        ) : applications.length ===
          0 ? (
          <div className="empty-staffing-state">
            <div className="large-panel-icon">
              📋
            </div>

            <h2>
              No applications yet
            </h2>

            <p>
              When you apply for an approved
              staffing position, it will appear
              here.
            </p>
          </div>
        ) : (
          <div className="staffing-request-cards">
            {applications.map(
              (application) => (
                <div
                  key={application.id}
                  className="staffing-request-card"
                >
                  <div className="request-card-top">
                    <span
                      className={`request-status ${getStatusClass(
                        application
                      )}`}
                    >
                      {getStatusLabel(
                        application
                      )}
                    </span>

                    <span>
                      {application.eventDate}
                    </span>
                  </div>

                  <h3>
                    {application.eventTitle}
                  </h3>

                  <p>
                    📍{" "}
                    {application.eventLocation ||
                      "Location not specified"}
                  </p>

                  <div className="request-card-meta">
                    <span>
                      🎯{" "}
                      {application.requestedRole}
                    </span>

                    <span>
                      ⭐{" "}
                      {application.volunteerRating ||
                        0}
                    </span>

                    <span>
                      📊{" "}
                      {application.volunteerAttendance ||
                        0}
                      %
                    </span>
                  </div>

                  {application.selectionStatus ===
                    "primary" && (
                    <div className="review-warning">
                      <span>🎉</span>

                      <p>
                        You have been selected as a
                        <strong>
                          {" "}
                          primary volunteer
                        </strong>
                        .
                      </p>
                    </div>
                  )}

                  {application.selectionStatus ===
                    "standby" && (
                    <div className="review-warning">
                      <span>⏳</span>

                      <p>
                        You are currently on the
                        <strong>
                          {" "}
                          standby team
                        </strong>
                        .
                      </p>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default VolunteerStaffingApplications;