import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

import { auth } from "../firebase";

import {
  loginUser,
  registerUser,
  googleLogin
} from "../services/authService";

import {
  getUserProfile
} from "../services/userService";

function Login() {

  const ADMIN_EMAILS = [
    "evenciaga.admin@gmail.com"
  ];

  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const navigateByRole =
    async (currentUser, profile) => {

      if (
        profile.accountStatus ===
        "suspended"
      ) {

        await signOut(auth);

        setMessageType("error");

        setMessage(
          "Your account has been suspended by the administrator."
        );

        return;
      }

      if (
        ADMIN_EMAILS.includes(
          currentUser.email
        ) &&
        profile.role === "admin"
      ) {

        navigate("/admin-dashboard");

        return;
      }

      if (
        profile.role === "organizer"
      ) {

        navigate(
          "/organizer-dashboard"
        );

        return;
      }

      navigate("/dashboard");

    };

  const handleLogin =
    async () => {

      if (
        !email.trim() ||
        !password
      ) {

        setMessageType("error");

        setMessage(
          "Please enter your email and password."
        );

        return;
      }

      try {

        setLoading(true);

        setMessage("");

        const userCredential =
          await loginUser(
            email.trim(),
            password
          );

        if (
          !userCredential.user
            .emailVerified
        ) {

          await signOut(auth);

          setMessageType("error");

          setMessage(
            "Please verify your email before signing in."
          );

          return;
        }

        const profile =
          await getUserProfile(
            userCredential.user.uid
          );

        if (!profile) {

          navigate("/guidelines");

          return;
        }

        await navigateByRole(
          userCredential.user,
          profile
        );

      } catch (error) {

        console.log(error);

        setMessageType("error");

        if (
          error.code ===
          "auth/invalid-credential"
        ) {

          setMessage(
            "Invalid email or password."
          );

        } else if (
          error.code ===
          "auth/too-many-requests"
        ) {

          setMessage(
            "Too many login attempts. Please try again later."
          );

        } else {

          setMessage(
            error.message ||
            "Unable to sign in."
          );

        }

      } finally {

        setLoading(false);

      }

    };

  const handleRegister =
    async () => {

      if (
        !email.trim() ||
        !password
      ) {

        setMessageType("error");

        setMessage(
          "Please enter your email and password."
        );

        return;
      }

      try {

        setLoading(true);

        setMessage("");

        await registerUser(
          email.trim(),
          password
        );

        setMessageType("success");

        setMessage(
          "Verification email sent. Verify your email before signing in."
        );

      } catch (error) {

        console.log(error);

        setMessageType("error");

        if (
          error.code ===
          "auth/email-already-in-use"
        ) {

          setMessage(
            "An account already exists with this email."
          );

        } else if (
          error.code ===
          "auth/weak-password"
        ) {

          setMessage(
            "Password must contain at least 6 characters."
          );

        } else if (
          error.code ===
          "auth/invalid-email"
        ) {

          setMessage(
            "Enter a valid email address."
          );

        } else {

          setMessage(
            error.message ||
            "Unable to create the account."
          );

        }

      } finally {

        setLoading(false);

      }

    };

  const handleGoogleLogin =
    async () => {

      try {

        setLoading(true);

        setMessage("");

        await googleLogin();

        const currentUser =
          auth.currentUser;

        if (!currentUser) {

          throw new Error(
            "Google login failed."
          );

        }

        const profile =
          await getUserProfile(
            currentUser.uid
          );

        if (!profile) {

          navigate("/guidelines");

          return;
        }

        await navigateByRole(
          currentUser,
          profile
        );

      } catch (error) {

        console.log(error);

        setMessageType("error");

        setMessage(
          error.message ||
          "Unable to continue with Google."
        );

      } finally {

        setLoading(false);

      }

    };

  const handleKeyDown =
    (event) => {

      if (
        event.key === "Enter" &&
        !loading
      ) {

        handleLogin();

      }

    };

  return (

    <main className="auth-page">

      <section className="auth-visual">

        <div className="auth-visual-content">

          <div className="brand-mark">
            E
          </div>

          <p className="auth-eyebrow">
            Volunteer. Organize. Create impact.
          </p>

          <h1>
            Events that bring people together.
          </h1>

          <p className="auth-visual-description">
            Evenciaga connects volunteers,
            organizers and administrators through
            one trusted event-management platform.
          </p>

          <div className="auth-feature-list">

            <div className="auth-feature">
              <span>✓</span>
              Discover meaningful events
            </div>

            <div className="auth-feature">
              <span>✓</span>
              Track attendance and certificates
            </div>

            <div className="auth-feature">
              <span>✓</span>
              Manage volunteers from one place
            </div>

          </div>

        </div>

      </section>

      <section className="auth-form-section">

        <div className="auth-card">

          <div className="auth-mobile-brand">

            <div className="brand-mark">
              E
            </div>

            <span>
              Evenciaga
            </span>

          </div>

          <div className="auth-heading">

            <p className="auth-label">
              Welcome back
            </p>

            <h2>
              Sign in to Evenciaga
            </h2>

            <p>
              Enter your account details to continue.
            </p>

          </div>

          <div className="form-group">

            <label htmlFor="email">
              Email address
            </label>

            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              onKeyDown={handleKeyDown}
              autoComplete="email"
            />

          </div>

          <div className="form-group">

            <div className="form-label-row">

              <label htmlFor="password">
                Password
              </label>

              <button
                type="button"
                className="text-button"
                onClick={() =>
                  navigate(
                    "/forgot-password"
                  )
                }
              >
                Forgot password?
              </button>

            </div>

            <div className="password-field">

              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                onKeyDown={handleKeyDown}
                autoComplete="current-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
              >
                {
                  showPassword
                    ? "Hide"
                    : "Show"
                }
              </button>

            </div>

          </div>

          {
            message && (

              <div
                className={
                  messageType === "success"
                    ? "form-message success"
                    : "form-message error"
                }
              >
                {message}
              </div>

            )
          }

          <button
            type="button"
            className="primary-button full-width"
            onClick={handleLogin}
            disabled={loading}
          >
            {
              loading
                ? "Please wait..."
                : "Sign in"
            }
          </button>

          <div className="auth-divider">
            <span>
              or
            </span>
          </div>

          <button
            type="button"
            className="google-button full-width"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <span className="google-icon">
              G
            </span>

            Continue with Google
          </button>

          <div className="register-section">

            <p>
              Don't have an account?
            </p>

            <button
              type="button"
              className="secondary-button full-width"
              onClick={handleRegister}
              disabled={loading}
            >
              Create an account
            </button>

          </div>

          <p className="auth-footer-text">
            By continuing, you agree to the
            platform guidelines and privacy terms.
          </p>

        </div>

      </section>

    </main>

  );

}

export default Login;