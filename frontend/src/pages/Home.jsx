import { Link } from "react-router-dom";

import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const FEATURES = [
  { icon: "📍", title: "Real-time GPS tracking", text: "Live location with OSM maps and reverse geocoding." },
  { icon: "🗺️", title: "Smart route guidance", text: "Turn-by-turn driving routes from the OpenStreetMap ecosystem." },
  { icon: "🤖", title: "AI navigation assistant", text: "Natural-language directions, nearby places and safety advice." },
  { icon: "🚨", title: "Emergency SOS", text: "One-tap SOS with your coordinates, address and nearest help." },
  { icon: "🕹️", title: "Robotics control", text: "Command the ESP32-powered unit and watch live telemetry." },
  { icon: "🔋", title: "Robot monitoring", text: "Battery, speed, heading, temperature and obstacle distance." },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="landing">
      <Navbar />
      <section className="hero">
        <div className="hero-inner">
          <span className="hero-badge">AI-powered navigation &amp; safety</span>
          <h1>
            Never get lost again — <span className="accent">JoshRob AI</span> guides you home.
          </h1>
          <p>
            Real-time GPS, intelligent route guidance, emergency assistance and robotics control
            in one platform.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                Open your dashboard →
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Get started free
                </Link>
                <Link to="/login" className="btn btn-ghost btn-lg">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
      <section className="features">
        <div className="features-inner">
          <h2>Everything you need to travel safely</h2>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card">
                <span className="feature-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer className="landing-footer">
        <p>JoshRob AI — student portfolio project by Joshua. Built with React, Leaflet, Flask &amp; Node.js.</p>
      </footer>
    </div>
  );
}
