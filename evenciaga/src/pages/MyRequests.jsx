import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";

import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

function MyRequests() {

  const [requests, setRequests] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const fetchRequests =
      async () => {

        try {

          const q =
            query(
              collection(
                db,
                "joinRequests"
              ),
              where(
                "volunteerId",
                "==",
                auth.currentUser.uid
              )
            );

          const querySnapshot =
            await getDocs(q);

          const data =
            querySnapshot.docs.map(
              (document) => ({
                id: document.id,
                ...document.data()
              })
            );

          setRequests(data);

        } catch (error) {

          console.log(error);

        } finally {

          setLoading(false);
        }
      };

    fetchRequests();

  }, []);

  if (loading) {

    return (
      <h2>
        Loading Requests...
      </h2>
    );
  }

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
        My Requests
      </h1>

      {
        requests.length === 0 && (

          <p>
            No Requests Found
          </p>
        )
      }

      {
        requests.map(
          (request) => (

            <div
              key={request.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                padding: "20px",
                marginBottom: "15px"
              }}
            >

              <h3>
                {request.eventTitle}
              </h3>

              <p>
                Status:
                {" "}
                <strong>
                  {request.status}
                </strong>
              </p>

              <p>
                Volunteer:
                {" "}
                {request.volunteerName}
              </p>

            </div>
          )
        )
      }

    </div>
  );
}

export default MyRequests;