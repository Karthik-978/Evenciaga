import { useState } from "react";

import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

import {
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

function BecomeOrganizer() {

  const [organizationName, setOrganizationName] =
    useState("");

  const [organizationType, setOrganizationType] =
    useState("");

  const [city, setCity] =
    useState("");

  const [purpose, setPurpose] =
    useState("");

  const [proofLink, setProofLink] =
    useState("");

  const [agreed, setAgreed] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async () => {

    if (
      !organizationName ||
      !organizationType ||
      !city ||
      !purpose
    ) {

      setMessage(
        "Please fill all required fields"
      );

      return;
    }

    if (!agreed) {

      setMessage(
        "Please accept the agreement"
      );

      return;
    }

    try {

      setLoading(true);

      const user =
        auth.currentUser;

      await addDoc(
        collection(
          db,
          "organizerApplications"
        ),
        {
          uid: user.uid,

          fullName:
            user.displayName || "",

          email:
            user.email,

          organizationName,

          organizationType,

          city,

          purpose,

          proofLink,

          status: "pending",

          submittedAt:
            serverTimestamp()
        }
      );

      setMessage(
        "Application submitted successfully. Waiting for admin approval."
      );

      setOrganizationName("");
      setOrganizationType("");
      setCity("");
      setPurpose("");
      setProofLink("");
      setAgreed(false);

    } catch (error) {

      console.log(error);

      setMessage(
        "Failed to submit application"
      );

    } finally {

      setLoading(false);
    }
  };

  return (

    <div
      style={{
        maxWidth: "700px",
        margin: "30px auto",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "10px"
      }}
    >
      <BackButton />

      <h1>
        Become Organizer
      </h1>

      <p>
        Submit your details for
        organizer verification.
      </p>

      <input
        type="text"
        placeholder="Organization Name"
        value={organizationName}
        onChange={(e) =>
          setOrganizationName(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px"
        }}
      />

      <input
        type="text"
        placeholder="Organization Type"
        value={organizationType}
        onChange={(e) =>
          setOrganizationType(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px"
        }}
      />

      <input
        type="text"
        placeholder="City"
        value={city}
        onChange={(e) =>
          setCity(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px"
        }}
      />

      <textarea
        placeholder="Why do you want to become an organizer?"
        value={purpose}
        onChange={(e) =>
          setPurpose(
            e.target.value
          )
        }
        rows="4"
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px"
        }}
      />

      <input
        type="text"
        placeholder="Proof Link (Google Drive / Website / LinkedIn)"
        value={proofLink}
        onChange={(e) =>
          setProofLink(
            e.target.value
          )
        }
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px"
        }}
      />

      <div
        style={{
          marginBottom: "15px"
        }}
      >

        <input
          type="checkbox"
          checked={agreed}
          onChange={() =>
            setAgreed(
              !agreed
            )
          }
        />

        {" "}

        I agree that fake events,
        misleading information,
        or misuse of volunteers
        may result in suspension.

      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          padding: "10px 20px",
          cursor: "pointer"
        }}
      >

        {
          loading
            ? "Submitting..."
            : "Submit Application"
        }

      </button>

      <p
        style={{
          marginTop: "15px",
          color: "blue"
        }}
      >
        {message}
      </p>

    </div>
  );
}

export default BecomeOrganizer;