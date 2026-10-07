import { useState } from "react";
import "./App.css";

import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import AdminDashboard from "./components/admin/AdminDashboard";
import StaffDashboard from "./components/staff/StaffDashboard";
import StudentDashboard from "./components/student/StudentDashboard";
import { useAuth } from "./hooks/useAuth";

function App() {
  const {
    session,
    message,
    loading,
    login,
    logout,
  } = useAuth();

  const [showRegister, setShowRegister] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  if (session?.role === "ADMIN") {
    return (
      <AdminDashboard
        session={session}
        onLogout={logout}
      />
    );
  }

  if (session?.role === "STAFF") {
    return (
      <StaffDashboard
        session={session}
        onLogout={logout}
      />
    );
  }

  if (session?.role === "STUDENT") {
    return (
      <StudentDashboard
        session={session}
        onLogout={logout}
      />
    );
  }

  if (showRegister) {
    return (
      <RegisterForm
        onRegistered={(email) => {
          setRegisteredEmail(email);
          setShowRegister(false);
        }}
        onBackToLogin={() => {
          setShowRegister(false);
        }}
      />
    );
  }

  return (
    <LoginForm
      loading={loading}
      message={message}
      onLogin={login}
      onRegister={() => {
        setShowRegister(true);
      }}
      registeredEmail={registeredEmail}
    />
  );
}

export default App;