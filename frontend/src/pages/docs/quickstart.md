# Quick Start

---

## Introduction

Fumadocs <span className="text-fd-muted-foreground text-sm">(Foo-ma docs)</span> is a **documentation framework**, designed to be fast, flexible,
and composes seamlessly into your React framework.

<Callout title="Want to learn more?">
  Read our in-depth [What is Fumadocs](/docs/ui/what-is-fumadocs) introduction.
</Callout>

### Terminology

**Markdown/MDX:** Markdown is a markup language for creating formatted text. Fumadocs natively supports Markdown and MDX (superset of Markdown).

**[Bun](https://bun.sh):** A JavaScript runtime, we use it for running scripts.

Although not required, some basic knowledge of React.js would be useful for further customisations.

## Automatic Installation

A minimum version of Node.js 20 required, note that Node.js 23.1 might have problems with Next.js.

```bash tab="npm"
npm create fumadocs-app
```

```bash tab="pnpm"
pnpm create fumadocs-app
```

```bash tab="yarn"
yarn create fumadocs-app
```

```bash tab="bun"
bun create fumadocs-app
```

It will ask you:

* the React.js framework to use (Next.js recommended).
* the content source to use.

A new fumadocs app should be initialized. Now you can start hacking!

<Callout title="From Existing Codebase?">
  You can follow the [Manual Installation](/docs/ui/manual-installation) guide to get started.
</Callout>

### Enjoy!

Create your first MDX file in the docs folder.

```mdx title="content/docs/index.mdx"
---
title: Hello World
---

## Yo what's up
```

Run the app in development mode and see [http://localhost:3000/docs](http://localhost:3000/docs).

```package-tabs
npm: npm run dev
pnpm: pnpm run dev
yarn: yarn dev
bun: bun run dev
```

## FAQ

Some common questions you may encounter.

<Accordions>
  <Accordion id="change-base-url" title="How to change the base route of docs?">
    Routing is handled by your React framework, you need to change the routing structure first.

    For example, in Next.js, rename the route (`/docs/*` -> `/info/*`):

    <Files>
      <Folder name="app/docs" defaultOpen className="opacity-50" disabled>
        <File name="layout.tsx" />
      </Folder>

      <Folder name="app/info" defaultOpen>
        <File name="layout.tsx" />
      </Folder>
    </Files>

    Or rename from `/docs/*` to `/*` using a route group:

    <Files>
      <Folder name="app/(docs)" defaultOpen>
        <File name="layout.tsx" />
      </Folder>
    </Files>

    Finally, update the base URL of pages in `source.ts`:

    ```ts title="lib/source.ts"
    import { loader } from 'fumadocs-core/source';

    export const source = loader({
      baseUrl: '/info', // to the new value [!code highlight]
    });
    ```
