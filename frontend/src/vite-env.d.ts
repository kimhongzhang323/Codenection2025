/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_ACCESS_TOKEN: string
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
