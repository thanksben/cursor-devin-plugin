import * as React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "vscode-button": any;
      "vscode-data-grid": any;
      "vscode-data-grid-cell": any;
      "vscode-data-grid-row": any;
      "vscode-text-field": any;
      "vscode-text-area": any;
      "vscode-progress-ring": any;
      "vscode-tag": any;
    }
  }
}
