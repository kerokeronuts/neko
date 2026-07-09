import React from "react";
import ReactDOM from "react-dom/client";
import liff from "@line/liff";
import App from "./App.jsx";
import "./index.css";

const LIFF_ID = import.meta.env.VITE_LIFF_ID || "";

async function bootstrap() {
  // LIFF ID が未設定の場合(=普通のブラウザで動作確認する場合)は初期化をスキップする
  if (LIFF_ID) {
    try {
      await liff.init({ liffId: LIFF_ID });
    } catch (e) {
      console.warn("LIFF init に失敗しました。通常のブラウザとして動作します。", e);
    }
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
