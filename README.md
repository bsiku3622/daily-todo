# Daily Todo

An Astro PWA for daily todos and time-based routine checkpoints, built with
`@studio-baeks/paper-ui` primitives and atoms.

## Run locally

```sh
pnpm install
pnpm dev
```

## Production build

```sh
pnpm build
pnpm preview
```

The app stores data locally in the browser. Browser notifications fire at a
checkpoint time while the app is open. The production build includes a web app
manifest and service worker for Android installation and offline use.

The `paper-ui` dependency is packed in `vendor/` because it is not published to
npm. When updating it, build the package in the `paper-ui` workspace, pack it
into `vendor/`, and update the dependency filename if its version changes.
