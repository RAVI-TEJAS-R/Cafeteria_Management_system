interface HeaderProps {
  fullName: string;
  role: string;
  subtitle: string;
  onLogout: () => void;
}

function Header({ fullName, role, subtitle, onLogout }: HeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="brand">
        <span className="brand-mark">CC</span>
        <div>
          <h1>Campus Cafeteria</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="header-user">
        <div>
          <strong>{fullName}</strong>
          <span>{role}</span>
        </div>

        <button className="secondary-button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;
