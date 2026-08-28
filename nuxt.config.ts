// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/ui"],

  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    public: {
      appVersion: process.env.npm_package_version || "3.0.0",
      githubRepoUrl: "https://github.com/ambyte/BucketFlow",
    },
  },

  nitro: {
    storage: {
      data: {
        driver: "fs",
        base: "./.data/storage",
      },
    },
  },

  routeRules: {
    "/": {
      prerender: false,
      headers: {
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: http: ws: wss:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'",
      },
    },
    "/login": {
      ssr: false,
      headers: {
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'",
      },
    },
    "/public": {
      ssr: false,
      headers: {
        "Content-Security-Policy": `frame-ancestors 'self' *;`,
      },
    },
    "/admin/**": {
      ssr: true,
      headers: {
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: http: ws: wss:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'",
      },
    },
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
          innerHTML: `(function(){if(location.pathname.startsWith('/public')){var m=location.search.match(/[?&]theme=(dark|light|system)/);try{localStorage.setItem('nuxt-color-mode',m?m[1]:'system')}catch(e){}}})();`,
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
