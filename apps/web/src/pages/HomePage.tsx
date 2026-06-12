import { Link } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";

export function HomePage() {
  return (
    <div className="page">
      <div className="card stack">
        <div className="stack-sm" style={{ textAlign: "center" }}>
          <BrandLogo height={56} style={{ margin: "0 auto" }} />
          <p className="subtitle">Send or receive a sealed file.<br />No account. Gone after use.</p>
        </div>

        <hr className="divider" />

        <div className="home-choices">
          <Link to="/send" className="choice-card">
            <span className="choice-card__icon">📤</span>
            <span className="choice-card__title">Send a file</span>
            <span className="choice-card__desc">Seal a file and share a link. It disappears after use.</span>
          </Link>
          <Link to="/receive" className="choice-card">
            <span className="choice-card__icon">📥</span>
            <span className="choice-card__title">Receive a file</span>
            <span className="choice-card__desc">Create a private drop link. Only you can unlock what arrives.</span>
          </Link>
        </div>

        <p className="safety-label">
          Files are locked in your browser before upload.<br />
          The server never sees your file contents or keys.
        </p>
      </div>
    </div>
  );
}
