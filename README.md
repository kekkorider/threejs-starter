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

## Debug
The template uses dynamic imports to include the code to run the debug panel. To display it, simply append `#debug` to the URL, i.e. `http://localhost:1234#debug`.

## Build

```shell
$ yarn build
```
