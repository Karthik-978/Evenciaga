import { useEffect, useState } from "react";

import {
  Navigate
} from "react-router-dom";

import {
  onAuthStateChanged
} from "firebase/auth";

import {
  doc,
  getDoc
} from "firebase/firestore";

import {
  auth,
  db
} from "../firebase";

function RoleRoute({
  children,
  allowedRoles
}) {
  const [loading, setLoading] =
    useState(true);

  const [userRole, setUserRole] =
    useState("");

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!currentUser) {
            setIsLoggedIn(false);
            setUserRole("");
            setLoading(false);

            return;
          }

          try {
            setIsLoggedIn(true);

            const userSnapshot =
              await getDoc(
                doc(
                  db,
                  "users",
                  currentUser.uid
                )
              );

            if (!userSnapshot.exists()) {
              setUserRole("volunteer");
              setLoading(false);

              return;
            }

            const userData =
              userSnapshot.data();

            let detectedRole =
              userData.role ||
              "volunteer";

            if (
              userData.role === "admin" ||
              userData.isAdmin === true
            ) {
              detectedRole = "admin";
            } else if (
              userData.role === "organizer" ||
              userData.organizerApproved === true ||
              userData.organizerStatus === "approved" ||
              userData.organizerApplicationStatus ===
                "approved"
            ) {
              detectedRole = "organizer";
            }

            setUserRole(detectedRole);

          } catch (error) {
            console.error(
              "Role verification failed:",
              error
            );

            setUserRole("");
          } finally {
            setLoading(false);
          }
        }
      );

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="page-container">

        <div className="page-card empty-state">

          <div className="empty-icon">
            🔐
          </div>

          <h2>
            Verifying Access
          </h2>

          <p>
            Checking your account permissions.
          </p>

        </div>

      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  if (
    !allowedRoles.includes(
      userRole
    )
  ) {
    if (userRole === "admin") {
      return (
        <Navigate
          to="/admin-dashboard"
          replace
        />
      );
    }

    if (userRole === "organizer") {
      return (
        <Navigate
          to="/organizer-dashboard"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
}

export default RoleRoute;