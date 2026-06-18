const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const terser = require('@rollup/plugin-terser');
const url = require('@rollup/plugin-url'); 

module.exports = {
    input: "src/client/main.js",
    output: {
        file: 'dist/bundle.js',
        format: "iife",
        sourcemap: 'inline',
    },
    plugins: [
        url({
            include: ['**/*.mp3', '**/*.wav', '**/*.ogg'], 
            limit: 0, 
            fileName: '[name][extname]', 
            destDir: 'dist' 
        }),
        resolve({
            browser: true,
        }),
        commonjs(),
        //terser()
    ],
};
