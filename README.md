# Daily Todo

An Astro PWA for daily todos and time-based routine checkpoints, built with
`@studio-baeks/paper-ui` primitives and atoms.

Live site: https://todo.bsiku.dev/

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

## Install

- Android: open the live site in Chrome and choose **Install app** from the menu.
- iPhone or iPad: open the live site in Safari, tap **Share**, then choose **Add to Home Screen**.

The app shell and static assets are cached for offline use. Todo and routine
data stays on the device and is not synchronized between browsers.

The `paper-ui` dependency is packed in `vendor/` because it is not published to
npm. When updating it, build the package in the `paper-ui` workspace, pack it
into `vendor/`, and update the dependency filename if its version changes.
