// const resolve = require("@rollup/plugin-node-resolve");
// const commonjs = require("@rollup/plugin-commonjs");
// const terser = require('@rollup/plugin-terser');

// module.exports = {
//     input: "src/client/main.js",
//     output: {
//         file: 'dist/bundle.js',
//         format: "iife",
//         //sourcemap: "inline",
//     },
//     plugins: [
//         resolve({
//             jsnext: true,
//             main: true,
//             browser: true,
//         }),
//         commonjs(),
//         terser()
//     ],
// };

const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const terser = require('@rollup/plugin-terser');

module.exports = {
    input: "src/client/main.js",
    external: ['three'],
    output: {
        file: 'dist/bundle.js',
        format: "iife",
        // 1. Изменяем 'inline' на true. Карта кода будет создаваться в ОТДЕЛЬНОМ файле bundle.js.map.
        // Это мгновенно разгрузит оперативную память при сборке.
        sourcemap: true,
    },
    plugins: [
        resolve({
            // Опции jsnext и main устарели, для современных версий плагина достаточно browser: true
            browser: true,
        }),
        commonjs()//,
        // 2. Жестко ограничиваем Terser, чтобы он не перегружал процессор и RAM
        // terser({
        //     maxWorkers: 1, // Запускаем строго в один поток
        //     compress: {
        //         passes: 1, // Отключаем повторные циклы оптимизации
        //     }
        // })
    ],
};