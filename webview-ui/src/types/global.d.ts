import * as React from "react";

export interface WebviewApi<T> {
  postMessage(message: unknown): void;
  getState(): T | undefined;
  setState(newState: T): void;
}

declare global {
  interface Window {
    acquireVsCodeApi: <T = unknown>() => WebviewApi<T>;
  }
  const acquireVsCodeApi: <T = unknown>() => WebviewApi<T>;

  namespace JSX {
    interface IntrinsicElements {
      "vscode-button": any;
      "vscode-text-field": any;
      "vscode-text-area": any;
      "vscode-data-grid": any;
      "vscode-data-grid-row": any;
      "vscode-data-grid-cell": any;
      "vscode-progress-ring": any;
      "vscode-dropdown": any;
      "vscode-option": any;
    }
  }
}
