import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where
} from "firebase/firestore";
import { db } from "../firebase";
import BackButton from "../components/BackButton";

function UserDetails() {

  const { id } = useParams();

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [joinedEvents, setJoinedEvents] =
    useState(0);

  const [createdEvents, setCreatedEvents] =
    useState(0);

  const [volunteerHours, setVolunteerHours] =
    useState(0);

  const [attendancePercentage, setAttendancePercentage] =
    useState(0);

  const [certificatesEarned, setCertificatesEarned] =
    useState(0);

  const [totalPayments, setTotalPayments] =
    useState(0);

  useEffect(() => {

    const fetchUser =
      async () => {

        try {

          const userRef =
            doc(
              db,
              "users",
              id
            );

          const userSnap =
            await getDoc(userRef);

          if (!userSnap.exists()) {

            setLoading(false);

            return;

          }

          setUser(
            userSnap.data()
          );

          // Joined Events

          const joinedQuery =
            query(
              collection(
                db,
                "joinRequests"
              ),
              where(
                "volunteerId",
                "==",
                id
              ),
              where(
                "status",
                "==",
                "approved"
              )
            );

          const joinedSnapshot =
            await getDocs(
              joinedQuery
            );

          setJoinedEvents(
            joinedSnapshot.size
          );

          // Created Events

          const createdQuery =
            query(
              collection(
                db,
                "events"
              ),
              where(
                "organizerId",
                "==",
                id
              )
            );

          const createdSnapshot =
            await getDocs(
              createdQuery
            );

          setCreatedEvents(
            createdSnapshot.size
          );

          // Certificates

          const certificateQuery =
            query(
              collection(
                db,
                "certificates"
              ),
              where(
                "volunteerId",
                "==",
                id
              )
            );

          const certificateSnapshot =
            await getDocs(
              certificateQuery
            );

          setCertificatesEarned(
            certificateSnapshot.size
          );

          let hours = 0;

          certificateSnapshot.forEach(
            (doc) => {

              hours +=
                Number(
                  doc.data().hours || 0
                );

            }
          );

          setVolunteerHours(
            hours
          );

          // Attendance

          const attendanceQuery =
            query(
              collection(
                db,
                "attendance"
              ),
              where(
                "volunteerId",
                "==",
                id
              )
            );

          const attendanceSnapshot =
            await getDocs(
              attendanceQuery
            );

          let present = 0;

          attendanceSnapshot.forEach(
            (doc) => {

              if (
                doc.data().status ===
                "present"
              ) {

                present++;

              }

            }
          );

          const percentage =
            attendanceSnapshot.size === 0
              ? 0
              : Math.round(
                  (
                    present /
                    attendanceSnapshot.size
                  ) * 100
                );

          setAttendancePercentage(
            percentage
          );

          // Total Payments

          let paymentTotal = 0;

          for (const paymentDoc of joinedSnapshot.docs) {

            const payment =
              paymentDoc.data();

            if (
              payment.paymentStatus ===
              "paid"
            ) {

              const eventRef =
                doc(
                  db,
                  "events",
                  payment.eventId
                );

              const eventSnap =
                await getDoc(
                  eventRef
                );

              if (
                eventSnap.exists()
              ) {

                paymentTotal +=
                  Number(
                    eventSnap.data().paymentPerPerson || 0
                  );

              }

            }

          }

          setTotalPayments(
            paymentTotal
          );

        } catch (error) {

          console.log(error);

        } finally {

          setLoading(false);

        }

      };

    fetchUser();

  }, [id]);

  if (loading) {

    return (
      <h2>
        Loading...
      </h2>
    );

  }

  if (!user) {

    return (
      <h2>
        User Not Found
      </h2>
    );

  }

  return (

    <div
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        padding: "30px",
        border: "1px solid #ddd",
        borderRadius: "10px"
      }}
    >
      <BackButton />

      <h1>
        👤 User Details
      </h1>

      <hr />

      <p>
        <strong>Name:</strong> {user.name}
      </p>

      <p>
        <strong>Email:</strong> {user.email}
      </p>

      <p>
        <strong>Phone:</strong> {user.phone}
      </p>

      <p>
        <strong>College:</strong> {user.college}
      </p>

      <p>
        <strong>Skills:</strong> {user.skills}
      </p>

      <p>
        <strong>Role:</strong> {user.role || "volunteer"}
      </p>

      <p>
        <strong>Rating:</strong> {user.rating || 0}
      </p>

      <hr />

      <p>
        <strong>📅 Total Joined Events:</strong> {joinedEvents}
      </p>

      <p>
        <strong>🏢 Total Created Events:</strong> {createdEvents}
      </p>

      <p>
        <strong>🏆 Certificates Earned:</strong> {certificatesEarned}
      </p>

      <p>
        <strong>⏱ Volunteer Hours:</strong> {volunteerHours}
      </p>

      <p>
        <strong>📊 Attendance:</strong> {attendancePercentage}%
      </p>

      <p>
        <strong>💰 Total Payments:</strong> ₹{totalPayments}
      </p>

    </div>

  );

}

export default UserDetails;