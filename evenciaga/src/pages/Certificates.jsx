import { useEffect, useState } from "react";

import {
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

function Certificates() {

  const navigate = useNavigate();

  const [certificates, setCertificates] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    fetchCertificates();

  }, []);

  const fetchCertificates =
    async () => {

      try {

        const currentUser =
          auth.currentUser;

        if (!currentUser) {

          setLoading(false);

          return;

        }

        const certificatesQuery =
          query(
            collection(
              db,
              "certificates"
            ),
            where(
              "volunteerId",
              "==",
              currentUser.uid
            )
          );

        const snapshot =
          await getDocs(
            certificatesQuery
          );

        const data =
          snapshot.docs.map(
            (document) => ({
              id: document.id,
              ...document.data()
            })
          );

        data.sort((first, second) => {

          const firstDate =
            first.issuedDate
              ?.toMillis?.() || 0;

          const secondDate =
            second.issuedDate
              ?.toMillis?.() || 0;

          return secondDate - firstDate;

        });

        setCertificates(data);

      } catch (error) {

        console.log(error);

        alert(
          "Failed to load certificates."
        );

      } finally {

        setLoading(false);

      }

    };

  if (loading) {

    return (

      <div className="page-container">

        <BackButton />

        <div className="page-card empty-state">

          <div className="empty-icon">
            ⏳
          </div>

          <h2>
            Loading Certificates
          </h2>

          <p>
            Please wait while your certificates are loaded.
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
            My Certificates
          </h1>

          <p className="page-subtitle">
            View certificates earned from completed volunteer events.
          </p>

        </div>

        <div className="organizer-status approved">
          🏆 {certificates.length} Certificates
        </div>

      </div>

      {
        certificates.length === 0 ? (

          <div className="page-card empty-state">

            <div className="empty-icon">
              🏆
            </div>

            <h2>
              No Certificates Yet
            </h2>

            <p>
              Certificates will appear here after you attend and complete eligible events.
            </p>

          </div>

        ) : (

          <div className="certificates-grid">

            {
              certificates.map(
                (certificate) => (

                  <div
                    key={certificate.id}
                    className="certificate-card"
                  >

                    <div className="certificate-card-top">

                      <div className="certificate-icon">
                        🏆
                      </div>

                      <span
                        className={
                          certificate.status ===
                          "issued"
                            ? "status-active"
                            : "event-type-badge volunteer"
                        }
                      >
                        {
                          certificate.status ||
                          "Issued"
                        }
                      </span>

                    </div>

                    <div>

                      <p className="dashboard-eyebrow">
                        Event Certificate
                      </p>

                      <h2 className="event-title">
                        {
                          certificate.eventTitle ||
                          "Event Certificate"
                        }
                      </h2>

                      <p className="event-description">
                        Awarded to{" "}
                        <strong>
                          {
                            certificate.volunteerName ||
                            "Volunteer"
                          }
                        </strong>
                      </p>

                    </div>

                    <div className="certificate-details">

                      <div>

                        <small>
                          Certificate Number
                        </small>

                        <strong>
                          {
                            certificate.certificateNumber ||
                            "Not available"
                          }
                        </strong>

                      </div>

                      <div>

                        <small>
                          Volunteer Hours
                        </small>

                        <strong>
                          {
                            certificate.hours ||
                            0
                          } hours
                        </strong>

                      </div>

                      <div>

                        <small>
                          Event Date
                        </small>

                        <strong>
                          {
                            certificate.eventDate ||
                            "Not available"
                          }
                        </strong>

                      </div>

                      <div>

                        <small>
                          Location
                        </small>

                        <strong>
                          {
                            certificate.location ||
                            "Not available"
                          }
                        </strong>

                      </div>

                    </div>

                    {
                      certificate.issuedDate && (

                        <p className="certificate-issued-date">

                          Issued on{" "}
                          {
                            certificate
                              .issuedDate
                              .toDate()
                              .toLocaleDateString()
                          }

                        </p>

                      )
                    }

                    <button
                      className="primary-action-button certificate-view-button"
                      onClick={() =>
                        navigate(
                          `/certificate/${certificate.id}`
                        )
                      }
                    >
                      View Certificate
                    </button>

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

export default Certificates;