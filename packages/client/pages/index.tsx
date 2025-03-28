import React, { useEffect, useState } from "react";

export default function Home() {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Countdown before redirect
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect to the Vite app
          window.location.href = "/";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#121824",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "600px", padding: "20px" }}>
        <h1
          style={{
            fontSize: "2.5rem",
            marginBottom: "1rem",
            background: "linear-gradient(90deg, #4F46E5, #06B6D4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Tetris with Friends
        </h1>

        <p style={{ fontSize: "1.2rem", marginBottom: "2rem" }}>
          A real-time multiplayer Tetris game built with React, Socket.IO, and
          TypeScript.
        </p>

        <div
          style={{
            background: "rgba(59, 130, 246, 0.1)",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "2rem",
            border: "1px solid rgba(59, 130, 246, 0.2)",
          }}
        >
          <p style={{ marginBottom: "1rem" }}>
            Redirecting to game in <strong>{countdown}</strong> seconds...
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            style={{
              backgroundColor: "#3B82F6",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Play Now
          </button>
        </div>

        <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
          © 2023 Timothy Crowley |{" "}
          <a
            href="https://github.com/timothyjjcrow/tetris-with-friends"
            style={{ color: "#3B82F6", textDecoration: "none" }}
          >
            GitHub
          </a>
        </p>
      </div>
    </div>
  );
}
