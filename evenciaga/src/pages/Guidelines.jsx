import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Guidelines() {
  const [accepted, setAccepted] = useState(false);

  const navigate = useNavigate();

  const handleContinue = () => {
    if (!accepted) {
      return;
    }

    navigate("/profile-setup");
  };

  const guidelineSections = [
    {
      icon: "🤝",
      title: "Professional Behaviour",
      items: [
        "Arrive on time and report to the assigned organizer.",
        "Respect organizers, volunteers, participants, and venue staff.",
        "Complete assigned responsibilities honestly and carefully.",
        "Use respectful and professional communication.",
      ],
    },
    {
      icon: "✅",
      title: "Responsibility",
      items: [
        "Do not claim attendance or volunteer hours you did not complete.",
        "Inform the organizer early if you cannot attend.",
        "Follow the assigned role and event instructions.",
        "Repeated misconduct may lead to account restrictions.",
      ],
    },
    {
      icon: "🛡️",
      title: "Safety",
      items: [
        "Follow venue rules and organizer safety instructions.",
        "Do not perform unsafe work without proper training.",
        "Report accidents, hazards, or emergencies immediately.",
        "Request help when a task is beyond your ability.",
      ],
    },
    {
      icon: "🔒",
      title: "Privacy",
      items: [
        "Do not misuse participant, volunteer, or organizer information.",
        "Do not share private contact details without permission.",
        "Do not upload event photos containing sensitive information without approval.",
      ],
    },
    {
      icon: "📅",
      title: "Attendance",
      items: [
        "Check in and check out according to the event process.",
        "Leaving early may require organizer approval.",
        "Missed checkouts may require manual verification.",
        "Only verified participation will count toward hours and certificates.",
      ],
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "36px 16px",
        background:
          "linear-gradient(135deg, #eef4ff 0%, #f8fafc 55%, #eefbf5 100%)",
      }}
    >
      <div
        style={{
          width: "min(900px, 100%)",
          margin: "0 auto",
        }}
      >
        <section
          style={{
            padding: "32px",
            marginBottom: "22px",
            borderRadius: "20px",
            background: "#ffffff",
            boxShadow: "0 12px 36px rgba(15, 23, 42, 0.08)",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "#2563eb",
              fontSize: "13px",
              fontWeight: "800",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            Before you continue
          </p>

          <h1
            style={{
              margin: "0 0 12px",
              color: "#111827",
              fontSize: "36px",
            }}
          >
            Volunteer Guidelines
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: "700px",
              color: "#6b7280",
              fontSize: "16px",
              lineHeight: "1.7",
            }}
          >
            These guidelines protect volunteers, organizers, and
            participants. Read them carefully before creating your profile.
          </p>
        </section>

        <div
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          {guidelineSections.map((section) => (
            <section
              key={section.title}
              style={{
                padding: "24px",
                borderRadius: "16px",
                background: "#ffffff",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "14px",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: "#eff6ff",
                    fontSize: "22px",
                  }}
                >
                  {section.icon}
                </span>

                <h2
                  style={{
                    margin: 0,
                    color: "#111827",
                    fontSize: "21px",
                  }}
                >
                  {section.title}
                </h2>
              </div>

              <ul
                style={{
                  margin: 0,
                  paddingLeft: "22px",
                  color: "#4b5563",
                  lineHeight: "1.8",
                }}
              >
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section
          style={{
            marginTop: "22px",
            padding: "24px",
            borderRadius: "16px",
            background: "#ffffff",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.07)",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              cursor: "pointer",
              color: "#374151",
              lineHeight: "1.6",
            }}
          >
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) =>
                setAccepted(event.target.checked)
              }
              style={{
                width: "19px",
                height: "19px",
                marginTop: "3px",
                cursor: "pointer",
              }}
            />

            <span>
              I have read and understood the volunteer guidelines. I agree
              to follow the event rules, attendance process, safety
              instructions, and privacy requirements.
            </span>
          </label>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!accepted}
            style={{
              width: "100%",
              marginTop: "20px",
              padding: "13px 20px",
              border: "none",
              borderRadius: "10px",
              background: accepted ? "#2563eb" : "#cbd5e1",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "800",
              cursor: accepted ? "pointer" : "not-allowed",
            }}
          >
            Continue to Profile Setup →
          </button>
        </section>
      </div>
    </div>
  );
}

export default Guidelines;