/* global module */
/* global __dirname */

const isProduction = process.env.NODE_ENV === 'production';

const ExtractTextPlugin = require('extract-text-webpack-plugin');

let plugins = [
    new ExtractTextPlugin('popup-search.css')
];

if (isProduction) {
    const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

    plugins.push(
        new UglifyJsPlugin({
            uglifyOptions: {
                ecma: 6,
                compress: {
                    drop_console: true,
                    warnings: true,
                }
            }
        })
    );
}

module.exports = {
    entry: './src/js/popup/search.js',

    output: {
        path: __dirname + '/build/assets/',
        filename: 'popup-search.js'
    },

    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader'
            },
            {
                test: /\.scss$/,
                loader: ExtractTextPlugin.extract({
                    use: [
                        {
                            loader: 'css-loader',
                            options: {
                                minimize: isProduction,
                            }
                        },
                        {
                            loader: 'sass-loader',
                        }
                    ]
                })
            },
        ]
    },

    plugins: plugins
};
