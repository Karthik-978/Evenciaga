import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";



import { auth, db } from "../firebase";
import BackButton from "../components/BackButton";

function EditProfile() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [bio, setBio] = useState("");

  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [interests, setInterests] = useState("");
  const [availability, setAvailability] = useState("");
  const [preferredRoles, setPreferredRoles] = useState("");
  const [preferredEventTypes, setPreferredEventTypes] = useState("");

  const [linkedin, setLinkedin] = useState("");

  const [photoURL, setPhotoURL] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const valueToText = (value) => {
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (value === null || value === undefined) {
      return "";
    }

    return String(value);
  };

  const convertToArray = (value) =>
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("You must be logged in to edit your profile.");
        setLoadingProfile(false);
        return;
      }

      try {
        setUserId(user.uid);
        setError("");

        const userRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userRef);

        if (!userSnapshot.exists()) {
          setError("Profile document was not found.");
          return;
        }

        const data = userSnapshot.data();

        const existingPhotoURL = valueToText(data.photoURL);
        setPhotoURL(existingPhotoURL);
        setImagePreview(existingPhotoURL);

        setName(valueToText(data.name));
        setPhone(valueToText(data.phone));
        setAge(valueToText(data.age));
        setCity(valueToText(data.city));
        setState(valueToText(data.state));
        setCollege(valueToText(data.college));
        setDegree(valueToText(data.degree));
        setGraduationYear(valueToText(data.graduationYear));
        setBio(valueToText(data.bio));

        setSkills(valueToText(data.skills));
        setLanguages(valueToText(data.languages));
        setInterests(valueToText(data.interests));
        setAvailability(valueToText(data.availability));
        setPreferredRoles(valueToText(data.preferredRoles));
        setPreferredEventTypes(valueToText(data.preferredEventTypes));

        setLinkedin(valueToText(data.linkedin));
      } catch (loadError) {
        console.error("Error loading profile:", loadError);
        setError(
          loadError?.message ||
            "Unable to load your profile. Please try again."
        );
      } finally {
        setLoadingProfile(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile image must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!userId) {
      setError("Logged-in user was not found.");
      return;
    }

    if (!name.trim() || !phone.trim() || !college.trim()) {
      setError("Name, phone number, and college are required.");
      return;
    }

    if (age && (Number(age) < 14 || Number(age) > 100)) {
      setError("Please enter a valid age.");
      return;
    }

    if (
      graduationYear &&
      (Number(graduationYear) < 1950 ||
        Number(graduationYear) > 2100)
    ) {
      setError("Please enter a valid graduation year.");
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
      setSaving(true);

      const userRef = doc(db, "users", userId);
     let finalPhotoURL = photoURL;

if (selectedImage) {
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
        "Image upload failed."
    );
  }

  finalPhotoURL = uploadData.secure_url;
}

      await updateDoc(userRef, {
        
        photoURL: finalPhotoURL,
        name: name.trim(),
        phone: phone.trim(),
        age: age ? Number(age) : "",
        city: city.trim(),
        state: state.trim(),
        college: college.trim(),
        degree: degree.trim(),
        graduationYear: graduationYear
          ? Number(graduationYear)
          : "",
        bio: bio.trim(),

        skills: convertToArray(skills),
        languages: convertToArray(languages),
        interests: convertToArray(interests),
        availability: convertToArray(availability),
        preferredRoles: convertToArray(preferredRoles),
        preferredEventTypes: convertToArray(
          preferredEventTypes
        ),

        linkedin: linkedin.trim(),
        updatedAt: serverTimestamp(),
      });

      setMessage("Profile updated successfully.");

      window.setTimeout(() => {
        navigate("/profile");
      }, 700);
    } catch (saveError) {
      console.error("Error updating profile:", saveError);

      setError(
        saveError?.message ||
          "Unable to update your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const pageStyle = {
    minHeight: "100vh",
    padding: "30px 16px",
    background: "#f4f7fb",
  };

  const containerStyle = {
    width: "min(900px, 100%)",
    margin: "0 auto",
  };

  const cardStyle = {
    padding: "28px",
    borderRadius: "14px",
    background: "#ffffff",
    boxShadow: "0 8px 28px rgba(15, 23, 42, 0.08)",
  };

  const sectionStyle = {
    marginBottom: "28px",
    paddingBottom: "24px",
    borderBottom: "1px solid #e5e7eb",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    outline: "none",
    fontSize: "15px",
  };

  if (loadingProfile) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>
            <h2>Loading profile...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (error && !userId) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <BackButton />

          <div style={{ ...cardStyle, marginTop: "18px" }}>
            <h2>Unable to open Edit Profile</h2>
            <p style={{ color: "#b91c1c" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <BackButton />

        <div style={{ ...cardStyle, marginTop: "18px" }}>
          <p
            style={{
              margin: "0 0 6px",
              color: "#2563eb",
              fontSize: "13px",
              fontWeight: "700",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
            }}
          >
            Volunteer Profile
          </p>

          <h1 style={{ margin: "0 0 8px", color: "#111827" }}>
            Edit Profile
          </h1>

          <p style={{ margin: "0 0 28px", color: "#6b7280" }}>
            Update your personal information, skills, interests,
            availability, and preferences.
          </p>

          <form onSubmit={handleSave}>
            <section style={sectionStyle}>
              <h2>Profile Photo</h2>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "18px",
                }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile preview"
                    style={{
                      width: "100px",
                      height: "100px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "4px solid #dbeafe",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100px",
                      height: "100px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#2563eb",
                      color: "#ffffff",
                      fontSize: "36px",
                      fontWeight: "800",
                    }}
                  >
                    {name?.charAt(0)?.toUpperCase() || "V"}
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
                      margin: "8px 0 0",
                      color: "#6b7280",
                      fontSize: "13px",
                    }}
                  >
                    JPG, PNG or WEBP. Maximum size: 5 MB.
                  </p>
                </div>
              </div>
            </section>

            <section style={sectionStyle}>
              <h2>Personal Information</h2>

              <div style={gridStyle}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Full Name *</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>Phone Number *</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>Age</span>
                  <input
                    type="number"
                    min="14"
                    max="100"
                    value={age}
                    onChange={(event) =>
                      setAge(event.target.value)
                    }
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>City</span>
                  <input
                    type="text"
                    value={city}
                    onChange={(event) =>
                      setCity(event.target.value)
                    }
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>State</span>
                  <input
                    type="text"
                    value={state}
                    onChange={(event) =>
                      setState(event.target.value)
                    }
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
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>Degree</span>
                  <input
                    type="text"
                    value={degree}
                    onChange={(event) =>
                      setDegree(event.target.value)
                    }
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
                      setGraduationYear(event.target.value)
                    }
                    style={inputStyle}
                  />
                </label>
              </div>
            </section>

            <section style={sectionStyle}>
              <h2>About Me</h2>

              <label style={fieldStyle}>
                <span style={labelStyle}>Bio</span>
                <textarea
                  rows="5"
                  value={bio}
                  onChange={(event) =>
                    setBio(event.target.value)
                  }
                  placeholder="Write a short introduction about yourself..."
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

              <p style={{ color: "#6b7280", fontSize: "14px" }}>
                Enter multiple values separated by commas.
              </p>

              <div style={gridStyle}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Skills</span>
                  <input
                    type="text"
                    value={skills}
                    onChange={(event) =>
                      setSkills(event.target.value)
                    }
                    placeholder="Communication, Photography, First Aid"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>Languages</span>
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
                  <span style={labelStyle}>Interests</span>
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

              <p style={{ color: "#6b7280", fontSize: "14px" }}>
                Enter multiple values separated by commas.
              </p>

              <div style={gridStyle}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Availability</span>
                  <input
                    type="text"
                    value={availability}
                    onChange={(event) =>
                      setAvailability(event.target.value)
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
                      setPreferredRoles(event.target.value)
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
                      setPreferredEventTypes(event.target.value)
                    }
                    placeholder="Blood Donation, Education, Environment"
                    style={inputStyle}
                  />
                </label>
              </div>
            </section>

            <section style={{ marginBottom: "24px" }}>
              <h2>Social Profile</h2>

              <label style={fieldStyle}>
                <span style={labelStyle}>LinkedIn URL</span>
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
                  padding: "12px",
                  borderRadius: "8px",
                  background: "#fee2e2",
                  color: "#991b1b",
                  fontWeight: "600",
                }}
              >
                {error}
              </div>
            )}

            {message && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "#dcfce7",
                  color: "#166534",
                  fontWeight: "600",
                }}
              >
                {message}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "12px 20px",
                  border: "none",
                  borderRadius: "8px",
                  background: saving ? "#93c5fd" : "#2563eb",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => navigate("/profile")}
                style={{
                  padding: "12px 20px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  background: "#ffffff",
                  color: "#374151",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditProfile;