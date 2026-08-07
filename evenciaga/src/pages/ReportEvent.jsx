import { useState, useEffect } from "react";

import { useParams, useNavigate } from "react-router-dom";

import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

function ReportEvent() {

  const { id } = useParams();

  const navigate = useNavigate();

  const [event, setEvent] =
    useState(null);

  const [reason, setReason] =
    useState("");

  const [description, setDescription] =
    useState("");

  useEffect(() => {

    fetchEvent();

  }, []);

  const fetchEvent =
    async () => {

      try {

        const docRef =
          doc(
            db,
            "events",
            id
          );

        const docSnap =
          await getDoc(
            docRef
          );

        if (
          docSnap.exists()
        ) {

          setEvent({
            id: docSnap.id,
            ...docSnap.data()
          });

        }

      } catch (error) {

        console.log(error);

      }

    };

  const submitReport =
    async () => {

      if (
        !reason ||
        !description
      ) {

        alert(
          "Please complete all fields."
        );

        return;

      }

      try {

        // Get current user profile
        const userRef =
          doc(
            db,
            "users",
            auth.currentUser.uid
          );

        const userSnap =
          await getDoc(
            userRef
          );

        const userData =
          userSnap.data();

        // Save report
        await addDoc(
          collection(
            db,
            "reports"
          ),
          {

            reportedBy:
              auth.currentUser.uid,

            reportedByName:
              userData?.name || "Unknown",

            reportedByEmail:
              userData?.email || auth.currentUser.email,

            reportedAgainst:
              event.organizerId,

            eventId:
              event.id,

            eventTitle:
              event.title,

            reason,

            description,

            status:
              "pending",

            createdAt:
              serverTimestamp()

          }
        );

        alert(
          "Report submitted successfully."
        );

        navigate(
          "/dashboard"
        );

      } catch (error) {

        console.log(error);

        alert(
          "Failed to submit report."
        );

      }

    };

  if (!event) {

    return (
      <h2>
        Loading...
      </h2>
    );

  }

  return (

    <div
      style={{
        maxWidth: "700px",
        margin: "40px auto",
        padding: "20px"
      }}
    >
      <BackButton />

      <h1>
        🚩 Report Event
      </h1>

      <h3>
        {event.title}
      </h3>

      <select
        value={reason}
        onChange={(e) =>
          setReason(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: "10px",
          marginTop: "20px"
        }}
      >

        <option value="">
          Select Reason
        </option>

        <option value="Fake Event">
          Fake Event
        </option>

        <option value="Organizer Misconduct">
          Organizer Misconduct
        </option>

        <option value="Payment Issue">
          Payment Issue
        </option>

        <option value="Other">
          Other
        </option>

      </select>

      <textarea
        placeholder="Describe the problem..."
        value={description}
        onChange={(e) =>
          setDescription(
            e.target.value
          )
        }
        rows="6"
        style={{
          width: "100%",
          marginTop: "20px",
          padding: "10px"
        }}
      />

      <button
        onClick={submitReport}
        style={{
          marginTop: "20px",
          padding: "12px 20px",
          cursor: "pointer"
        }}
      >
        Submit Report
      </button>

    </div>

  );

}

export default ReportEvent;