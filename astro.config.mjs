// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
//
// @astrojs/sitemap 3.7 has a build-time crash on this site
// ("Cannot read properties of undefined (reading 'reduce')").
// Disabled for now — re-add once we either downgrade to 3.2 or
// hand-roll a sitemap.xml in /public.
export default defineConfig({
  site: "https://wordink.dev",
  integrations: [react(), mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
