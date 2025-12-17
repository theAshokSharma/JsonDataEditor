import * as vscode from 'vscode';

type MessageCallback = (data: any, webviewPanel: vscode.WebviewPanel) => void;

export class MessageHandler {
  private callbacks: Map<string, MessageCallback[]> = new Map();

  constructor() {
    // Empty constructor - no webview dependency
  }

  handleMessage(webviewPanel: vscode.WebviewPanel, message: any): void {
    const callbacks = this.callbacks.get(message.command);
    if (callbacks) {
      callbacks.forEach(callback => callback(message.data, webviewPanel));
    }
  }

  on(command: string, callback: MessageCallback): void {
    if (!this.callbacks.has(command)) {
      this.callbacks.set(command, []);
    }
    this.callbacks.get(command)!.push(callback);
  }

  postMessage(webview: vscode.Webview, command: string, data?: any): void {
    webview.postMessage({ command, data });
  }
}