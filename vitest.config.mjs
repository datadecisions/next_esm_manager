import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "happy-dom",
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
