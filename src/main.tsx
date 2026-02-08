
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./auth/AuthContext";
import App from "./App.tsx";
import "./index.css";
import "./styles/print.css";
import "./styles/forms.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" />
    </BrowserRouter>
  </AuthProvider>
);
  
