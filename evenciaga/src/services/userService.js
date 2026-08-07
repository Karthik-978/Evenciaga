import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase";

// SAVE USER PROFILE
export const saveUserProfile =
  async (userData) => {

    await setDoc(

      doc(
        db,
        "users",
        userData.uid
      ),

      {
        ...userData,

        createdAt:
          serverTimestamp()
      }
    );
};

// GET USER PROFILE
export const getUserProfile =
  async (uid) => {

    const docRef =
      doc(db, "users", uid);

    const docSnap =
      await getDoc(docRef);

    if (docSnap.exists()) {

      return docSnap.data();

    } else {

      return null;
    }
};