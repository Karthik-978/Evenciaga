// ==========================================================
// REACT AND ROUTER IMPORTS
// ==========================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";


// ==========================================================
// FIREBASE IMPORTS
// ==========================================================

import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";


// ==========================================================
// COMPONENT IMPORTS
// ==========================================================

import BackButton from "../components/BackButton";
import "./OrganizerProfile.css";


// ==========================================================
// CLOUDINARY SETTINGS
// Replace these two values with your Cloudinary values.
// ==========================================================

const CLOUDINARY_CLOUD_NAME =
  "nog0odxe";

const CLOUDINARY_UPLOAD_PRESET =
  "evenciaga_profiles";


// ==========================================================
// EDIT ORGANIZER PROFILE COMPONENT
// ==========================================================

function EditOrganizerProfile() {
  // --------------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------------

  const navigate = useNavigate();


  // --------------------------------------------------------
  // PROFILE STATE
  // --------------------------------------------------------

  const [organizerName, setOrganizerName] =
    useState("");

  const [organizationName, setOrganizationName] =
    useState("");

  const [organizationType, setOrganizationType] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [city, setCity] =
    useState("");

  const [state, setState] =
    useState("");

  const [organizationPurpose, setOrganizationPurpose] =
    useState("");

  const [website, setWebsite] =
    useState("");

  const [linkedin, setLinkedin] =
    useState("");

  const [instagram, setInstagram] =
    useState("");

  const [proofLink, setProofLink] =
    useState("");


  // --------------------------------------------------------
  // ORGANIZATION LOGO STATE
  // --------------------------------------------------------

  const [selectedLogo, setSelectedLogo] =
    useState(null);

  const [logoPreview, setLogoPreview] =
    useState("");

  const [currentLogoURL, setCurrentLogoURL] =
    useState("");


  // --------------------------------------------------------
  // PAGE STATE
  // --------------------------------------------------------

  const [currentUserId, setCurrentUserId] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  // ========================================================
  // LOAD CURRENT ORGANIZER PROFILE
  // ========================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          setError(
            "You must be logged in to edit your organizer profile."
          );

          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setError("");

          setCurrentUserId(
            currentUser.uid
          );

          setEmail(
            currentUser.email || ""
          );


          // ------------------------------------------------
          // LOAD USER DOCUMENT
          // ------------------------------------------------

          const userSnapshot =
            await getDoc(
              doc(
                db,
                "users",
                currentUser.uid
              )
            );

          const userData =
            userSnapshot.exists()
              ? userSnapshot.data()
              : {};


          // ------------------------------------------------
          // LOAD LATEST ORGANIZER APPLICATION
          // ------------------------------------------------

          const applicationSnapshot =
            await getDocs(
              query(
                collection(
                  db,
                  "organizerApplications"
                ),
                where(
                  "uid",
                  "==",
                  currentUser.uid
                )
              )
            );

          let applicationData = {};

          if (
            !applicationSnapshot.empty
          ) {
            const applications =
              applicationSnapshot.docs.map(
                (
                  applicationDocument
                ) => ({
                  id:
                    applicationDocument.id,

                  ...applicationDocument.data(),
                })
              );

            applications.sort(
              (
                firstApplication,
                secondApplication
              ) => {
                const firstTime =
                  firstApplication
                    .submittedAt
                    ?.toMillis?.() || 0;

                const secondTime =
                  secondApplication
                    .submittedAt
                    ?.toMillis?.() || 0;

                return (
                  secondTime -
                  firstTime
                );
              }
            );

            applicationData =
              applications[0];
          }


          // ------------------------------------------------
          // FILL FORM VALUES
          // ------------------------------------------------

          setOrganizerName(
            userData.name ||
              applicationData.fullName ||
              currentUser.displayName ||
              ""
          );

          setOrganizationName(
            userData.organizationName ||
              applicationData.organizationName ||
              ""
          );

          setOrganizationType(
            userData.organizationType ||
              applicationData.organizationType ||
              ""
          );

          setPhone(
            userData.phone || ""
          );

          setCity(
            userData.city ||
              applicationData.city ||
              ""
          );

          setState(
            userData.state || ""
          );

          setOrganizationPurpose(
            userData.organizationPurpose ||
              userData.purpose ||
              applicationData.purpose ||
              ""
          );

          setWebsite(
            userData.website || ""
          );

          setLinkedin(
            userData.linkedin || ""
          );

          setInstagram(
            userData.instagram || ""
          );

          setProofLink(
            userData.proofLink ||
              applicationData.proofLink ||
              ""
          );

          const existingLogo =
            userData.organizationLogo ||
            userData.photoURL ||
            "";

          setCurrentLogoURL(
            existingLogo
          );

          setLogoPreview(
            existingLogo
          );
        } catch (loadError) {
          console.error(
            "Edit organizer profile load error:",
            loadError
          );

          setError(
            loadError?.message ||
              "Unable to load organizer profile."
          );
        } finally {
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, []);


  // ========================================================
  // HANDLE LOGO SELECTION
  // ========================================================

  const handleLogoChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select a valid image file."
      );

      event.target.value = "";
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Organization logo must be smaller than 5 MB."
      );

      event.target.value = "";
      return;
    }

    setError("");
    setSelectedLogo(file);

    const previewURL =
      URL.createObjectURL(file);

    setLogoPreview(previewURL);
  };


  // ========================================================
  // REMOVE SELECTED LOGO
  // ========================================================

  const removeSelectedLogo = () => {
    setSelectedLogo(null);
    setLogoPreview("");
    setCurrentLogoURL("");
  };


  // ========================================================
  // UPLOAD LOGO TO CLOUDINARY
  // ========================================================

  const uploadLogo = async () => {
    if (!selectedLogo) {
      return currentLogoURL;
    }

    if (
      CLOUDINARY_CLOUD_NAME ===
      "YOUR_CLOUD_NAME"
    ) {
      throw new Error(
        "Replace YOUR_CLOUD_NAME with your Cloudinary cloud name."
      );
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      selectedLogo
    );

    formData.append(
      "upload_preset",
      CLOUDINARY_UPLOAD_PRESET
    );

    const response =
      await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

    const uploadData =
      await response.json();

    if (!response.ok) {
      throw new Error(
        uploadData?.error?.message ||
          "Organization logo upload failed."
      );
    }

    return (
      uploadData.secure_url ||
      ""
    );
  };


  // ========================================================
  // VALIDATE URL
  // ========================================================

  const isValidURL = (
    value
  ) => {
    if (!value.trim()) {
      return true;
    }

    try {
      const url =
        new URL(value.trim());

      return (
        url.protocol === "http:" ||
        url.protocol === "https:"
      );
    } catch {
      return false;
    }
  };


  // ========================================================
  // SAVE ORGANIZER PROFILE
  // ========================================================

  const handleSave = async (
    event
  ) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!currentUserId) {
      setError(
        "Your login session was not found."
      );

      return;
    }

    if (
      !organizerName.trim() ||
      !organizationName.trim() ||
      !organizationType.trim() ||
      !city.trim() ||
      !organizationPurpose.trim()
    ) {
      setError(
        "Please complete all required fields."
      );

      return;
    }

    const urlFields = [
      {
        label: "Website",
        value: website,
      },
      {
        label: "LinkedIn",
        value: linkedin,
      },
      {
        label: "Instagram",
        value: instagram,
      },
      {
        label: "Proof link",
        value: proofLink,
      },
    ];

    const invalidURL =
      urlFields.find(
        (field) =>
          !isValidURL(
            field.value
          )
      );

    if (invalidURL) {
      setError(
        `${invalidURL.label} must begin with http:// or https://`
      );

      return;
    }

    try {
      setSaving(true);

      setMessage(
        selectedLogo
          ? "Uploading organization logo..."
          : "Saving organizer profile..."
      );

      const finalLogoURL =
        await uploadLogo();

      setMessage(
        "Saving organizer details..."
      );

      await setDoc(
        doc(
          db,
          "users",
          currentUserId
        ),
        {
          name:
            organizerName.trim(),

          email,

          phone:
            phone.trim(),

          city:
            city.trim(),

          state:
            state.trim(),

          organizationName:
            organizationName.trim(),

          organizationType:
            organizationType.trim(),

          organizationPurpose:
            organizationPurpose.trim(),

          website:
            website.trim(),

          linkedin:
            linkedin.trim(),

          instagram:
            instagram.trim(),

          proofLink:
            proofLink.trim(),

          organizationLogo:
            finalLogoURL,

          organizerProfileComplete:
            true,

          organizerProfileUpdatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      setCurrentLogoURL(
        finalLogoURL
      );

      setMessage(
        "Organizer profile updated successfully."
      );

      navigate(
        "/organizer-profile"
      );
    } catch (saveError) {
      console.error(
        "Edit organizer profile save error:",
        saveError
      );

      setError(
        saveError?.message ||
          "Unable to save organizer profile."
      );

      setMessage("");
    } finally {
      setSaving(false);
    }
  };


  // ========================================================
  // LOADING SCREEN
  // ========================================================

  if (loading) {
    return (
      <div className="organizer-profile-page">
        <div className="organizer-profile-state">
          <h2>
            Loading organizer profile...
          </h2>
        </div>
      </div>
    );
  }


  // ========================================================
  // ERROR SCREEN
  // ========================================================

  if (
    error &&
    !currentUserId
  ) {
    return (
      <div className="organizer-profile-page">
        <div className="organizer-profile-state error">
          <h2>
            Unable to open profile editor
          </h2>

          <p>{error}</p>
        </div>
      </div>
    );
  }


  // ========================================================
  // EDIT ORGANIZER PROFILE UI
  // ========================================================

  return (
    <div className="organizer-profile-page">
      <div className="organizer-profile-container">

        {/* ==================================================
            TOP BAR
        ================================================== */}

        <div className="organizer-profile-topbar">
          <BackButton />

          <button
            type="button"
            className="organizer-profile-edit-button"
            onClick={() =>
              navigate(
                "/organizer-profile"
              )
            }
          >
            View Organizer Profile
          </button>
        </div>


        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <section className="organizer-edit-header">
          <p className="organizer-profile-eyebrow">
            Organizer Account
          </p>

          <h1>
            Edit Organizer Profile
          </h1>

          <p>
            Keep your organization information accurate so volunteers
            can understand who is managing each event.
          </p>
        </section>


        {/* ==================================================
            EDIT FORM
        ================================================== */}

        <form
          className="organizer-edit-form"
          onSubmit={handleSave}
        >

          {/* ================================================
              ORGANIZATION LOGO
          ================================================ */}

          <section className="organizer-edit-card">
            <h2>
              Organization Logo
            </h2>

            <div className="organizer-logo-editor">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Organization logo preview"
                />
              ) : (
                <div className="organizer-logo-placeholder">
                  {organizationName
                    ?.charAt(0)
                    ?.toUpperCase() ||
                    "O"}
                </div>
              )}

              <div className="organizer-logo-controls">
                <label className="organizer-file-button">
                  Upload Logo

                  <input
                    type="file"
                    accept="image/*"
                    onChange={
                      handleLogoChange
                    }
                  />
                </label>

                {logoPreview && (
                  <button
                    type="button"
                    className="organizer-remove-logo-button"
                    onClick={
                      removeSelectedLogo
                    }
                  >
                    Remove Logo
                  </button>
                )}

                <p>
                  JPG, PNG or WEBP. Maximum 5 MB.
                </p>
              </div>
            </div>
          </section>


          {/* ================================================
              ORGANIZATION DETAILS
          ================================================ */}

          <section className="organizer-edit-card">
            <h2>
              Organization Details
            </h2>

            <div className="organizer-edit-grid">
              <label className="organizer-edit-field">
                <span>
                  Organizer Name *
                </span>

                <input
                  type="text"
                  value={organizerName}
                  onChange={(event) =>
                    setOrganizerName(
                      event.target.value
                    )
                  }
                  placeholder="Enter organizer name"
                />
              </label>

              <label className="organizer-edit-field">
                <span>
                  Organization Name *
                </span>

                <input
                  type="text"
                  value={organizationName}
                  onChange={(event) =>
                    setOrganizationName(
                      event.target.value
                    )
                  }
                  placeholder="Enter organization name"
                />
              </label>

              <label className="organizer-edit-field">
                <span>
                  Organization Type *
                </span>

                <select
                  value={organizationType}
                  onChange={(event) =>
                    setOrganizationType(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Select organization type
                  </option>

                  <option value="NGO">
                    NGO
                  </option>

                  <option value="College / University">
                    College / University
                  </option>

                  <option value="Company">
                    Company
                  </option>

                  <option value="Community">
                    Community
                  </option>

                  <option value="Government">
                    Government
                  </option>

                  <option value="Individual Organizer">
                    Individual Organizer
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </label>

              <label className="organizer-edit-field">
                <span>
                  Email
                </span>

                <input
                  type="email"
                  value={email}
                  disabled
                />
              </label>

              <label className="organizer-edit-field">
                <span>
                  Phone
                </span>

                <input
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value
                    )
                  }
                  placeholder="Enter contact number"
                />
              </label>

              <label className="organizer-edit-field">
                <span>
                  City *
                </span>

                <input
                  type="text"
                  value={city}
                  onChange={(event) =>
                    setCity(
                      event.target.value
                    )
                  }
                  placeholder="Enter city"
                />
              </label>

              <label className="organizer-edit-field">
                <span>
                  State
                </span>

                <input
                  type="text"
                  value={state}
                  onChange={(event) =>
                    setState(
                      event.target.value
                    )
                  }
                  placeholder="Enter state"
                />
              </label>
            </div>
          </section>


          {/* ================================================
              ABOUT ORGANIZATION
          ================================================ */}

          <section className="organizer-edit-card">
            <h2>
              About Organization
            </h2>

            <label className="organizer-edit-field">
              <span>
                Organization Description *
              </span>

              <textarea
                rows="6"
                value={
                  organizationPurpose
                }
                onChange={(event) =>
                  setOrganizationPurpose(
                    event.target.value
                  )
                }
                placeholder="Describe your organization, mission, and the type of events you conduct."
              />
            </label>
          </section>


          {/* ================================================
              PROFESSIONAL LINKS
          ================================================ */}

          <section className="organizer-edit-card">
            <h2>
              Professional Links
            </h2>

            <div className="organizer-edit-grid">
              <label className="organizer-edit-field">
                <span>
                  Website
                </span>

                <input
                  type="url"
                  value={website}
                  onChange={(event) =>
                    setWebsite(
                      event.target.value
                    )
                  }
                  placeholder="https://organization.com"
                />
              </label>

              <label className="organizer-edit-field">
                <span>
                  LinkedIn
                </span>

                <input
                  type="url"
                  value={linkedin}
                  onChange={(event) =>
                    setLinkedin(
                      event.target.value
                    )
                  }
                  placeholder="https://linkedin.com/company/..."
                />
              </label>

              <label className="organizer-edit-field">
                <span>
                  Instagram
                </span>

                <input
                  type="url"
                  value={instagram}
                  onChange={(event) =>
                    setInstagram(
                      event.target.value
                    )
                  }
                  placeholder="https://instagram.com/..."
                />
              </label>

              <label className="organizer-edit-field">
                <span>
                  Verification Proof
                </span>

                <input
                  type="url"
                  value={proofLink}
                  onChange={(event) =>
                    setProofLink(
                      event.target.value
                    )
                  }
                  placeholder="Google Drive, website, or verification link"
                />
              </label>
            </div>
          </section>


          {/* ================================================
              MESSAGES
          ================================================ */}

          {error && (
            <div className="organizer-edit-message error">
              {error}
            </div>
          )}

          {message && (
            <div className="organizer-edit-message success">
              {message}
            </div>
          )}


          {/* ================================================
              SAVE ACTIONS
          ================================================ */}

          <div className="organizer-edit-actions">
            <button
              type="button"
              className="organizer-cancel-button"
              onClick={() =>
                navigate(
                  "/organizer-profile"
                )
              }
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="organizer-save-button"
              disabled={saving}
            >
              {saving
                ? "Saving Profile..."
                : "Save Organizer Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditOrganizerProfile;