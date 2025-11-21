import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";
import {
  provideVSCodeDesignSystem,
  vsCodeButton,
  vsCodeDataGrid,
  vsCodeDataGridCell,
  vsCodeDataGridRow,
  vsCodeTextField,
  vsCodeTextArea,
  vsCodeProgressRing,
} from "@vscode/webview-ui-toolkit";

provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeDataGrid(),
  vsCodeDataGridCell(),
  vsCodeDataGridRow(),
  vsCodeTextField(),
  vsCodeTextArea(),
  vsCodeProgressRing()
);

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
