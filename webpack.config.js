const path = require("path");

const extensionConfig = {
  name: "extension",
  target: "node",
  mode: "production", // defaults to production
  entry: "./src/extension.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs",
  },
  externals: {
    vscode: "commonjs vscode",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.json",
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  devtool: "nosources-source-map",
};

const webviewConfig = {
  name: "webview",
  target: "web",
  mode: "production",
  entry: "./webview-ui/src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "webview.js",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".css"],
    fallback: {
      // Polyfills if needed, but usually not for webview unless using node modules
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: path.resolve(__dirname, "webview-ui/tsconfig.json"),
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  devtool: "nosources-source-map",
};

module.exports = [extensionConfig, webviewConfig];
