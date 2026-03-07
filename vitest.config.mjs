import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react({ include: /\.(jsx|tsx|js)$/ })],
  test: {
    environment: "happy-dom",
    setupFiles: ["./setupTests.js"],
    include: ["**/*.test.{js,jsx,ts,tsx}"],
    globals: true,
    env: {
      NEXT_PUBLIC_API_URL: "https://api.test.example.com",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
