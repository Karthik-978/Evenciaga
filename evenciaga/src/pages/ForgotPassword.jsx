import { useState } from "react";

import {
  sendPasswordResetEmail
} from "firebase/auth";

import { auth } from "../firebase";

function ForgotPassword() {

  const [email, setEmail] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const resetPassword =
    async () => {

      if (!email) {

        setMessage(
          "Enter your email."
        );

        return;
      }

      try {

        setLoading(true);

        await sendPasswordResetEmail(
          auth,
          email
        );

        setMessage(
          "Password reset link sent to your email."
        );

      } catch (error) {

        setMessage(
          error.message
        );

      } finally {

        setLoading(false);

      }

    };

  return (

    <div
      style={{
        maxWidth: "400px",
        margin: "100px auto",
        padding: "30px",
        border: "1px solid #ccc",
        borderRadius: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "15px"
      }}
    >

      <h1>
        Forgot Password
      </h1>

      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) =>
          setEmail(
            e.target.value
          )
        }
        style={{
          padding: "10px"
        }}
      />

      <button
        onClick={resetPassword}
        disabled={loading}
        style={{
          padding: "10px",
          cursor: "pointer"
        }}
      >
        {
          loading
            ? "Sending..."
            : "Send Reset Link"
        }
      </button>

      <p
        style={{
          color: "blue",
          fontWeight: "bold"
        }}
      >
        {message}
      </p>

    </div>

  );

}

export default ForgotPassword;