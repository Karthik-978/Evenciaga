import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import {
  getAuth,
  GoogleAuthProvider
} from "firebase/auth";

import {
  getFirestore
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBkew2VHO4sMk4U6DgtC75_GzY5ec7u-TI",
  authDomain: "evenciaga-6c7fa.firebaseapp.com",
  projectId: "evenciaga-6c7fa",
  storageBucket: "evenciaga-6c7fa.firebasestorage.app",
  messagingSenderId: "392002569524",
  appId: "1:392002569524:web:f5cfe312f14d6312ea5161",
  measurementId: "G-2RX1NHRF6X"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();

provider.setCustomParameters({
  prompt: "select_account"
});
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;