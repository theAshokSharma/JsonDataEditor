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
        await SchemaEditorPanel.createOrShow(
          context.extensionUri, 
          existingConfig,
          SchemaEditorPanel.currentPanel
        );
      } else {
        // No config, show config screen first
        const config = await configManager.showConfigScreen();
        if (config) {
          await SchemaEditorPanel.createOrShow(
            context.extensionUri, 
            config,
            SchemaEditorPanel.currentPanel
          );
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
        await SchemaEditorPanel.createOrShow(
          context.extensionUri, 
          config,
          SchemaEditorPanel.currentPanel
        );
      }
    }
  );

  // Register command to reload form with new schema
  const reloadCommand = vscode.commands.registerCommand(
    'json-data-editor.reloadForm',
    async () => {
      const config = configManager.getConfig();
      if (!config) {
        vscode.window.showErrorMessage('Please configure the extension first.');
        return;
      }
      
      await SchemaEditorPanel.updateCurrentPanel(config);
    }
  );

  context.subscriptions.push(
    editorCommand, 
    configCommand, 
    reloadCommand, 
    configManager
  );
}

export function deactivate() {
  // Cleanup if needed
}
