import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { ChatTypingStyleProvider } from "@/app/providers/ChatTypingStyleProvider";
import App from "@/app/App";
import { initTheme } from "@/utils/theme/initTheme";
import { initChatTypingStyle } from "@/utils/chat/initChatTypingStyle";
import "./index.css";

initTheme();
initChatTypingStyle();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ChatTypingStyleProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ChatTypingStyleProvider>
    </ThemeProvider>
  </StrictMode>,
);
