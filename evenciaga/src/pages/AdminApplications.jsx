import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "firebase/firestore";

import { db } from "../firebase";
import BackButton from "../components/BackButton";

function AdminApplications() {

  const [applications, setApplications] =
    useState([]);

  const refreshApplications =
    async () => {

      try {

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
              ...document.data()
            })
          );

        setApplications(data);

      } catch (error) {

        console.log(error);
      }
    };

  useEffect(() => {

    refreshApplications();

  }, []);

  const approveApplication =
    async (application) => {

      try {

        await updateDoc(
          doc(
            db,
            "organizerApplications",
            application.id
          ),
          {
            status: "approved"
          }
        );

        await updateDoc(
          doc(
            db,
            "users",
            application.uid
          ),
          {
            role: "organizer",
            organizerStatus:
              "approved"
          }
        );

        await refreshApplications();

        alert(
          "Application Approved Successfully"
        );

      } catch (error) {

        console.log(error);

        alert(
          "Approval Failed"
        );
      }
    };

  const rejectApplication =
    async (application) => {

      try {

        await updateDoc(
          doc(
            db,
            "organizerApplications",
            application.id
          ),
          {
            status: "rejected"
          }
        );

        await refreshApplications();

        alert(
          "Application Rejected"
        );

      } catch (error) {

        console.log(error);

        alert(
          "Rejection Failed"
        );
      }
    };

  return (

    <div
      style={{
        maxWidth: "1000px",
        margin: "30px auto",
        padding: "20px"
      }}
    >
      <BackButton />

      <h1>
        Organizer Applications
      </h1>

      {
        applications.length === 0 && (

          <p>
            No Applications Found
          </p>
        )
      }

      {
        applications.map(
          (app) => (

            <div
              key={app.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                padding: "20px",
                marginBottom: "20px"
              }}
            >

              <h2>
                {app.organizationName}
              </h2>

              <p>
                <strong>
                  Email:
                </strong>
                {" "}
                {app.email}
              </p>

              <p>
                <strong>
                  Organization Type:
                </strong>
                {" "}
                {app.organizationType}
              </p>

              <p>
                <strong>
                  City:
                </strong>
                {" "}
                {app.city}
              </p>

              <p>
                <strong>
                  Purpose:
                </strong>
                {" "}
                {app.purpose}
              </p>

              <p>
                <strong>
                  Proof Link:
                </strong>
                {" "}
                {app.proofLink}
              </p>

              <p>
                <strong>
                  Status:
                </strong>
                {" "}
                {app.status}
              </p>

              {
                app.status ===
                "pending" && (

                  <div>

                    <button
                      onClick={() =>
                        approveApplication(
                          app
                        )
                      }
                      style={{
                        marginRight:
                          "10px",
                        padding:
                          "8px 16px",
                        cursor:
                          "pointer"
                      }}
                    >
                      Approve
                    </button>

                    <button
                      onClick={() =>
                        rejectApplication(
                          app
                        )
                      }
                      style={{
                        padding:
                          "8px 16px",
                        cursor:
                          "pointer"
                      }}
                    >
                      Reject
                    </button>

                  </div>
                )
              }

            </div>
          )
        )
      }

    </div>
  );
}

export default AdminApplications;