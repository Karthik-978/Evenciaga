const {
  onDocumentCreated
} = require(
  "firebase-functions/v2/firestore"
);

const {
  defineSecret
} = require(
  "firebase-functions/params"
);

const {
  initializeApp
} = require(
  "firebase-admin/app"
);

const {
  getFirestore,
  FieldValue
} = require(
  "firebase-admin/firestore"
);

const {
  Resend
} = require(
  "resend"
);


/*
=========================================================
INITIALIZE FIREBASE ADMIN
=========================================================
*/

initializeApp();

const db =
  getFirestore();


/*
=========================================================
SECRET

Set using:

firebase functions:secrets:set RESEND_API_KEY
=========================================================
*/

const RESEND_API_KEY =
  defineSecret(
    "RESEND_API_KEY"
  );


/*
=========================================================
MAJOR EMAIL TYPES

Backend whitelist.

Even if the frontend accidentally sets emailEnabled:true,
the function will only send email for these types.
=========================================================
*/

const EMAIL_NOTIFICATION_TYPES = new Set([

  "organizer-approved",
  "organizer-rejected",

  "primary-selected",
  "standby-selected",

  "event-cancelled",
  "event-updated-important",

  "confirmation-required",

  "attendance-dispute",

  "certificate-issued",

  "payment-action-required",
  "payment-completed",

  "account-suspended",
  "account-restored",

  "emergency",
  "replacement-required"

]);


/*
=========================================================
EMAIL SUBJECTS
=========================================================
*/

const getEmailSubject =
  (
    notification
  ) => {

    const type =
      String(
        notification.type ||
        ""
      ).toLowerCase();


    const subjects = {

      "organizer-approved":
        "Your Evenciaga organizer application was approved",

      "organizer-rejected":
        "Update on your Evenciaga organizer application",

      "primary-selected":
        "You were selected as a primary volunteer",

      "standby-selected":
        "You were added to the standby volunteer list",

      "event-cancelled":
        "Important: Your Evenciaga event was cancelled",

      "event-updated-important":
        "Important update to your Evenciaga event",

      "confirmation-required":
        "Action required: Confirm your event participation",

      "attendance-dispute":
        "Action required: Attendance update",

      "certificate-issued":
        "Your Evenciaga certificate is ready",

      "payment-action-required":
        "Action required: Evenciaga payment update",

      "payment-completed":
        "Evenciaga payment completed",

      "account-suspended":
        "Important account notice from Evenciaga",

      "account-restored":
        "Your Evenciaga account has been restored",

      emergency:
        "Urgent Evenciaga volunteer request",

      "replacement-required":
        "Urgent volunteer replacement required"

    };


    return (
      subjects[type] ||
      notification.title ||
      "Evenciaga Notification"
    );

  };


/*
=========================================================
HTML ESCAPE

Prevents user-generated content from being injected
directly into an HTML email.
=========================================================
*/

const escapeHtml =
  (
    value
  ) => {

    return String(
      value ||
      ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );

  };


/*
=========================================================
BUILD EMAIL
=========================================================
*/

const buildEmailHtml =
  (
    notification,
    user
  ) => {

    const userName =
      escapeHtml(
        user.name ||
        user.fullName ||
        "Volunteer"
      );


    const title =
      escapeHtml(
        notification.title ||
        "Evenciaga Notification"
      );


    const message =
      escapeHtml(
        notification.message ||
        ""
      );


    const eventTitle =
      escapeHtml(
        notification.eventTitle ||
        ""
      );


    const actionLabel =
      escapeHtml(
        notification.actionLabel ||
        "Open Evenciaga"
      );


    /*
    ------------------------------------------------------
    Replace this with your deployed frontend URL later.

    Example:
    https://evenciaga.web.app
    ------------------------------------------------------
    */

    const APP_URL =
      "https://YOUR-EVENCIAGA-DOMAIN.com";


    const actionRoute =
      String(
        notification.actionRoute ||
        "/dashboard"
      );


    const actionUrl =
      `${APP_URL}${actionRoute}`;


    return `
      <!DOCTYPE html>

      <html>
      <head>
        <meta charset="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>
          ${title}
        </title>
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#f5f7fb;
          font-family:Arial,Helvetica,sans-serif;
          color:#26324d;
        "
      >

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="
            background:#f5f7fb;
            padding:32px 16px;
          "
        >

          <tr>

            <td align="center">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  max-width:620px;
                  background:#ffffff;
                  border-radius:18px;
                  overflow:hidden;
                  box-shadow:
                    0 12px 30px
                    rgba(16,27,61,0.08);
                "
              >

                <tr>

                  <td
                    style="
                      background:
                        linear-gradient(
                          135deg,
                          #101b3d,
                          #3157e5
                        );
                      padding:28px;
                      color:#ffffff;
                    "
                  >

                    <div
                      style="
                        font-size:28px;
                        font-weight:800;
                      "
                    >
                      Evenciaga
                    </div>

                    <div
                      style="
                        margin-top:6px;
                        font-size:13px;
                        opacity:0.86;
                      "
                    >
                      Volunteer & Event Management Platform
                    </div>

                  </td>

                </tr>


                <tr>

                  <td
                    style="
                      padding:32px;
                    "
                  >

                    <p
                      style="
                        margin:0 0 18px;
                        font-size:15px;
                      "
                    >
                      Hello ${userName},
                    </p>


                    <h1
                      style="
                        margin:0 0 16px;
                        color:#101b3d;
                        font-size:24px;
                      "
                    >
                      ${title}
                    </h1>


                    <p
                      style="
                        margin:0;
                        color:#5f6b83;
                        font-size:15px;
                        line-height:1.7;
                      "
                    >
                      ${message}
                    </p>


                    ${
                      eventTitle
                        ? `
                          <div
                            style="
                              margin-top:22px;
                              padding:15px;
                              border-radius:12px;
                              background:#f3f6ff;
                              color:#101b3d;
                            "
                          >

                            <strong>
                              Event
                            </strong>

                            <div
                              style="
                                margin-top:5px;
                              "
                            >
                              ${eventTitle}
                            </div>

                          </div>
                        `
                        : ""
                    }


                    ${
                      notification.actionRoute
                        ? `
                          <div
                            style="
                              margin-top:28px;
                            "
                          >

                            <a
                              href="${actionUrl}"
                              style="
                                display:inline-block;
                                padding:13px 20px;
                                border-radius:10px;
                                background:#3157e5;
                                color:#ffffff;
                                text-decoration:none;
                                font-weight:700;
                              "
                            >
                              ${actionLabel}
                            </a>

                          </div>
                        `
                        : ""
                    }


                    <p
                      style="
                        margin:30px 0 0;
                        color:#8a93a5;
                        font-size:12px;
                        line-height:1.6;
                      "
                    >
                      This email was sent because an important
                      action or update occurred on your
                      Evenciaga account.
                    </p>

                  </td>

                </tr>


                <tr>

                  <td
                    style="
                      padding:18px 32px;
                      background:#f8faff;
                      color:#8a93a5;
                      font-size:12px;
                      text-align:center;
                    "
                  >
                    © Evenciaga
                  </td>

                </tr>

              </table>

            </td>

          </tr>

        </table>

      </body>
      </html>
    `;

  };


/*
=========================================================
SEND MAJOR NOTIFICATION EMAIL

TRIGGER:
notifications/{notificationId}

Runs whenever a new notification is created.
=========================================================
*/

exports.sendNotificationEmail =
  onDocumentCreated(
    {
      document:
        "notifications/{notificationId}",

      secrets: [
        RESEND_API_KEY
      ],

      region:
        "asia-south1"
    },

    async (
      event
    ) => {

      const snapshot =
        event.data;


      if (!snapshot) {

        console.log(
          "Notification snapshot missing."
        );

        return;

      }


      const notification =
        snapshot.data();


      const notificationId =
        event.params
          .notificationId;


      const notificationRef =
        snapshot.ref;


      const type =
        String(
          notification.type ||
          ""
        ).toLowerCase();


      console.log(
        "New notification:",
        notificationId,
        type
      );


      /*
      ----------------------------------------------------
      Do not send unless explicitly enabled.
      ----------------------------------------------------
      */

      if (
        notification.emailEnabled !==
        true
      ) {

        console.log(
          "Email not enabled for notification:",
          notificationId
        );

        return;

      }


      /*
      ----------------------------------------------------
      Backend whitelist.
      ----------------------------------------------------
      */

      if (
        !EMAIL_NOTIFICATION_TYPES.has(
          type
        )
      ) {

        console.log(
          "Notification type is not eligible for email:",
          type
        );


        await notificationRef.update({
          emailStatus:
            "not-required",

          emailError:
            FieldValue.delete()
        });


        return;

      }


      /*
      ----------------------------------------------------
      Prevent accidental duplicate send.
      ----------------------------------------------------
      */

      if (
        notification.emailStatus ===
        "sent"
      ) {

        console.log(
          "Email already sent."
        );

        return;

      }


      const recipientId =
        notification.recipientId ||
        notification.volunteerId ||
        notification.organizerId;


      if (!recipientId) {

        console.error(
          "Notification does not contain recipient ID."
        );


        await notificationRef.update({
          emailStatus:
            "failed",

          emailError:
            "Missing recipient ID",

          emailFailedAt:
            FieldValue.serverTimestamp()
        });


        return;

      }


      try {

        /*
        --------------------------------------------------
        LOAD RECIPIENT
        --------------------------------------------------
        */

        const userSnapshot =
          await db
            .collection(
              "users"
            )
            .doc(
              recipientId
            )
            .get();


        if (
          !userSnapshot.exists
        ) {

          throw new Error(
            `User ${recipientId} was not found.`
          );

        }


        const user =
          userSnapshot.data();


        const recipientEmail =
          user.email;


        if (!recipientEmail) {

          throw new Error(
            "Recipient does not have an email address."
          );

        }


        /*
        --------------------------------------------------
        SET PROCESSING
        --------------------------------------------------
        */

        await notificationRef.update({

          emailStatus:
            "processing",

          emailProcessingAt:
            FieldValue.serverTimestamp()

        });


        /*
        --------------------------------------------------
        RESEND
        --------------------------------------------------
        */

        const resend =
          new Resend(
            RESEND_API_KEY.value()
          );


        const subject =
          getEmailSubject(
            notification
          );


        const html =
          buildEmailHtml(
            notification,
            user
          );


        const {
          data,
          error
        } =
          await resend.emails.send({

            /*
            IMPORTANT

            During testing you can use:
            Evenciaga <onboarding@resend.dev>

            For production verify your own domain and use:
            Evenciaga <notifications@yourdomain.com>
            */

            from:
              "Evenciaga <onboarding@resend.dev>",

            to: [
              recipientEmail
            ],

            subject,

            html

          });


        if (error) {

          throw new Error(
            error.message ||
            "Resend email failed."
          );

        }


        /*
        --------------------------------------------------
        SUCCESS
        --------------------------------------------------
        */

        await notificationRef.update({

          emailStatus:
            "sent",

          emailSentAt:
            FieldValue.serverTimestamp(),

          emailRecipient:
            recipientEmail,

          emailProvider:
            "resend",

          emailProviderId:
            data?.id ||
            ""

        });


        console.log(
          "Email sent successfully:",
          recipientEmail
        );

      }

      catch (
        emailError
      ) {

        console.error(
          "Email notification error:",
          emailError
        );


        await notificationRef.update({

          emailStatus:
            "failed",

          emailError:
            String(
              emailError?.message ||
              emailError
            ).slice(
              0,
              1000
            ),

          emailFailedAt:
            FieldValue.serverTimestamp()

        });

      }

    }

  );