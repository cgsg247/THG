const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const terser = require('@rollup/plugin-terser');

module.exports = {
    input: "src/client/main.js",
    output: {
        file: 'dist/bundle.js',
        format: "iife",
        sourcemap: 'inline',
    },
    plugins: [
        resolve({
            browser: true,
        }),
        commonjs(),
        //terser()
    ],
};