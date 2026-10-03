import { useEffect, useMemo, useState } from "react";

import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  addDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

function SelectVolunteers() {
  const [events, setEvents] =
    useState([]);

  const [selectedEvent, setSelectedEvent] =
    useState(null);

  const [applications, setApplications] =
    useState([]);

  const [primarySelections, setPrimarySelections] =
    useState([]);

  const [standbySelections, setStandbySelections] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user) return;

      const eventQuery = query(
        collection(db, "events"),
        where(
          "organizerId",
          "==",
          user.uid
        ),
        where(
          "staffingStatus",
          "==",
          "approved"
        )
      );

      const eventSnapshot =
        await getDocs(eventQuery);

      const organizerEvents =
        eventSnapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      setEvents(organizerEvents);

      if (
        organizerEvents.length &&
        !selectedEvent
      ) {
        await selectEvent(
          organizerEvents[0]
        );
      }
    } catch (error) {
      console.error(
        "Load selection data:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const selectEvent = async (event) => {
    try {
      setSelectedEvent(event);

      const applicationQuery =
        query(
          collection(
            db,
            "volunteerApplications"
          ),
          where(
            "eventId",
            "==",
            event.id
          ),
          where(
            "status",
            "==",
            "pending"
          )
        );

      const snapshot =
        await getDocs(
          applicationQuery
        );

      const data =
        snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      setApplications(data);

      setPrimarySelections([]);
      setStandbySelections([]);
    } catch (error) {
      console.error(
        "Load applications:",
        error
      );
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const roles = useMemo(() => {
    if (!selectedEvent?.staffingPlan) {
      return [];
    }

    return selectedEvent.staffingPlan;
  }, [selectedEvent]);

  const getSelectedRoleCount = (
    roleName
  ) => {
    return primarySelections.filter(
      (id) => {
        const application =
          applications.find(
            (item) =>
              item.id === id
          );

        return (
          application?.role ===
          roleName
        );
      }
    ).length;
  };

  const togglePrimary = (
    application
  ) => {
    const id = application.id;

    if (
      primarySelections.includes(id)
    ) {
      setPrimarySelections(
        (current) =>
          current.filter(
            (item) => item !== id
          )
      );

      return;
    }

    if (
      standbySelections.includes(id)
    ) {
      setStandbySelections(
        (current) =>
          current.filter(
            (item) => item !== id
          )
      );
    }

    const role = roles.find(
      (item) =>
        item.role ===
        application.role
    );

    const limit =
      Number(role?.count || 0);

    const currentCount =
      getSelectedRoleCount(
        application.role
      );

    if (
      currentCount >= limit
    ) {
      alert(
        `The ${application.role} role already has ${limit} selected volunteers.`
      );

      return;
    }

    setPrimarySelections(
      (current) => [
        ...current,
        id,
      ]
    );
  };

  const toggleStandby = (
    application
  ) => {
    const id = application.id;

    if (
      standbySelections.includes(id)
    ) {
      setStandbySelections(
        (current) =>
          current.filter(
            (item) => item !== id
          )
      );

      return;
    }

    if (
      primarySelections.includes(id)
    ) {
      setPrimarySelections(
        (current) =>
          current.filter(
            (item) => item !== id
          )
      );
    }

    const standbyLimit =
      Number(
        selectedEvent?.standbyLimit ||
          0
      );

    if (
      standbySelections.length >=
      standbyLimit
    ) {
      alert(
        `Only ${standbyLimit} standby volunteers are allowed.`
      );

      return;
    }

    setStandbySelections(
      (current) => [
        ...current,
        id,
      ]
    );
  };

  const finalizeSelection =
    async () => {
      if (!selectedEvent) return;

      if (
        primarySelections.length === 0
      ) {
        alert(
          "Select at least one primary volunteer."
        );
        return;
      }

      try {
        setSaving(true);

        const user =
          auth.currentUser;

        const primaryApps =
          applications.filter(
            (item) =>
              primarySelections.includes(
                item.id
              )
          );

        const standbyApps =
          applications.filter(
            (item) =>
              standbySelections.includes(
                item.id
              )
          );

        const selectedIds = [
          ...primarySelections,
          ...standbySelections,
        ];

        for (
          const application
          of applications
        ) {
          if (
            primarySelections.includes(
              application.id
            )
          ) {
            await updateDoc(
              doc(
                db,
                "volunteerApplications",
                application.id
              ),
              {
                status: "selected",
                selectionType:
                  "primary",
                reviewedBy:
                  user?.uid || null,
                reviewedAt:
                  serverTimestamp(),
              }
            );
          } else if (
            standbySelections.includes(
              application.id
            )
          ) {
            await updateDoc(
              doc(
                db,
                "volunteerApplications",
                application.id
              ),
              {
                status: "standby",
                selectionType:
                  "standby",
                reviewedBy:
                  user?.uid || null,
                reviewedAt:
                  serverTimestamp(),
              }
            );
          } else {
            await updateDoc(
              doc(
                db,
                "volunteerApplications",
                application.id
              ),
              {
                status: "rejected",
                selectionType:
                  "not_selected",
                reviewedBy:
                  user?.uid || null,
                reviewedAt:
                  serverTimestamp(),
              }
            );
          }
        }

        await updateDoc(
          doc(
            db,
            "events",
            selectedEvent.id
          ),
          {
            staffingStatus:
              "staffed",

            staffingCompletedAt:
              serverTimestamp(),

            selectedPrimaryVolunteers:
              primaryApps.map(
                (item) => ({
                  applicationId:
                    item.id,
                  volunteerId:
                    item.volunteerId,
                  volunteerName:
                    item.volunteerName,
                  volunteerEmail:
                    item.volunteerEmail,
                  role:
                    item.role,
                })
              ),

            selectedStandbyVolunteers:
              standbyApps.map(
                (item) => ({
                  applicationId:
                    item.id,
                  volunteerId:
                    item.volunteerId,
                  volunteerName:
                    item.volunteerName,
                  volunteerEmail:
                    item.volunteerEmail,
                  role:
                    item.role,
                })
              ),

            staffingFilled:
              true,
          }
        );

        for (
          const application
          of primaryApps
        ) {
          await addDoc(
            collection(
              db,
              "notifications"
            ),
            {
              recipientId:
                application.volunteerId,

              eventId:
                selectedEvent.id,

              type:
                "volunteer_selected",

              title:
                "You Were Selected!",

              message:
                `You have been selected for ${application.role} at ${selectedEvent.title}.`,

              isRead: false,

              createdAt:
                serverTimestamp(),
            }
          );
        }

        for (
          const application
          of standbyApps
        ) {
          await addDoc(
            collection(
              db,
              "notifications"
            ),
            {
              recipientId:
                application.volunteerId,

              eventId:
                selectedEvent.id,

              type:
                "volunteer_standby",

              title:
                "You Are on Standby",

              message:
                `You have been placed on standby for ${selectedEvent.title}.`,

              isRead: false,

              createdAt:
                serverTimestamp(),
            }
          );
        }

        for (
          const application
          of applications
        ) {
          if (
            selectedIds.includes(
              application.id
            )
          ) {
            continue;
          }

          await addDoc(
            collection(
              db,
              "notifications"
            ),
            {
              recipientId:
                application.volunteerId,

              eventId:
                selectedEvent.id,

              type:
                "volunteer_not_selected",

              title:
                "Application Update",

              message:
                `Your application for ${selectedEvent.title} was not selected.`,

              isRead: false,

              createdAt:
                serverTimestamp(),
            }
          );
        }

        alert(
          "Volunteer selection finalized successfully."
        );

        await selectEvent(
          selectedEvent
        );
      } catch (error) {
        console.error(
          "Finalize selection:",
          error
        );

        alert(
          "Failed to finalize volunteer selection."
        );
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card loading-page">
          Loading volunteer selection...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">

      <section className="page-card">

        <BackButton />

        <div className="review-hero">

          <div>
            <span className="dashboard-eyebrow">
              Organizer Panel
            </span>

            <h1>
              Select Volunteers
            </h1>

            <p>
              Build your primary and standby
              volunteer team.
            </p>
          </div>

          <div className="review-count">
            <strong>
              {primarySelections.length}
            </strong>

            <span>
              Primary selected
            </span>
          </div>

        </div>

      </section>

      <section className="page-card">

        <div className="panel-header">

          <div>
            <h2>
              Select Event
            </h2>

            <p>
              Choose an approved event to staff.
            </p>
          </div>

        </div>

        {events.length === 0 ? (
          <div className="empty-review-state">

            <div className="large-panel-icon">
              📅
            </div>

            <h2>
              No approved events
            </h2>

            <p>
              Events with approved staffing plans
              will appear here.
            </p>

          </div>
        ) : (
          <div className="staffing-request-cards">

            {events.map(
              (event) => (
                <button
                  key={event.id}
                  className={`staffing-request-card ${
                    selectedEvent?.id ===
                    event.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    selectEvent(event)
                  }
                >
                  <div className="request-card-top">

                    <span className="request-status approved">
                      Approved
                    </span>

                    <span>
                      {event.date}
                    </span>

                  </div>

                  <h3>
                    {event.title}
                  </h3>

                  <p>
                    {event.location}
                  </p>

                </button>
              )
            )}

          </div>
        )}

      </section>

      {selectedEvent && (
        <>
          <section className="page-card">

            <div className="panel-header">

              <div>
                <span className="dashboard-eyebrow">
                  Applicants
                </span>

                <h2>
                  {selectedEvent.title}
                </h2>

                <p>
                  Select volunteers according to
                  the approved staffing plan.
                </p>
              </div>

              <div className="live-total">
                <strong>
                  {applications.length}
                </strong>

                <span>
                  Applicants
                </span>
              </div>

            </div>

            {roles.map(
              (role) => (
                <div
                  className="proposed-role-list"
                  key={role.role}
                >

                  <div className="proposed-role-heading">

                    <h3>
                      {role.role}
                    </h3>

                    <span>
                      {
                        getSelectedRoleCount(
                          role.role
                        )
                      }{" "}
                      /{" "}
                      {role.count}
                    </span>

                  </div>

                  {applications
                    .filter(
                      (application) =>
                        application.role ===
                        role.role
                    )
                    .map(
                      (application) => (
                        <ApplicantRow
                          key={
                            application.id
                          }
                          application={
                            application
                          }
                          primarySelected={primarySelections.includes(
                            application.id
                          )}
                          standbySelected={standbySelections.includes(
                            application.id
                          )}
                          onPrimary={() =>
                            togglePrimary(
                              application
                            )
                          }
                          onStandby={() =>
                            toggleStandby(
                              application
                            )
                          }
                        />
                      )
                    )}

                  {applications.filter(
                    (application) =>
                      application.role ===
                      role.role
                  ).length === 0 && (
                    <div className="empty-staffing-state">
                      No applicants for this role.
                    </div>
                  )}

                </div>
              )
            )}

          </section>

          <section className="page-card">

            <div className="plan-total-card">

              <div>
                <span>
                  Primary
                </span>

                <strong>
                  {primarySelections.length}
                </strong>
              </div>

              <div>
                <span>
                  Standby
                </span>

                <strong>
                  {standbySelections.length}
                </strong>
              </div>

              <div>
                <span>
                  Total Selected
                </span>

                <strong>
                  {primarySelections.length +
                    standbySelections.length}
                </strong>
              </div>

            </div>

            <button
              className="primary-button plan-submit-button"
              disabled={saving}
              onClick={
                finalizeSelection
              }
            >
              {saving
                ? "Finalizing..."
                : "✓ Finalize Volunteer Team"}
            </button>

          </section>
        </>
      )}

    </div>
  );
}

function ApplicantRow({
  application,
  primarySelected,
  standbySelected,
  onPrimary,
  onStandby,
}) {
  return (
    <div className="proposed-role-row">

      <div className="role-index">
        {primarySelected
          ? "✓"
          : standbySelected
            ? "ST"
            : "—"}
      </div>

      <div>
        <strong>
          {application.volunteerName}
        </strong>

        <p>
          {application.volunteerEmail}
        </p>
      </div>

      <span>
        ⭐ {application.rating || 0}
      </span>

      <span>
        {application.attendancePercentage ||
          0}%
      </span>

      <button
        type="button"
        className={
          primarySelected
            ? "approve-plan-button"
            : "secondary-button"
        }
        onClick={onPrimary}
      >
        {primarySelected
          ? "Primary ✓"
          : "Primary"}
      </button>

      <button
        type="button"
        className={
          standbySelected
            ? "review-pill"
            : "secondary-button"
        }
        onClick={onStandby}
      >
        {standbySelected
          ? "Standby ✓"
          : "Standby"}
      </button>

    </div>
  );
}

export default SelectVolunteers;    