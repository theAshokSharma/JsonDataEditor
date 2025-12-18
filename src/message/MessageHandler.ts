import * as vscode from 'vscode';

type MessageCallback = (data: any, webviewPanel: vscode.WebviewPanel) => void;

export class MessageHandler {
  private callbacks: Map<string, MessageCallback[]> = new Map();

  constructor() {
    // Empty constructor - no webview dependency
  }

  handleMessage(webviewPanel: vscode.WebviewPanel, message: any): void {
    if (!message || !message.command) {
      console.warn('Received invalid message:', message);
      return;
    }

    const callbacks = this.callbacks.get(message.command);
    if (callbacks) {
      // console.log(`Handling message: ${message.command}`);
      
      try {
        callbacks.forEach(callback => {
          try {
            callback(message.data, webviewPanel);
          } catch (error: any) {
            console.error(`Error in callback for command "${message.command}":`, error);
            vscode.window.showErrorMessage(`Error processing ${message.command}: ${error.message}`);
          }
        });
      } catch (error: any) {
        console.error(`Error handling message "${message.command}":`, error);
        vscode.window.showErrorMessage(`Error processing ${message.command}: ${error.message}`);
      }
    } else {
      console.warn(`No handler registered for command: ${message.command}`);
    }
  }

  on(command: string, callback: MessageCallback): void {
    if (!this.callbacks.has(command)) {
      this.callbacks.set(command, []);
    }
    this.callbacks.get(command)!.push(callback);
  }

  off(command: string, callback?: MessageCallback): void {
    if (!callback) {
      // Remove all callbacks for this command
      this.callbacks.delete(command);
      console.log(`Removed all handlers for command: ${command}`);
    } else {
      const callbacks = this.callbacks.get(command);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
          console.log(`Removed one handler for command: ${command}`);
        }
        if (callbacks.length === 0) {
          this.callbacks.delete(command);
        }
      }
    }
  }

  postMessage(webview: vscode.Webview, command: string, data?: any): void {
    try {
      webview.postMessage({ command, data });
    } catch (error) {
      console.error(`Error posting message "${command}":`, error);
    }
  }

  dispose(): void {
    this.callbacks.clear();
    console.log('MessageHandler disposed');
  }  
}