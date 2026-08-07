import { useEffect, useState } from "react";

import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "firebase/firestore";

import { db } from "../firebase";
import BackButton from "../components/BackButton";

function Reports() {

  const [reports, setReports] =
    useState([]);

  useEffect(() => {

    fetchReports();

  }, []);

  const fetchReports =
    async () => {

      const snapshot =
        await getDocs(
          collection(
            db,
            "reports"
          )
        );

      const data =
        snapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data()
          })
        );

      setReports(data);

    };

  const resolveReport =
    async (id) => {

      await updateDoc(
        doc(
          db,
          "reports",
          id
        ),
        {
          status: "resolved"
        }
      );

      fetchReports();

    };

  const deleteReport =
    async (id) => {

      if (
        !window.confirm(
          "Delete this report?"
        )
      ) return;

      await deleteDoc(
        doc(
          db,
          "reports",
          id
        )
      );

      fetchReports();

    };

  return (

    <div
      style={{
        maxWidth: "1000px",
        margin: "30px auto",
        padding: "20px"
      }}
    >

      <BackButton />

      <h1>
        🚩 Reports
      </h1>

      {

        reports.length === 0 ? (

          <p>
            No Reports Found
          </p>

        ) : (

          reports.map(
            (report) => (

              <div
                key={report.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "10px",
                  padding: "20px",
                  marginBottom: "15px"
                }}
              >

                <h3>
                  {report.eventTitle}
                </h3>
                <p>
  <strong>
    Reported By:
  </strong>{" "}
  {report.reportedByName}
</p>

<p>
  <strong>
    Email:
  </strong>{" "}
  {report.reportedByEmail}
</p>

                <p>
                  <strong>Reason:</strong>
                  {" "}
                  {report.reason}
                </p>

                <p>
                  <strong>Description:</strong>
                  {" "}
                  {report.description}
                </p>

                <p
  style={{
    color:
      report.status === "resolved"
        ? "green"
        : "red",
    fontWeight: "bold"
  }}
>
  Status: {report.status}
</p>
                <p>
  <strong>
    Date:
  </strong>{" "}
  {report.createdAt?.toDate().toLocaleString()}
</p>

                <button
                  onClick={() =>
                    resolveReport(
                      report.id
                    )
                  }
                >
                  ✅ Resolve
                </button>

                <button
                  onClick={() =>
                    deleteReport(
                      report.id
                    )
                  }
                  style={{
                    marginLeft: "10px"
                  }}
                >
                  🗑 Delete
                </button>

              </div>

            )
          )

        )

      }

    </div>

  );

}

export default Reports;