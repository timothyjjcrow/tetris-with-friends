// This file is used by Next.js when deployed on Vercel
// It simply redirects to our Vite app
import React, { useEffect } from "react";
import { AppProps } from "next/app";

function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Redirect to our Vite app
    window.location.href = "/";
  }, []);

  return <div>Loading Tetris with Friends...</div>;
}

export default App;
