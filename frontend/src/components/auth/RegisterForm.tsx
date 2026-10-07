import { useState } from "react";
import {
  register,
  type RegisterCredentials,
} from "../../services/authApi";

interface RegisterFormProps {
  onRegistered?: (email: string) => void;
  onBackToLogin?: () => void;
}

export default function RegisterForm({
  onRegistered,
  onBackToLogin,
}: RegisterFormProps) {
  const [form, setForm] = useState<RegisterCredentials>({
    fullName: "",
    email: "",
    password: "",
  });

  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(
    field: keyof RegisterCredentials,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!fullName || !email || !password) {
      setError(
        "Full name, email and password are required.",
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        fullName,
        email,
        password,
      });

      setSuccess(
        result.message || "Registration successful.",
      );

      setForm({
        fullName: "",
        email: "",
        password: "",
      });

      setConfirmPassword("");

      onRegistered?.(result.email);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Registration failed.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="login-card">
        <div className="brand">
          <span className="brand-mark">CC</span>

          <div>
            <h1>Campus Cafeteria</h1>
            <p>Preorder & Pickup</p>
          </div>
        </div>

        <div className="login-heading">
          <span className="eyebrow">
            Campus food ordering
          </span>

          <h2>Create account</h2>

          <p>
            Register as a student to browse menus,
            place orders, and manage your cafeteria
            pickups.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="register-full-name">
            Full name

            <input
              id="register-full-name"
              type="text"
              value={form.fullName}
              onChange={(event) =>
                updateField(
                  "fullName",
                  event.target.value,
                )
              }
              placeholder="Enter your full name"
              autoComplete="name"
              disabled={loading}
              required
            />
          </label>

          <label htmlFor="register-email">
            Email

            <input
              id="register-email"
              type="email"
              value={form.email}
              onChange={(event) =>
                updateField(
                  "email",
                  event.target.value,
                )
              }
              placeholder="you@cafeteria.local"
              autoComplete="email"
              disabled={loading}
              required
            />
          </label>

          <label htmlFor="register-password">
            Password

            <input
              id="register-password"
              type="password"
              value={form.password}
              onChange={(event) =>
                updateField(
                  "password",
                  event.target.value,
                )
              }
              placeholder="At least 6 characters"
              autoComplete="new-password"
              disabled={loading}
              required
              minLength={6}
            />
          </label>

          <label htmlFor="register-confirm-password">
            Confirm password

            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(
                  event.target.value,
                );
                setError("");
                setSuccess("");
              }}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              disabled={loading}
              required
              minLength={6}
            />
          </label>

          {error && (
            <p
              className="auth-error"
              role="alert"
            >
              {error}
            </p>
          )}

          {success && (
            <p
              className="auth-success"
              role="status"
            >
              {success}
            </p>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create account"}
          </button>

          {onBackToLogin && (
            <button
              className="secondary-button"
              type="button"
              onClick={onBackToLogin}
              disabled={loading}
            >
              Back to login
            </button>
          )}
        </form>
      </section>
    </main>
  );
}