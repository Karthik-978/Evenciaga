require("dotenv").config();

const express = require("express");
const cors = require("cors");

const {
  initializeApp,
  cert,
  getApps
} = require("firebase-admin/app");

const {
  getAuth
} = require("firebase-admin/auth");

const serviceAccount =
  require("./serviceAccountKey.json");

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const app = express();

const PORT =
  process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173"
  })
);

app.use(express.json());

app.get("/", (request, response) => {
  response.json({
    success: true,
    message:
      "Evenciaga backend is running."
  });
});

const verifyFirebaseToken =
  async (
    request,
    response,
    next
  ) => {

    try {

      const authorizationHeader =
        request.headers.authorization;

      if (
        !authorizationHeader ||
        !authorizationHeader.startsWith(
          "Bearer "
        )
      ) {

        return response
          .status(401)
          .json({
            success: false,
            message:
              "Authentication token is missing."
          });

      }

      const idToken =
        authorizationHeader.substring(
          7
        );

      if (!idToken) {

        return response
          .status(401)
          .json({
            success: false,
            message:
              "Authentication token is missing."
          });

      }

      const decodedToken =
        await getAuth().verifyIdToken(
          idToken
        );

      request.user =
        decodedToken;

      next();

    } catch (error) {

      console.error(
        "Token verification error:",
        error.message
      );

      return response
        .status(401)
        .json({
          success: false,
          message:
            "Invalid or expired authentication token."
        });

    }

  };

app.get(
  "/api/me",
  verifyFirebaseToken,
  async (request, response) => {

    return response.json({
      success: true,
      message:
        "Firebase authentication verified.",
      user: {
        uid:
          request.user.uid,

        email:
          request.user.email || ""
      }
    });

  }
);

app.use(
  (
    error,
    request,
    response,
    next
  ) => {

    console.error(
      "Server error:",
      error
    );

    return response
      .status(500)
      .json({
        success: false,
        message:
          "Internal server error."
      });

  }
);

app.listen(PORT, () => {
  console.log(
    `Backend running at http://localhost:${PORT}`
  );
});