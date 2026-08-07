import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc
} from "firebase/firestore";

import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

function PaymentManagement() {

  const [payments, setPayments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [testingBackend, setTestingBackend] =
    useState(false);

  const [processingId, setProcessingId] =
    useState("");

  useEffect(() => {

    fetchPayments();

  }, []);

  const fetchPayments =
    async () => {

      try {

        const currentUser =
          auth.currentUser;

        if (!currentUser) {

          setLoading(false);

          return;

        }

        const eventsQuery =
          query(
            collection(
              db,
              "events"
            ),
            where(
              "organizerId",
              "==",
              currentUser.uid
            ),
            where(
              "eventType",
              "==",
              "paid"
            )
          );

        const eventsSnapshot =
          await getDocs(
            eventsQuery
          );

        const paymentList = [];

        for (
          const eventDocument
          of eventsSnapshot.docs
        ) {

          const event = {
            id:
              eventDocument.id,

            ...eventDocument.data()
          };

          const requestsQuery =
            query(
              collection(
                db,
                "joinRequests"
              ),
              where(
                "eventId",
                "==",
                event.id
              ),
              where(
                "status",
                "==",
                "approved"
              )
            );

          const requestsSnapshot =
            await getDocs(
              requestsQuery
            );

          requestsSnapshot.forEach(
            (requestDocument) => {

              paymentList.push({

                id:
                  requestDocument.id,

                ...requestDocument.data(),

                eventId:
                  event.id,

                eventTitle:
                  event.title,

                eventDate:
                  event.date,

                eventLocation:
                  event.location,

                paymentAmount:
                  Number(
                    event.paymentPerPerson ||
                    0
                  )

              });

            }
          );

        }

        setPayments(
          paymentList
        );

      } catch (error) {

        console.log(error);

        alert(
          "Failed to load payment records."
        );

      } finally {

        setLoading(false);

      }

    };

  const testBackendAuthentication =
    async () => {

      try {

        setTestingBackend(true);

        const currentUser =
          auth.currentUser;

        if (!currentUser) {

          alert(
            "Please log in first."
          );

          return;

        }

        const idToken =
          await currentUser.getIdToken();

        const response =
          await fetch(
            "http://localhost:5000/api/me",
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${idToken}`
              }
            }
          );

        const result =
          await response.json();

        console.log(
          "Backend response:",
          result
        );

        if (!response.ok) {

          throw new Error(
            result.message ||
            "Backend authentication failed."
          );

        }

        alert(
          `Backend verified: ${result.user.email}`
        );

      } catch (error) {

        console.log(error);

        alert(
          error.message ||
          "Backend connection failed."
        );

      } finally {

        setTestingBackend(false);

      }

    };

  const markAsPaid =
    async (payment) => {

      if (
        payment.paymentStatus ===
        "paid"
      ) {

        alert(
          "This payment has already been confirmed."
        );

        return;

      }

      const confirmPayment =
        window.confirm(
          `Confirm manual payment of ₹${payment.paymentAmount} to ${payment.volunteerName}?`
        );

      if (!confirmPayment) {

        return;

      }

      try {

        setProcessingId(
          payment.id
        );

        await updateDoc(
          doc(
            db,
            "joinRequests",
            payment.id
          ),
          {
            paymentStatus:
              "paid",

            paymentDate:
              serverTimestamp(),

            paymentMode:
              "manual"
          }
        );

        await addDoc(
          collection(
            db,
            "notifications"
          ),
          {
            volunteerId:
              payment.volunteerId,

            eventId:
              payment.eventId,

            title:
              "Payment Received",

            message:
              `You received ₹${payment.paymentAmount} for "${payment.eventTitle}".`,

            type:
              "payment",

            isRead:
              false,

            createdAt:
              serverTimestamp()
          }
        );

        alert(
          "Manual payment confirmed successfully."
        );

        await fetchPayments();

      } catch (error) {

        console.log(error);

        alert(
          "Failed to confirm payment."
        );

      } finally {

        setProcessingId("");

      }

    };

  const totalAmount =
    payments.reduce(
      (total, payment) =>
        total +
        Number(
          payment.paymentAmount ||
          0
        ),
      0
    );

  const paidAmount =
    payments
      .filter(
        (payment) =>
          payment.paymentStatus ===
          "paid"
      )
      .reduce(
        (total, payment) =>
          total +
          Number(
            payment.paymentAmount ||
            0
          ),
        0
      );

  const pendingAmount =
    totalAmount -
    paidAmount;

  if (loading) {

    return (

      <div className="page-container">

        <BackButton />

        <div className="page-card empty-state">

          <div className="empty-icon">
            ⏳
          </div>

          <h2>
            Loading Payments
          </h2>

          <p>
            Please wait while payment records are loaded.
          </p>

        </div>

      </div>

    );

  }

  return (

    <div className="page-container">

      <BackButton />

      <div className="page-card organizer-hero">

        <div>

          <p className="dashboard-eyebrow">
            Organizer Panel
          </p>

          <h1 className="page-title">
            Payment Management
          </h1>

          <p className="page-subtitle">
            Review paid-event volunteers and confirm completed payouts.
          </p>

        </div>

        <div className="organizer-status approved">
          💰 {payments.length} Records
        </div>

      </div>

      <div className="backend-test-card page-card">

        <div>

          <h3>
            Backend Connection
          </h3>

          <p>
            Verify that the Express backend can authenticate the current Firebase user.
          </p>

        </div>

        <button
          className="primary-action-button"
          onClick={
            testBackendAuthentication
          }
          disabled={
            testingBackend
          }
        >
          {
            testingBackend
              ? "Testing..."
              : "Test Backend Connection"
          }
        </button>

      </div>

      <div className="dashboard-stats-grid">

        <div className="stat-card">

          <div className="stat-icon">
            📄
          </div>

          <div>

            <p>
              Payment Records
            </p>

            <h2>
              {payments.length}
            </h2>

          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon">
            ✅
          </div>

          <div>

            <p>
              Paid Amount
            </p>

            <h2>
              ₹{paidAmount}
            </h2>

          </div>

        </div>

        <div className="stat-card">

          <div className="stat-icon">
            🕒
          </div>

          <div>

            <p>
              Pending Amount
            </p>

            <h2>
              ₹{pendingAmount}
            </h2>

          </div>

        </div>

      </div>

      {
        payments.length === 0 ? (

          <div className="page-card empty-state">

            <div className="empty-icon">
              💰
            </div>

            <h2>
              No Paid Volunteers
            </h2>

            <p>
              Approved volunteers from paid events will appear here.
            </p>

          </div>

        ) : (

          <div className="payments-grid">

            {
              payments.map(
                (payment) => (

                  <div
                    key={payment.id}
                    className="payment-card"
                  >

                    <div className="payment-card-header">

                      <div>

                        <p className="dashboard-eyebrow">
                          Paid Event
                        </p>

                        <h2 className="event-title">
                          {
                            payment.eventTitle ||
                            "Paid Event"
                          }
                        </h2>

                      </div>

                      <span
                        className={
                          payment.paymentStatus ===
                          "paid"
                            ? "status-active"
                            : "event-type-badge certificate"
                        }
                      >
                        {
                          payment.paymentStatus ===
                          "paid"
                            ? "Paid"
                            : "Pending"
                        }
                      </span>

                    </div>

                    <div className="payment-amount">

                      <small>
                        Payment Amount
                      </small>

                      <strong>
                        ₹
                        {
                          payment.paymentAmount
                        }
                      </strong>

                    </div>

                    <div className="event-meta-grid">

                      <div className="event-meta-item">

                        <span className="event-meta-icon">
                          👤
                        </span>

                        <div>

                          <small>
                            Volunteer
                          </small>

                          <strong>
                            {
                              payment.volunteerName ||
                              "Volunteer"
                            }
                          </strong>

                        </div>

                      </div>

                      <div className="event-meta-item">

                        <span className="event-meta-icon">
                          🛠
                        </span>

                        <div>

                          <small>
                            Skills
                          </small>

                          <strong>
                            {
                              payment.skills ||
                              "Not provided"
                            }
                          </strong>

                        </div>

                      </div>

                      <div className="event-meta-item">

                        <span className="event-meta-icon">
                          📅
                        </span>

                        <div>

                          <small>
                            Event Date
                          </small>

                          <strong>
                            {
                              payment.eventDate ||
                              "Not available"
                            }
                          </strong>

                        </div>

                      </div>

                      <div className="event-meta-item">

                        <span className="event-meta-icon">
                          📍
                        </span>

                        <div>

                          <small>
                            Location
                          </small>

                          <strong>
                            {
                              payment.eventLocation ||
                              "Not available"
                            }
                          </strong>

                        </div>

                      </div>

                    </div>

                    {
                      payment.paymentDate && (

                        <p className="payment-footer">

                          Confirmed on{" "}

                          {
                            payment
                              .paymentDate
                              .toDate()
                              .toLocaleString()
                          }

                        </p>

                      )
                    }

                    {
                      payment.paymentStatus !==
                      "paid" && (

                        <button
                          className="primary-action-button"
                          onClick={() =>
                            markAsPaid(
                              payment
                            )
                          }
                          disabled={
                            processingId ===
                            payment.id
                          }
                        >
                          {
                            processingId ===
                            payment.id
                              ? "Confirming..."
                              : "Confirm Manual Payment"
                          }
                        </button>

                      )
                    }

                  </div>

                )
              )
            }

          </div>

        )
      }

    </div>

  );

}

export default PaymentManagement;