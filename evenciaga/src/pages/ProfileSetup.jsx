import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { auth } from "../firebase";
import { saveUserProfile } from "../services/userService";

function ProfileSetup() {
  const navigate = useNavigate();

  const currentUser = auth.currentUser;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState("");
  const [graduationYear, setGraduationYear] =
    useState("");

  const [bio, setBio] = useState("");

  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [interests, setInterests] = useState("");

  const [availability, setAvailability] = useState("");
  const [preferredRoles, setPreferredRoles] =
    useState("");
  const [
    preferredEventTypes,
    setPreferredEventTypes,
  ] = useState("");

  const [linkedin, setLinkedin] = useState("");

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const ADMIN_EMAILS = [
    "evenciaga.admin@gmail.com",
  ];

  const convertToArray = (value) =>
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Profile image must be smaller than 5 MB."
      );

      event.target.value = "";
      return;
    }

    setError("");
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadProfileImage = async () => {
    if (!selectedImage) {
      return "";
    }

    const formData = new FormData();

    formData.append("file", selectedImage);

    formData.append(
      "upload_preset",
      "evenciaga_profiles"
    );

    const response = await fetch(
      "https://api.cloudinary.com/v1_1/nog0odxe/image/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const uploadData = await response.json();

    if (!response.ok) {
      throw new Error(
        uploadData?.error?.message ||
          "Profile photo upload failed."
      );
    }

    return uploadData.secure_url || "";
  };

  const handleSave = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!currentUser) {
      setError(
        "Your login session was not found. Please log in again."
      );

      return;
    }

    if (
      !name.trim() ||
      !phone.trim() ||
      !age ||
      !city.trim() ||
      !college.trim() ||
      !skills.trim()
    ) {
      setError(
        "Please complete all required fields."
      );

      return;
    }

    if (
      Number(age) < 14 ||
      Number(age) > 100
    ) {
      setError("Please enter a valid age.");
      return;
    }

    if (
      graduationYear &&
      (Number(graduationYear) < 1950 ||
        Number(graduationYear) > 2100)
    ) {
      setError(
        "Please enter a valid graduation year."
      );

      return;
    }

    if (
      linkedin &&
      !linkedin.startsWith("http://") &&
      !linkedin.startsWith("https://")
    ) {
      setError(
        "LinkedIn URL must begin with http:// or https://"
      );

      return;
    }

    try {
      setLoading(true);

      setMessage(
        selectedImage
          ? "Uploading profile photo..."
          : "Saving profile..."
      );

      const photoURL =
        await uploadProfileImage();

      setMessage("Saving profile details...");

      const role = ADMIN_EMAILS.includes(
        currentUser.email
      )
        ? "admin"
        : "volunteer";

      const userData = {
        uid: currentUser.uid,

        role,

        name: name.trim(),

        email: currentUser.email,

        phone: phone.trim(),

        age: Number(age),

        city: city.trim(),

        state: state.trim(),

        college: college.trim(),

        degree: degree.trim(),

        graduationYear: graduationYear
          ? Number(graduationYear)
          : "",

        bio: bio.trim(),

        linkedin: linkedin.trim(),

        photoURL,

        skills: convertToArray(skills),

        interests: convertToArray(interests),

        languages: convertToArray(languages),

        availability:
          convertToArray(availability),

        preferredRoles:
          convertToArray(preferredRoles),

        preferredEventTypes:
          convertToArray(preferredEventTypes),

        acceptedGuidelines: true,

        accountStatus: "active",

        totalEventsJoined: 0,

        totalEventsCreated: 0,

        volunteerHours: 0,

        attendancePercentage: 0,

        eventsCompleted: 0,

        certificatesEarned: 0,

        rating: 0,
      };

      await saveUserProfile(userData);

      setMessage(
        "Profile saved successfully."
      );

      if (role === "admin") {
        navigate("/admin-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (saveError) {
      console.error(
        "Profile setup error:",
        saveError
      );

      setError(
        saveError?.message ||
          "Unable to save your profile."
      );

      setMessage("");
    } finally {
      setLoading(false);
    }
  };

  const pageStyle = {
    minHeight: "100vh",

    padding: "36px 16px",

    background:
      "linear-gradient(135deg, #eef4ff 0%, #f8fafc 55%, #eefbf5 100%)",
  };

  const containerStyle = {
    width: "min(950px, 100%)",

    margin: "0 auto",
  };

  const cardStyle = {
    padding: "32px",

    borderRadius: "20px",

    background: "#ffffff",

    boxShadow:
      "0 12px 36px rgba(15, 23, 42, 0.09)",
  };

  const sectionStyle = {
    marginBottom: "28px",

    paddingBottom: "26px",

    borderBottom: "1px solid #e5e7eb",
  };

  const gridStyle = {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",

    gap: "16px",
  };

  const fieldStyle = {
    display: "flex",

    flexDirection: "column",

    gap: "7px",
  };

  const labelStyle = {
    color: "#374151",

    fontSize: "14px",

    fontWeight: "700",
  };

  const inputStyle = {
    width: "100%",

    boxSizing: "border-box",

    padding: "12px 13px",

    border: "1px solid #d1d5db",

    borderRadius: "9px",

    background: "#ffffff",

    color: "#111827",

    fontSize: "15px",

    outline: "none",
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <section
          style={{
            ...cardStyle,

            marginBottom: "22px",

            background:
              "linear-gradient(135deg, #1d4ed8, #2563eb)",
          }}
        >
          <p
            style={{
              margin: "0 0 7px",

              color: "#bfdbfe",

              fontSize: "13px",

              fontWeight: "800",

              letterSpacing: "1px",

              textTransform: "uppercase",
            }}
          >
            Complete your account
          </p>

          <h1
            style={{
              margin: "0 0 10px",

              color: "#ffffff",

              fontSize: "36px",
            }}
          >
            Create Your Volunteer Profile
          </h1>

          <p
            style={{
              margin: 0,

              maxWidth: "720px",

              color: "#dbeafe",

              lineHeight: "1.7",
            }}
          >
            Your profile helps organizers understand
            your skills, experience, availability, and
            preferred volunteer roles.
          </p>
        </section>

        <div style={cardStyle}>
          <form onSubmit={handleSave}>
            <section style={sectionStyle}>
              <h2>Profile Photo</h2>

              <div
                style={{
                  display: "flex",

                  alignItems: "center",

                  flexWrap: "wrap",

                  gap: "20px",
                }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile preview"
                    style={{
                      width: "110px",

                      height: "110px",

                      borderRadius: "50%",

                      objectFit: "cover",

                      border: "4px solid #dbeafe",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "110px",

                      height: "110px",

                      display: "flex",

                      alignItems: "center",

                      justifyContent: "center",

                      borderRadius: "50%",

                      background: "#2563eb",

                      color: "#ffffff",

                      fontSize: "40px",

                      fontWeight: "800",
                    }}
                  >
                    {name
                      ?.charAt(0)
                      ?.toUpperCase() || "V"}
                  </div>
                )}

                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />

                  <p
                    style={{
                      margin: "9px 0 0",

                      color: "#6b7280",

                      fontSize: "13px",
                    }}
                  >
                    JPG, PNG or WEBP. Maximum 5 MB.
                  </p>
                </div>
              </div>
            </section>

            <section style={sectionStyle}>
              <h2>Personal Information</h2>

              <div style={gridStyle}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>
                    Full Name *
                  </span>

                  <input
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder="Enter your full name"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>
                    Phone Number *
                  </span>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    placeholder="Enter phone number"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>
                    Age *
                  </span>

                  <input
                    type="number"
                    min="14"
                    max="100"
                    value={age}
                    onChange={(event) =>
                      setAge(event.target.value)
                    }
                    placeholder="Enter age"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>
                    City *
                  </span>

                  <input
                    type="text"
                    value={city}
                    onChange={(event) =>
                      setCity(event.target.value)
                    }
                    placeholder="Enter city"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>
                    State
                  </span>

                  <input
                    type="text"
                    value={state}
                    onChange={(event) =>
                      setState(event.target.value)
                    }
                    placeholder="Enter state"
                    style={inputStyle}
                  />
                </label>
              </div>
            </section>

            <section style={sectionStyle}>
              <h2>Education</h2>

              <div style={gridStyle}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>
                    College / Organization *
                  </span>

                  <input
                    type="text"
                    value={college}
                    onChange={(event) =>
                      setCollege(event.target.value)
                    }
                    placeholder="College or organization"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>
                    Degree
                  </span>

                  <input
                    type="text"
                    value={degree}
                    onChange={(event) =>
                      setDegree(event.target.value)
                    }
                    placeholder="Degree or course"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>
                    Graduation Year
                  </span>

                  <input
                    type="number"
                    min="1950"
                    max="2100"
                    value={graduationYear}
                    onChange={(event) =>
                      setGraduationYear(
                        event.target.value
                      )
                    }
                    placeholder="Graduation year"
                    style={inputStyle}
                  />
                </label>
              </div>
            </section>

            <section style={sectionStyle}>
              <h2>About You</h2>

              <label style={fieldStyle}>
                <span style={labelStyle}>
                  Short Bio
                </span>

                <textarea
                  rows="5"
                  value={bio}
                  onChange={(event) =>
                    setBio(event.target.value)
                  }
                  placeholder="Tell organizers about yourself..."
                  style={{
                    ...inputStyle,

                    resize: "vertical",

                    fontFamily: "inherit",
                  }}
                />
              </label>
            </section>

            <section style={sectionStyle}>
              <h2>Skills and Interests</h2>

              <p
                style={{
                  color: "#6b7280",

                  fontSize: "14px",
                }}
              >
                Separate multiple values using commas.
              </p>

              <div style={gridStyle}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>
                    Skills *
                  </span>

                  <input
                    type="text"
                    value={skills}
                    onChange={(event) =>
                      setSkills(event.target.value)
                    }
                    placeholder="Communication, First Aid, Photography"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>
                    Languages
                  </span>

                  <input
                    type="text"
                    value={languages}
                    onChange={(event) =>
                      setLanguages(event.target.value)
                    }
                    placeholder="English, Telugu, Hindi"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>
                    Interests
                  </span>

                  <input
                    type="text"
                    value={interests}
                    onChange={(event) =>
                      setInterests(event.target.value)
                    }
                    placeholder="Education, Environment, Healthcare"
                    style={inputStyle}
                  />
                </label>
              </div>
            </section>

            <section style={sectionStyle}>
              <h2>Volunteer Preferences</h2>

              <p
                style={{
                  color: "#6b7280",

                  fontSize: "14px",
                }}
              >
                Separate multiple values using commas.
              </p>

              <div style={gridStyle}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>
                    Availability
                  </span>

                  <input
                    type="text"
                    value={availability}
                    onChange={(event) =>
                      setAvailability(
                        event.target.value
                      )
                    }
                    placeholder="Weekends, Evenings"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>
                    Preferred Roles
                  </span>

                  <input
                    type="text"
                    value={preferredRoles}
                    onChange={(event) =>
                      setPreferredRoles(
                        event.target.value
                      )
                    }
                    placeholder="Registration, Logistics, Photography"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>
                    Preferred Event Types
                  </span>

                  <input
                    type="text"
                    value={preferredEventTypes}
                    onChange={(event) =>
                      setPreferredEventTypes(
                        event.target.value
                      )
                    }
                    placeholder="Blood Donation, Education, Environment"
                    style={inputStyle}
                  />
                </label>
              </div>
            </section>

            <section
              style={{
                marginBottom: "24px",
              }}
            >
              <h2>Professional Link</h2>

              <label style={fieldStyle}>
                <span style={labelStyle}>
                  LinkedIn URL
                </span>

                <input
                  type="url"
                  value={linkedin}
                  onChange={(event) =>
                    setLinkedin(event.target.value)
                  }
                  placeholder="https://www.linkedin.com/in/your-profile"
                  style={inputStyle}
                />
              </label>
            </section>

            {error && (
              <div
                style={{
                  marginBottom: "16px",

                  padding: "13px",

                  borderRadius: "9px",

                  background: "#fee2e2",

                  color: "#991b1b",

                  fontWeight: "700",
                }}
              >
                {error}
              </div>
            )}

            {message && (
              <div
                style={{
                  marginBottom: "16px",

                  padding: "13px",

                  borderRadius: "9px",

                  background: "#eff6ff",

                  color: "#1d4ed8",

                  fontWeight: "700",
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",

                padding: "14px 20px",

                border: "none",

                borderRadius: "10px",

                background: loading
                  ? "#93c5fd"
                  : "#2563eb",

                color: "#ffffff",

                fontSize: "16px",

                fontWeight: "800",

                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {loading
                ? "Creating Profile..."
                : "Create Profile →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfileSetup;