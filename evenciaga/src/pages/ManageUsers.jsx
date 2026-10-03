import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../firebase";
import BackButton from "../components/BackButton";

function ManageUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(
        collection(db, "users")
      );

      const data = snapshot.docs.map(
        (document) => ({
          id: document.id,
          ...document.data(),
        })
      );

      data.sort((a, b) =>
        (a.name || "")
          .localeCompare(b.name || "")
      );

      setUsers(data);
    } catch (error) {
      console.error(
        "Failed to load users:",
        error
      );

      alert(
        "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    const ok = window.confirm(
      "Delete this user profile?"
    );

    if (!ok) {
      return;
    }

    try {
      setProcessingId(id);

      await deleteDoc(
        doc(
          db,
          "users",
          id
        )
      );

      alert(
        "User profile deleted successfully."
      );

      await fetchUsers();
    } catch (error) {
      console.error(
        "Delete user error:",
        error
      );

      alert(
        "Failed to delete user."
      );
    } finally {
      setProcessingId("");
    }
  };

  const suspendUser = async (id) => {
    const ok = window.confirm(
      "Suspend this user?"
    );

    if (!ok) {
      return;
    }

    try {
      setProcessingId(id);

      await updateDoc(
        doc(
          db,
          "users",
          id
        ),
        {
          accountStatus:
            "suspended",
        }
      );

      alert(
        "User suspended successfully."
      );

      await fetchUsers();
    } catch (error) {
      console.error(
        "Suspend user error:",
        error
      );

      alert(
        "Failed to suspend user."
      );
    } finally {
      setProcessingId("");
    }
  };

  const activateUser = async (id) => {
    const ok = window.confirm(
      "Activate this user?"
    );

    if (!ok) {
      return;
    }

    try {
      setProcessingId(id);

      await updateDoc(
        doc(
          db,
          "users",
          id
        ),
        {
          accountStatus:
            "active",
        }
      );

      alert(
        "User activated successfully."
      );

      await fetchUsers();
    } catch (error) {
      console.error(
        "Activate user error:",
        error
      );

      alert(
        "Failed to activate user."
      );
    } finally {
      setProcessingId("");
    }
  };

  const getRole = (user) => {
    if (
      user.role === "admin" ||
      user.isAdmin === true
    ) {
      return "admin";
    }

    if (
      user.role === "organizer" ||
      user.organizerApproved === true ||
      user.organizerStatus ===
        "approved"
    ) {
      return "organizer";
    }

    return "volunteer";
  };

  const filteredUsers =
    search.trim() === ""
      ? users
      : users.filter((user) => {
          const query =
            search
              .toLowerCase()
              .trim();

          return (
            user.name
              ?.toLowerCase()
              .includes(query) ||
            user.email
              ?.toLowerCase()
              .includes(query) ||
            user.city
              ?.toLowerCase()
              .includes(query)
          );
        });

  const activeUsers =
    users.filter(
      (user) =>
        user.accountStatus !==
        "suspended"
    ).length;

  const suspendedUsers =
    users.filter(
      (user) =>
        user.accountStatus ===
        "suspended"
    ).length;

  const organizers =
    users.filter(
      (user) =>
        getRole(user) ===
        "organizer"
    ).length;

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-card empty-state">
          <div className="empty-icon">
            👥
          </div>

          <h2>
            Loading Users
          </h2>

          <p>
            Fetching platform users from Firestore.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <section className="page-card organizer-hero">
        <div>
          <BackButton />

          <p className="dashboard-eyebrow">
            Admin Panel
          </p>

          <h1 className="page-title">
            👥 Manage Users
          </h1>

          <p className="page-subtitle">
            Search, review, suspend, activate,
            and manage platform users.
          </p>
        </div>

        <div className="organizer-status approved">
          {users.length} Users
        </div>
      </section>

      <section
        className="dashboard-stats-grid"
      >
        <div className="stat-card">
          <div className="stat-icon">
            👥
          </div>

          <div>
            <p>
              Total Users
            </p>

            <h2>
              {users.length}
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            ✅
          </div>

          <div>
            <p>
              Active
            </p>

            <h2>
              {activeUsers}
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            🚫
          </div>

          <div>
            <p>
              Suspended
            </p>

            <h2>
              {suspendedUsers}
            </h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            🏢
          </div>

          <div>
            <p>
              Organizers
            </p>

            <h2>
              {organizers}
            </h2>
          </div>
        </div>
      </section>

      <section className="page-card">
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <div>
            <p className="dashboard-eyebrow">
              User Directory
            </p>

            <h2
              className="page-title"
              style={{
                fontSize: "24px",
                marginBottom: "4px",
              }}
            >
              Platform Users
            </h2>

            <p className="page-subtitle">
              {filteredUsers.length} user
              {filteredUsers.length === 1
                ? ""
                : "s"}{" "}
              found
            </p>
          </div>

          <div
            style={{
              minWidth: "280px",
              flex: "0 1 360px",
            }}
          >
            <input
              type="text"
              placeholder="🔎 Search by name, email or city..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              style={{
                width: "100%",
                padding:
                  "13px 14px",
                borderRadius: "10px",
                border:
                  "1px solid #d1d5db",
                outline: "none",
                fontSize: "14px",
                background: "#ffffff",
              }}
            />
          </div>
        </div>

        {filteredUsers.length ===
        0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              🔎
            </div>

            <h2>
              No Users Found
            </h2>

            <p>
              Try another name, email,
              or city.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "16px",
            }}
          >
            {filteredUsers.map(
              (user) => {
                const role =
                  getRole(user);

                const status =
                  user.accountStatus ||
                  "active";

                const isProcessing =
                  processingId ===
                  user.id;

                return (
                  <article
                    key={user.id}
                    className="event-card"
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "flex-start",
                        gap: "16px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          gap: "14px",
                          alignItems:
                            "center",
                        }}
                      >
                        <div
                          style={{
                            width: "54px",
                            height: "54px",
                            borderRadius:
                              "50%",
                            background:
                              "#eff6ff",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            fontSize:
                              "22px",
                            fontWeight:
                              "800",
                            color:
                              "#2563eb",
                          }}
                        >
                          {user.name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            "U"}
                        </div>

                        <div>
                          <h2
                            className="event-title"
                            style={{
                              marginBottom:
                                "4px",
                            }}
                          >
                            {user.name ||
                              "Unnamed User"}
                          </h2>

                          <p
                            className="event-description"
                            style={{
                              margin: 0,
                            }}
                          >
                            {user.email ||
                              "Email not available"}
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: "8px",
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <span
                          className={
                            status ===
                            "suspended"
                              ? "status-completed"
                              : "status-active"
                          }
                        >
                          {status ===
                          "suspended"
                            ? "🚫 Suspended"
                            : "✅ Active"}
                        </span>

                        <span
                          className={
                            role ===
                            "admin"
                              ? "event-type-badge certificate"
                              : role ===
                                  "organizer"
                                ? "event-type-badge paid"
                                : "event-type-badge volunteer"
                          }
                        >
                          {role ===
                          "admin"
                            ? "🛡 Admin"
                            : role ===
                                "organizer"
                              ? "🏢 Organizer"
                              : "🙋 Volunteer"}
                        </span>
                      </div>
                    </div>

                    <div
                      className="event-meta-grid"
                      style={{
                        marginTop:
                          "18px",
                      }}
                    >
                      <div
                        className="event-meta-item"
                      >
                        <span className="event-meta-icon">
                          📍
                        </span>

                        <div>
                          <small>
                            City
                          </small>

                          <strong>
                            {user.city ||
                              "Not provided"}
                          </strong>
                        </div>
                      </div>

                      <div
                        className="event-meta-item"
                      >
                        <span className="event-meta-icon">
                          ⭐
                        </span>

                        <div>
                          <small>
                            Rating
                          </small>

                          <strong>
                            {Number(
                              user.rating ||
                                0
                            ).toFixed(
                              1
                            )}
                            /5
                          </strong>
                        </div>
                      </div>

                      <div
                        className="event-meta-item"
                      >
                        <span className="event-meta-icon">
                          ✅
                        </span>

                        <div>
                          <small>
                            Attendance
                          </small>

                          <strong>
                            {Number(
                              user.attendancePercentage ??
                                user.attendancePercent ??
                                0
                            )}
                            %
                          </strong>
                        </div>
                      </div>

                      <div
                        className="event-meta-item"
                      >
                        <span className="event-meta-icon">
                          🏆
                        </span>

                        <div>
                          <small>
                            Events
                          </small>

                          <strong>
                            {user.eventsCompleted ||
                              0}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div
                      className="event-action-buttons"
                      style={{
                        marginTop:
                          "20px",
                      }}
                    >
                      <button
                        type="button"
                        className="secondary-action-button"
                        onClick={() =>
                          navigate(
                            `/user-details/${user.id}`
                          )
                        }
                      >
                        👁 View Details
                      </button>

                      {status ===
                      "suspended" ? (
                        <button
                          type="button"
                          className="primary-action-button"
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            activateUser(
                              user.id
                            )
                          }
                        >
                          {isProcessing
                            ? "Processing..."
                            : "✅ Activate"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="secondary-action-button"
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            suspendUser(
                              user.id
                            )
                          }
                        >
                          {isProcessing
                            ? "Processing..."
                            : "🚫 Suspend"}
                        </button>
                      )}

                      {role !==
                        "admin" && (
                        <button
                          type="button"
                          className="delete-action-button"
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            deleteUser(
                              user.id
                            )
                          }
                        >
                          {isProcessing
                            ? "Processing..."
                            : "🗑 Delete"}
                        </button>
                      )}
                    </div>
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

export default ManageUsers;