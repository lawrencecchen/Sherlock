// const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const { merge } = require("webpack-merge");
const commonConfig = require("./webpack.common.js");
const devCerts = require("office-addin-dev-certs");

module.exports = async (env, options) => {
  const config = merge(commonConfig, {
    devtool: "eval-source-map",
    devServer: {
      publicPath: "/",
      contentBase: path.resolve("dist"),
      hot: true,
      compress: true,
      overlay: {
        warnings: false,
        errors: true,
      },
      historyApiFallback: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      https: await devCerts.getHttpsServerOptions(),
      // https: {
      //     key: fs.readFileSync('/etc/letsencrypt/live/excelint-addin.westus2.cloudapp.azure.com/privkey.pem'),
      //     cert: fs.readFileSync('/etc/letsencrypt/live/excelint-addin.westus2.cloudapp.azure.com/fullchain.pem'),
      //     key: fs.readFileSync('./certs/privkey.pem'),
      //     cert: fs.readFileSync('./certs/fullchain.pem')
      // },
      allowedHosts: [
        ".amazonaws.com",
        ".azure.com",
        "localhost",
        "0.0.0.0",
        "127.0.0.1",
      ],
    },
    plugins: [new webpack.HotModuleReplacementPlugin()],
  });
  return config;
};
