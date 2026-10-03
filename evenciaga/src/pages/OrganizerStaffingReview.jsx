import { useEffect, useState } from "react";

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

function OrganizerStaffingReview() {
  const [requests, setRequests] =
    useState([]);

  const [selected, setSelected] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const loadPlans = async () => {
    try {
      setLoading(true);

      const user =
        auth.currentUser;

      if (!user) {
        setRequests([]);
        return;
      }

      const q = query(
        collection(
          db,
          "staffingRequests"
        ),
        where(
          "organizerId",
          "==",
          user.uid
        )
      );

      const snapshot =
        await getDocs(q);

      const data =
        snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter(
            (item) =>
              item.status ===
              "organizer_review"
          );

      setRequests(data);

      if (
        data.length > 0 &&
        !selected
      ) {
        setSelected(data[0]);
      }

      if (
        selected &&
        !data.some(
          (item) =>
            item.id ===
            selected.id
        )
      ) {
        setSelected(
          data[0] || null
        );
      }
    } catch (error) {
      console.error(
        "Load staffing plans:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const approvePlan =
    async () => {
      if (!selected) {
        return;
      }

      const primary =
        Number(
          selected.totalVolunteers ||
            0
        ) -
        Number(
          selected.proposedStandby ||
            0
        );

      const standby =
        Number(
          selected.proposedStandby ||
            0
        );

      if (primary <= 0) {
        alert(
          "This staffing plan does not contain any primary volunteers."
        );
        return;
      }

      try {
        setProcessing(true);

        /*
         * Mark staffing request approved.
         */
        await updateDoc(
          doc(
            db,
            "staffingRequests",
            selected.id
          ),
          {
            status:
              "approved",

            organizerDecision:
              "approved",

            organizerDecisionAt:
              serverTimestamp(),
          }
        );

        /*
         * Publish the event.
         */
        await updateDoc(
          doc(
            db,
            "events",
            selected.eventId
          ),
          {
            staffingStatus:
              "approved",

            staffingPlan:
              selected.proposedRoles ||
              [],

            requiredVolunteers:
              primary,

            primaryLimit:
              primary,

            standbyLimit:
              standby,

            staffingApprovedAt:
              serverTimestamp(),

            /*
             * THIS is the point where the
             * event becomes visible to volunteers.
             */
            status:
              "active",

            publishedAt:
              serverTimestamp(),
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
              selected.organizerId,

            eventId:
              selected.eventId,

            staffingRequestId:
              selected.id,

            type:
              "staffing_plan_approved",

            title:
              "Event Published",

            message:
              `${selected.eventTitle} staffing plan was approved and the event is now published.`,

            isRead: false,

            createdAt:
              serverTimestamp(),
          }
        );

        /*
         * Notify administration.
         */
        await addDoc(
          collection(
            db,
            "adminNotifications"
          ),
          {
            type:
              "staffing_plan_approved",

            title:
              "Staffing Plan Approved",

            message:
              `${selected.eventTitle} staffing plan was approved by the organizer.`,

            eventId:
              selected.eventId,

            organizerId:
              selected.organizerId,

            isRead: false,

            createdAt:
              serverTimestamp(),
          }
        );

        alert(
          "Staffing plan approved. The event is now published."
        );

        setSelected(null);

        await loadPlans();
      } catch (error) {
        console.error(
          "Approve staffing plan:",
          error
        );

        alert(
          error?.message ||
            "Failed to approve staffing plan."
        );
      } finally {
        setProcessing(false);
      }
    };

  const requestChanges =
    async () => {
      if (!selected) {
        return;
      }

      const reason =
        window.prompt(
          "Why do you want to request changes?"
        );

      if (!reason?.trim()) {
        return;
      }

      try {
        setProcessing(true);

        await updateDoc(
          doc(
            db,
            "staffingRequests",
            selected.id
          ),
          {
            status:
              "changes_requested",

            organizerDecision:
              "changes_requested",

            organizerFeedback:
              reason.trim(),

            organizerDecisionAt:
              serverTimestamp(),
          }
        );

        await updateDoc(
          doc(
            db,
            "events",
            selected.eventId
          ),
          {
            staffingStatus:
              "changes_requested",

            status:
              "staffing_pending",
          }
        );

        /*
         * Notify administration.
         */
        await addDoc(
          collection(
            db,
            "adminNotifications"
          ),
          {
            type:
              "staffing_changes_requested",

            title:
              "Staffing Plan Changes Requested",

            message:
              `${selected.eventTitle} needs changes to its staffing plan.`,

            eventId:
              selected.eventId,

            organizerId:
              selected.organizerId,

            feedback:
              reason.trim(),

            isRead: false,

            createdAt:
              serverTimestamp(),
          }
        );

        alert(
          "Changes requested. Administration has been notified."
        );

        setSelected(null);

        await loadPlans();
      } catch (error) {
        console.error(
          "Request staffing changes:",
          error
        );

        alert(
          error?.message ||
            "Failed to request changes."
        );
      } finally {
        setProcessing(false);
      }
    };

  if (loading) {
    return (
      <div className="page-container">

        <div className="page-card loading-page">
          Loading staffing plans...
        </div>

      </div>
    );
  }

  return (
    <div className="page-container organizer-review-page">

      <section className="page-card review-hero">

        <BackButton />

        <div>

          <span className="dashboard-eyebrow">
            Organizer Panel
          </span>

          <h1>
            Staffing Plans
          </h1>

          <p>
            Review the workforce plan prepared
            by Evenciaga Administration.
          </p>

        </div>

        <div className="review-count">

          <strong>
            {requests.length}
          </strong>

          <span>
            Awaiting review
          </span>

        </div>

      </section>

      {requests.length === 0 ? (

        <section className="page-card empty-review-state">

          <div className="large-panel-icon">
            ✓
          </div>

          <h2>
            No staffing plans waiting
          </h2>

          <p>
            When administration prepares a
            staffing plan for one of your events,
            it will appear here.
          </p>

        </section>

      ) : (

        <div className="review-layout">

          <section className="page-card review-event-list">

            <h2>
              Your Events
            </h2>

            {requests.map(
              (request) => (

                <button
                  type="button"
                  key={request.id}
                  className={`review-event-card ${
                    selected?.id ===
                    request.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setSelected(
                      request
                    )
                  }
                >

                  <span className="review-event-status">
                    Review Required
                  </span>

                  <strong>
                    {request.eventTitle}
                  </strong>

                  <span>
                    {request.eventDate}
                  </span>

                  <span>
                    {request.totalVolunteers}{" "}
                    volunteers
                  </span>

                </button>

              )
            )}

          </section>

          {selected && (

            <section className="page-card organizer-plan-review">

              <div className="organizer-plan-header">

                <div>

                  <span className="dashboard-eyebrow">
                    Proposed Workforce
                  </span>

                  <h2>
                    {selected.eventTitle}
                  </h2>

                  <p>
                    📍{" "}
                    {selected.eventLocation}
                  </p>

                  {selected.googleMapsUrl && (
                    <a
                      href={
                        selected.googleMapsUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      🗺 View Venue in Google Maps
                    </a>
                  )}

                </div>

                <span className="review-pill">
                  Awaiting Approval
                </span>

              </div>

              <div className="workforce-overview">

                <div>

                  <strong>
                    {selected.totalVolunteers}
                  </strong>

                  <span>
                    Total Volunteers
                  </span>

                </div>

                <div>

                  <strong>
                    {
                      Number(
                        selected.totalVolunteers ||
                          0
                      ) -
                      Number(
                        selected.proposedStandby ||
                          0
                      )
                    }
                  </strong>

                  <span>
                    Primary
                  </span>

                </div>

                <div>

                  <strong>
                    {selected.proposedStandby ||
                      0}
                  </strong>

                  <span>
                    Standby
                  </span>

                </div>

              </div>

              <div className="proposed-role-list">

                <div className="proposed-role-heading">

                  <h3>
                    Staffing Breakdown
                  </h3>

                  <span>
                    Administration Proposal
                  </span>

                </div>

                {selected.proposedRoles?.map(
                  (role, index) => (

                    <div
                      className="proposed-role-row"
                      key={index}
                    >

                      <div className="role-index">
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      <strong>
                        {role.role}
                      </strong>

                      <span>
                        {role.count}{" "}
                        volunteers
                      </span>

                    </div>

                  )
                )}

                <div className="proposed-role-row standby-row">

                  <div className="role-index">
                    ST
                  </div>

                  <strong>
                    Standby Team
                  </strong>

                  <span>
                    {selected.proposedStandby ||
                      0}{" "}
                    volunteers
                  </span>

                </div>

              </div>

              <div className="review-warning">

                <span>
                  ⓘ
                </span>

                <p>
                  Once approved, this staffing
                  plan will determine the
                  volunteer positions available
                  for this event. The event will
                  then become visible to volunteers.
                </p>

              </div>

              <div className="review-actions">

                <button
                  type="button"
                  className="reject-plan-button"
                  disabled={
                    processing
                  }
                  onClick={
                    requestChanges
                  }
                >
                  Request Changes
                </button>

                <button
                  type="button"
                  className="approve-plan-button"
                  disabled={
                    processing
                  }
                  onClick={
                    approvePlan
                  }
                >
                  {processing
                    ? "Processing..."
                    : "✓ Approve & Publish Event"}
                </button>

              </div>

            </section>

          )}

        </div>

      )}

    </div>
  );
}

export default OrganizerStaffingReview;