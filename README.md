# ThreeJS starter

This is a general template for ThreeJS applications. It uses [ViteJS](https://vitejs.dev/) to create the bundle and [Tweakpane](https://github.com/cocopon/tweakpane) for live updates.

# Before we start
This has been developed with NodeJS `16.11.0`; it should work with other versions too, but in case something doesn't work I recommend to switch to version `16.11.0` with [nvm](https://github.com/nvm-sh/nvm).

## Setup
```shell
$ yarn install
```

## Develop

Run

```shell
$ yarn dev
```

then open a new browser window and navigate to `http://localhost:1234`

## Debug panel (Tweakpane + Stats.js)
The template uses dynamic imports to include the code to run the debug and performance panels. To display them, simply append `debug` to the URL's hash, i.e. `http://localhost:1234#debug`, or set the `debug` option to `true` in the app config object in `/src/index.js`.

## Physics (cannon-es)
Since `v1.5.0`, the template features a basic physics setup with [cannon-es](https://github.com/pmndrs/cannon-es) that can be enabled simply by appending `physics` to the URL's hash, i.e. `http://localhost:1234#physics`, or setting the `physics` option to `true` in the app config object in `/src/index.js`.

## Build

```shell
$ yarn build
```
