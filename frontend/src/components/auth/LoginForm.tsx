import { useEffect, useState } from "react";
import type { LoginCredentials } from "../../types/auth";

interface LoginFormProps {
  loading: boolean;
  message: string;
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  onRegister: () => void;
  registeredEmail?: string;
}

function LoginForm({
  loading,
  message,
  onLogin,
  onRegister,
  registeredEmail,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (registeredEmail) {
      setEmail(registeredEmail);
      setPassword("");
    }
  }, [registeredEmail]);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    await onLogin({ email, password });
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

          <h2>Sign in</h2>

          <p>
            Sign in to browse menus, manage orders,
            or operate the cafeteria queue.
          </p>
        </div>

        {registeredEmail && (
          <div
            className="message"
            role="status"
          >
            Account created successfully.
            You can now sign in.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@cafeteria.local"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>

        {message && (
          <div
            className="message"
            role="alert"
          >
            {message}
          </div>
        )}

        <div className="auth-switch">
          <span>Don't have an account?</span>

          <button
            type="button"
            onClick={onRegister}
            disabled={loading}
          >
            Create account
          </button>
        </div>

        <div className="demo-accounts">
          <h3>Local demo accounts</h3>

          <p>
            Student:
            teststudent2@cafeteria.local
          </p>

          <p>
            Staff:
            staff@cafeteria.local
          </p>

          <p>
            Admin:
            admin@cafeteria.local
          </p>
        </div>
      </section>
    </main>
  );
}

export default LoginForm;