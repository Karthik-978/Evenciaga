import { useEffect, useState } from "react";

import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  addDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import BackButton from "../components/BackButton";

function AdminStaffingRequests() {
  const [requests, setRequests] =
    useState([]);

  const [selectedRequest, setSelectedRequest] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [roles, setRoles] =
    useState([
      {
        role: "",
        count: 1,
      },
    ]);

  const [standbyCount, setStandbyCount] =
    useState(0);

  const loadRequests = async () => {
    try {
      setLoading(true);

      const q = query(
        collection(
          db,
          "staffingRequests"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

      const snapshot =
        await getDocs(q);

      const data =
        snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      setRequests(data);
    } catch (error) {
      console.error(
        "Load staffing requests:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const openRequest = (
    request
  ) => {
    setSelectedRequest(request);

    setRoles(
      request.proposedRoles?.length
        ? request.proposedRoles
        : [
            {
              role: "",
              count: 1,
            },
          ]
    );

    setStandbyCount(
      Number(
        request.proposedStandby || 0
      )
    );
  };

  const updateRole = (
    index,
    field,
    value
  ) => {
    setRoles(
      (current) =>
        current.map(
          (item, i) =>
            i === index
              ? {
                  ...item,
                  [field]:
                    field ===
                    "count"
                      ? Number(
                          value
                        )
                      : value,
                }
              : item
        )
    );
  };

  const addRole = () => {
    setRoles(
      (current) => [
        ...current,
        {
          role: "",
          count: 1,
        },
      ]
    );
  };

  const removeRole = (
    index
  ) => {
    setRoles(
      (current) =>
        current.filter(
          (_, i) =>
            i !== index
        )
    );
  };

  const createPlan = async () => {
    if (!selectedRequest) {
      return;
    }

    const validRoles =
      roles.filter(
        (item) =>
          item.role.trim() &&
          Number(item.count) > 0
      );

    if (!validRoles.length) {
      alert(
        "Add at least one valid role."
      );
      return;
    }

    if (
      Number(standbyCount) < 0
    ) {
      alert(
        "Standby count cannot be negative."
      );
      return;
    }

    try {
      setSaving(true);

      const totalPrimary =
        validRoles.reduce(
          (sum, item) =>
            sum +
            Number(
              item.count
            ),
          0
        );

      const totalWorkforce =
        totalPrimary +
        Number(
          standbyCount
        );

      /*
       * Save the staffing plan.
       */
      await updateDoc(
        doc(
          db,
          "staffingRequests",
          selectedRequest.id
        ),
        {
          status:
            "organizer_review",

          proposedRoles:
            validRoles,

          proposedStandby:
            Number(
              standbyCount
            ),

          totalVolunteers:
            totalWorkforce,

          primaryVolunteers:
            totalPrimary,

          planCreatedAt:
            serverTimestamp(),
        }
      );

      /*
       * Event remains unpublished.
       */
      await updateDoc(
        doc(
          db,
          "events",
          selectedRequest.eventId
        ),
        {
          staffingStatus:
            "organizer_review",

          status:
            "staffing_pending",

          proposedStaffingPlan:
            validRoles,

          proposedStandby:
            Number(
              standbyCount
            ),

          proposedTotalVolunteers:
            totalWorkforce,
        }
      );

      /*
       * Notify organizer.
       */
      await addDoc(
        collection(
          db,
          "notifications"
        ),
        {
          recipientId:
            selectedRequest.organizerId,

          eventId:
            selectedRequest.eventId,

          staffingRequestId:
            selectedRequest.id,

          type:
            "staffing_plan_ready",

          title:
            "Staffing Plan Ready",

          message:
            `Your staffing plan for ${selectedRequest.eventTitle} is ready for review.`,

          isRead: false,

          createdAt:
            serverTimestamp(),
        }
      );

      alert(
        "Staffing plan sent to organizer."
      );

      setSelectedRequest(
        null
      );

      await loadRequests();
    } catch (error) {
      console.error(
        "Create staffing plan:",
        error
      );

      alert(
        error?.message ||
          "Failed to create staffing plan."
      );
    } finally {
      setSaving(false);
    }
  };

  const totalPrimary =
    roles.reduce(
      (sum, item) =>
        sum +
        Number(
          item.count || 0
        ),
      0
    );

  const pendingCount =
    requests.filter(
      (item) =>
        item.status ===
        "pending"
    ).length;

  const reviewCount =
    requests.filter(
      (item) =>
        item.status ===
        "organizer_review"
    ).length;

  return (
    <div className="page-container staffing-admin-page">

      <section className="page-card admin-staffing-hero">

        <BackButton />

        <div className="admin-staffing-title">

          <span className="dashboard-eyebrow">
            Administration
          </span>

          <h1>
            Staffing Requests
          </h1>

          <p>
            Build volunteer workforce plans
            for organizer events.
          </p>

        </div>

        <div className="staffing-summary">

          <div className="summary-card">
            <span>
              Pending
            </span>

            <strong>
              {pendingCount}
            </strong>
          </div>

          <div className="summary-card">
            <span>
              Awaiting Review
            </span>

            <strong>
              {reviewCount}
            </strong>
          </div>

          <div className="summary-card">
            <span>
              Total Requests
            </span>

            <strong>
              {requests.length}
            </strong>
          </div>

        </div>

      </section>

      <div className="staffing-admin-layout">

        <section className="page-card staffing-request-list">

          <div className="panel-header">

            <div>
              <h2>
                Requests
              </h2>

              <p>
                New staffing assistance requests
                appear here.
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={loadRequests}
            >
              ↻ Refresh
            </button>

          </div>

          {loading ? (
            <div className="empty-staffing-state">
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="empty-staffing-state">

              <div>
                ✦
              </div>

              <h3>
                No staffing requests
              </h3>

              <p>
                New organizer requests will
                appear here.
              </p>

            </div>
          ) : (
            <div className="staffing-request-cards">

              {requests.map(
                (request) => (
                  <button
                    type="button"
                    key={request.id}
                    className={`staffing-request-card ${
                      selectedRequest?.id ===
                      request.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      openRequest(
                        request
                      )
                    }
                  >

                    <div className="request-card-top">

                      <span
                        className={`request-status ${request.status}`}
                      >
                        {request.status ===
                        "pending"
                          ? "Needs Plan"
                          : request.status ===
                            "organizer_review"
                          ? "Organizer Review"
                          : request.status}
                      </span>

                      <span>
                        {request.eventDate}
                      </span>

                    </div>

                    <h3>
                      {request.eventTitle}
                    </h3>

                    <p>
                      📍{" "}
                      {request.eventLocation}
                    </p>

                    <div className="request-card-meta">

                      <span>
                        👥{" "}
                        {request.expectedCrowd ||
                          "Unknown"}{" "}
                        expected
                      </span>

                      <span>
                        ⏱️{" "}
                        {request.eventHours ||
                          0}{" "}
                        hrs
                      </span>

                    </div>

                  </button>
                )
              )}

            </div>
          )}

        </section>

        <section className="page-card staffing-plan-panel">

          {!selectedRequest ? (
            <div className="select-request-state">

              <div className="large-panel-icon">
                ✦
              </div>

              <h2>
                Select a request
              </h2>

              <p>
                Choose a staffing request
                to create its workforce plan.
              </p>

            </div>
          ) : (
            <>

              <div className="plan-header">

                <div>

                  <span className="dashboard-eyebrow">
                    Staffing Plan
                  </span>

                  <h2>
                    {selectedRequest.eventTitle}
                  </h2>

                  <p>
                    📍{" "}
                    {selectedRequest.eventLocation}
                  </p>

                  {selectedRequest.googleMapsUrl && (
                    <a
                      href={
                        selectedRequest.googleMapsUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      🗺 Open Location in Google Maps
                    </a>
                  )}

                </div>

                <button
                  type="button"
                  className="icon-close-button"
                  onClick={() =>
                    setSelectedRequest(
                      null
                    )
                  }
                >
                  ×
                </button>

              </div>

              <div className="event-context-grid">

                <div>
                  <span>
                    Expected Crowd
                  </span>

                  <strong>
                    {selectedRequest.expectedCrowd ||
                      "Not specified"}
                  </strong>
                </div>

                <div>
                  <span>
                    Duration
                  </span>

                  <strong>
                    {selectedRequest.eventHours ||
                      0}{" "}
                    hrs
                  </strong>
                </div>

                <div>
                  <span>
                    Category
                  </span>

                  <strong>
                    {selectedRequest.eventCategory ||
                      "Not specified"}
                  </strong>
                </div>

              </div>

              {selectedRequest.notes && (
                <div className="request-notes">

                  <span>
                    Organizer Notes
                  </span>

                  <p>
                    {selectedRequest.notes}
                  </p>

                </div>
              )}

              <div className="plan-section-title">

                <div>

                  <h3>
                    Workforce Requirements
                  </h3>

                  <p>
                    Define the primary
                    volunteer workforce by role.
                  </p>

                </div>

                <div className="live-total">

                  <strong>
                    {totalPrimary}
                  </strong>

                  <span>
                    Primary
                  </span>

                </div>

              </div>

              <div className="role-builder">

                {roles.map(
                  (item, index) => (
                    <div
                      className="role-builder-row"
                      key={index}
                    >

                      <input
                        className="modern-input"
                        value={
                          item.role
                        }
                        onChange={(e) =>
                          updateRole(
                            index,
                            "role",
                            e.target.value
                          )
                        }
                        placeholder="Role name"
                      />

                      <input
                        className="modern-input role-count-input"
                        type="number"
                        min="1"
                        value={
                          item.count
                        }
                        onChange={(e) =>
                          updateRole(
                            index,
                            "count",
                            e.target.value
                          )
                        }
                      />

                      <button
                        type="button"
                        className="remove-role-button"
                        onClick={() =>
                          removeRole(
                            index
                          )
                        }
                      >
                        ×
                      </button>

                    </div>
                  )
                )}

                <button
                  type="button"
                  className="add-role-button"
                  onClick={addRole}
                >
                  + Add Role
                </button>

              </div>

              <div className="standby-builder">

                <div>

                  <h3>
                    Standby Workforce
                  </h3>

                  <p>
                    Backup volunteers available
                    for replacements.
                  </p>

                </div>

                <input
                  className="modern-input"
                  type="number"
                  min="0"
                  value={
                    standbyCount
                  }
                  onChange={(e) =>
                    setStandbyCount(
                      Number(
                        e.target.value
                      )
                    )
                  }
                />

              </div>

              <div className="plan-total-card">

                <div>
                  <span>
                    Total Workforce
                  </span>

                  <strong>
                    {totalPrimary +
                      Number(
                        standbyCount
                      )}
                  </strong>
                </div>

                <div>
                  <span>
                    Primary
                  </span>

                  <strong>
                    {totalPrimary}
                  </strong>
                </div>

                <div>
                  <span>
                    Standby
                  </span>

                  <strong>
                    {standbyCount}
                  </strong>
                </div>

              </div>

              <button
                type="button"
                className="primary-button plan-submit-button"
                disabled={
                  saving ||
                  selectedRequest.status !==
                    "pending"
                }
                onClick={
                  createPlan
                }
              >
                {saving
                  ? "Submitting..."
                  : selectedRequest.status ===
                    "pending"
                  ? "✓ Send Plan to Organizer"
                  : "Plan Already Sent"}
              </button>

            </>
          )}

        </section>

      </div>

    </div>
  );
}

export default AdminStaffingRequests; 