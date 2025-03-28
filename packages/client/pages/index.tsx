import React, { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // Redirect to the Vite app
    window.location.href = "/";
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
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1>Tetris with Friends</h1>
        <p>Loading game...</p>
      </div>
    </div>
  );
}
