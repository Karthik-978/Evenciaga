import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification
} from "firebase/auth";

import {
  auth,
  provider
} from "../firebase";

// REGISTER USER
export const registerUser = async (
  email,
  password
) => {

  const userCredential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  // SEND EMAIL VERIFICATION
  await sendEmailVerification(
    userCredential.user
  );

  return userCredential;
};

// LOGIN USER
export const loginUser = async (
  email,
  password
) => {

  return await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
};

// GOOGLE LOGIN
export const googleLogin = async () => {

  return await signInWithPopup(
    auth,
    provider
  );
};