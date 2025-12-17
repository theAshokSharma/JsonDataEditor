import * as vscode from 'vscode';
import { SchemaEditorPanel } from './panel/SchemaEditorPanel';
import { ConfigManager } from './config/ConfigManager';

export function activate(context: vscode.ExtensionContext) {
  // Initialize config manager
  const configManager = new ConfigManager(context);
  
  // Register command to open editor
  const editorCommand = vscode.commands.registerCommand(
    'json-data-editor.openEditor',
    async () => {
      // Check if we have existing config
      const existingConfig = configManager.getConfig();
      
      if (existingConfig && existingConfig.schemaPath) {
        // We have config, open editor directly
        SchemaEditorPanel.createOrShow(context.extensionUri, existingConfig);
      } else {
        // No config, show config screen first
        const config = await configManager.showConfigScreen();
        if (config) {
          SchemaEditorPanel.createOrShow(context.extensionUri, config);
        }
      }
    }
  );

  // Register command to open config screen
  const configCommand = vscode.commands.registerCommand(
    'json-data-editor.openConfig',
    async () => {
      const config = await configManager.showConfigScreen();
      if (config) {
        SchemaEditorPanel.createOrShow(context.extensionUri, config);
      }
    }
  );

  context.subscriptions.push(editorCommand, configCommand, configManager);
}

export function deactivate() {}