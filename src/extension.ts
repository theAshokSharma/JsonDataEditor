import * as vscode from 'vscode';
import { SchemaEditorPanel } from './panel/SchemaEditorPanel';
import { ConfigManager } from './config/ConfigManager';

export function activate(context: vscode.ExtensionContext) {
  // Initialize config manager
  const configManager = new ConfigManager(context);
  
  // Register command to open configuration
  const configCommand = vscode.commands.registerCommand(
    'json-data-editor.openConfig',
    async () => {
      const config = await configManager.promptForConfiguration();
      if (config) {
        // Open editor after successful configuration
        SchemaEditorPanel.createOrShow(context.extensionUri, config);
      }
    }
  );

  // Register command to open editor directly (if already configured)
  const editorCommand = vscode.commands.registerCommand(
    'json-data-editor.openEditor',
    async () => {
      const config = configManager.getConfig();
      if (config) {
        SchemaEditorPanel.createOrShow(context.extensionUri, config);
      } else {
        vscode.window.showInformationMessage(
          'Please configure schema and choices files first',
          'Configure'
        ).then(selection => {
          if (selection === 'Configure') {
            configManager.promptForConfiguration();
          }
        });
      }
    }
  );

  context.subscriptions.push(configCommand, editorCommand, configManager);
}

export function deactivate() {}
