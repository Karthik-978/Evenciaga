import React from "react";

import ReactDOM from "react-dom/client";
import "./index.css";

import {
  BrowserRouter
} from "react-router-dom";

import App from "./App";

import { AuthProvider } from "./context/AUthContext";
ReactDOM.createRoot(
  document.getElementById("root")
).render(

  <React.StrictMode>

   <BrowserRouter basename="/Evenciaga">

      <AuthProvider>

        <App />

      </AuthProvider>

    </BrowserRouter>

  </React.StrictMode>
);