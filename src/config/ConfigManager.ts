import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface EditorConfig {
  schemaPath: string;
  choicesPath?: string;
  dataPath?: string;
}

export class ConfigManager implements vscode.Disposable {
  private configKey = 'jsonDataEditor.config';
  private context: vscode.ExtensionContext;
  
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async promptForConfiguration(): Promise<EditorConfig | null> {
    // Create quick pick for file selection
    const schemaUri = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Select Schema JSON',
      filters: { 'JSON files': ['json'] }
    });
    
    if (!schemaUri || schemaUri.length === 0) {
      return null; // User cancelled
    }

    const choicesUri = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Select Choices JSON (Optional)',
      filters: { 'JSON files': ['json'] }
    });

    const dataUri = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Select Data JSON (Optional)',
      filters: { 'JSON files': ['json'] }
    });

    const config: EditorConfig = {
      schemaPath: schemaUri[0].fsPath,
      choicesPath: choicesUri && choicesUri.length > 0 ? choicesUri[0].fsPath : undefined,
      dataPath: dataUri && dataUri.length > 0 ? dataUri[0].fsPath : undefined
    };

    await this.saveConfig(config);
    return config;
  }

  async saveConfig(config: EditorConfig): Promise<void> {
    await this.context.globalState.update(this.configKey, config);
  }

  getConfig(): EditorConfig | undefined {
    return this.context.globalState.get<EditorConfig>(this.configKey);
  }

  dispose() {
    // Clean up resources if needed
  }
}
