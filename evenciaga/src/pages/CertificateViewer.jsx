import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import BackButton from "../components/BackButton";

function CertificateViewer() {

  const { id } = useParams();

  const [certificate, setCertificate] =
    useState(null);

  const certificateRef =
    useRef(null);

  useEffect(() => {

    fetchCertificate();

  }, []);

  const fetchCertificate =
    async () => {

      try {

        const docRef =
          doc(
            db,
            "certificates",
            id
          );

        const docSnap =
          await getDoc(docRef);

        if (
          docSnap.exists()
        ) {

          setCertificate(
            docSnap.data()
          );

        }

      } catch (error) {

        console.log(error);

      }

    };

  const downloadPDF =
    async () => {

      const canvas =
        await html2canvas(
          certificateRef.current
        );

      const image =
        canvas.toDataURL(
          "image/png"
        );

      const pdf =
        new jsPDF(
          "landscape",
          "px",
          [
            canvas.width,
            canvas.height
          ]
        );

      pdf.addImage(
        image,
        "PNG",
        0,
        0,
        canvas.width,
        canvas.height
      );

      pdf.save(
        `${certificate.eventTitle}-Certificate.pdf`
      );

    };

  if (!certificate) {

    return (
      <h2>
        Loading...
      </h2>
    );

  }

  return (

    <>

      <div
        ref={certificateRef}
        style={{
          maxWidth: "900px",
          margin: "40px auto",
          padding: "40px",
          border: "5px solid black",
          borderRadius: "15px",
          textAlign: "center",
          background: "white"
        }}
      >
          <BackButton/>
        <h1>
          🏆 EVENCIAGA
        </h1>

        <h2>
          Certificate of Appreciation
        </h2>

        <br />

        <p>
          This certificate is proudly presented to
        </p>

        <h1>
          {certificate.volunteerName}
        </h1>

        <p>
          For successfully volunteering at
        </p>

        <h2>
          {certificate.eventTitle}
        </h2>

        <br />

        <p>
          📅 Event Date :
          {" "}
          {certificate.eventDate}
        </p>

        <p>
          ⏰ Hours :
          {" "}
          {certificate.hours}
        </p>

        <p>
          📍 Location :
          {" "}
          {certificate.location}
        </p>

        <p>
          Certificate No :
          {" "}
          {certificate.certificateNumber}
        </p>

        <p>
          Status :
          {" "}
          {certificate.status}
        </p>

        <br />

        <h3>
          EVENCIAGA
        </h3>

      </div>

      <div
        style={{
          textAlign: "center",
          marginBottom: "40px"
        }}
      >

        <button
          onClick={downloadPDF}
          style={{
            padding: "12px 25px",
            fontSize: "16px",
            cursor: "pointer"
          }}
        >
          📄 Download PDF
        </button>

      </div>

    </>

  );

}

export default CertificateViewer;