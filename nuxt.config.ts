// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/ui"],

  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],

  nitro: {
    storage: {
      data: {
        driver: "fs",
        base: "./.data/storage",
      },
    },
  },

  routeRules: {
    "/": { prerender: false },
    "/login": { ssr: false },
    "/public": {
      ssr: false,
      headers: {
        "Content-Security-Policy": `frame-ancestors 'self' *;`,
      },
    },
    "/admin/**": { ssr: true },
    "/api/**": { cors: true },
  },

  colorMode: {
    preference: "system",
    fallback: "light",
  },

  app: {
    head: {
      script: [
        {
          key: "public-theme-override",
          innerHTML: `(function(){if(location.pathname.startsWith('/public')){var m=location.search.match(/[?&]theme=(dark|light)/);if(m)try{localStorage.setItem('nuxt-color-mode',m[1])}catch(e){}}})();`,
          tagPosition: "head",
          tagPriority: 1,
        },
      ],
    },
  },

  ui: {
    theme: {
      colors: [
        "primary",
        "secondary",
        "success",
        "info",
        "warning",
        "error",
        "neutral",
      ],
    },
  },

  components: [
    {
      path: "~/components",
      pathPrefix: false,
    },
  ],

  compatibilityDate: "2025-01-15",

  eslint: {
    config: {
      stylistic: {
        commaDangle: "never",
        braceStyle: "1tbs",
      },
    },
  },
});
