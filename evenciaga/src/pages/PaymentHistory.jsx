import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
} from "firebase/firestore";

import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

function PaymentHistory() {

  const [payments, setPayments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

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

        const requestsQuery =
          query(
            collection(
              db,
              "joinRequests"
            ),
            where(
              "volunteerId",
              "==",
              currentUser.uid
            ),
            where(
              "status",
              "==",
              "approved"
            )
          );

        const querySnapshot =
          await getDocs(
            requestsQuery
          );

        const paymentList = [];

        for (
          const requestDoc
          of querySnapshot.docs
        ) {

          const request =
            requestDoc.data();

          const eventRef =
            doc(
              db,
              "events",
              request.eventId
            );

          const eventSnap =
            await getDoc(
              eventRef
            );

          if (!eventSnap.exists()) {

            continue;

          }

          const event =
            eventSnap.data();

          if (
            event.eventType !==
            "paid"
          ) {

            continue;

          }

          paymentList.push({

            id:
              requestDoc.id,

            eventTitle:
              event.title,

            eventDate:
              event.date,

            location:
              event.location,

            amount:
              Number(
                event.paymentPerPerson ||
                0
              ),

            status:
              request.paymentStatus ||
              "pending",

            paymentDate:
              request.paymentDate

          });

        }

        paymentList.sort(
          (first, second) => {

            const firstDate =
              first.paymentDate
                ?.toMillis?.() || 0;

            const secondDate =
              second.paymentDate
                ?.toMillis?.() || 0;

            return secondDate - firstDate;

          }
        );

        setPayments(
          paymentList
        );

      } catch (error) {

        console.log(error);

        alert(
          "Failed to load payment history."
        );

      } finally {

        setLoading(false);

      }

    };

  const totalPaid =
    payments
      .filter(
        (payment) =>
          payment.status === "paid"
      )
      .reduce(
        (total, payment) =>
          total +
          Number(
            payment.amount || 0
          ),
        0
      );

  const pendingAmount =
    payments
      .filter(
        (payment) =>
          payment.status !== "paid"
      )
      .reduce(
        (total, payment) =>
          total +
          Number(
            payment.amount || 0
          ),
        0
      );

  if (loading) {

    return (

      <div className="page-container">

        <BackButton />

        <div className="page-card empty-state">

          <div className="empty-icon">
            ⏳
          </div>

          <h2>
            Loading Payment History
          </h2>

          <p>
            Please wait while your payment records are loaded.
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
            Volunteer Portal
          </p>

          <h1 className="page-title">
            Payment History
          </h1>

          <p className="page-subtitle">
            Track completed and pending payments from paid events.
          </p>

        </div>

        <div className="organizer-status approved">
          💰 {payments.length} Records
        </div>

      </div>

      <div className="dashboard-stats-grid">

        <div className="stat-card">

          <div className="stat-icon">
            ✅
          </div>

          <div>

            <p>
              Total Paid
            </p>

            <h2>
              ₹{totalPaid}
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

      </div>

      {
        payments.length === 0 ? (

          <div className="page-card empty-state">

            <div className="empty-icon">
              💰
            </div>

            <h2>
              No Payment Records
            </h2>

            <p>
              Payment information from paid events will appear here.
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
                          payment.status ===
                          "paid"
                            ? "status-active"
                            : "event-type-badge certificate"
                        }
                      >
                        {
                          payment.status ===
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
                        ₹{payment.amount}
                      </strong>

                    </div>

                    <div className="event-meta-grid">

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
                              payment.location ||
                              "Not available"
                            }
                          </strong>

                        </div>

                      </div>

                    </div>

                    <div className="payment-footer">

                      {
                        payment.paymentDate ? (

                          <span>
                            Paid on{" "}
                            {
                              payment
                                .paymentDate
                                .toDate()
                                .toLocaleDateString()
                            }
                          </span>

                        ) : (

                          <span>
                            Waiting for organizer confirmation
                          </span>

                        )
                      }

                    </div>

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

export default PaymentHistory;