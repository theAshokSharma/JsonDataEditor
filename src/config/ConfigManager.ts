import * as vscode from 'vscode';

export interface EditorConfig {
  schemaPath: string;
  optionsPath?: string;
}

export class ConfigManager implements vscode.Disposable {
  private configKey = 'jsonDataEditor.config';
  private context: vscode.ExtensionContext;
  
  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async showConfigScreen(): Promise<EditorConfig | null> {
    // Create webview panel for configuration
    const panel = vscode.window.createWebviewPanel(
      'jsonDataEditorConfig',
      'JSON Data Editor - Configuration',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    
    panel.webview.html = this.getConfigHtml();
    
    return new Promise((resolve) => {
      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
          case 'confirm':
            const config: EditorConfig = {
              schemaPath: message.schemaPath,
              optionsPath: message.optionsPath || undefined
            };
            
            // Validate files exist
            const valid = await this.validateConfig(config);
            if (valid) {
              await this.saveConfig(config);
              panel.dispose();
              
              // IMPORTANT: Send a message to the main form to reload
              // IMPORTANT: Wait a moment for the panel to close before reloading              
              // This tells the main form to reload with new config
              setTimeout(() => {
              vscode.commands.executeCommand('json-data-editor.reloadForm');
              }, 100);
              
              resolve(config);
            } else {
              panel.webview.postMessage({
                command: 'validationError',
                message: 'One or more files do not exist. Please check the file paths.'
              });
            }
            break;
            
          case 'cancel':
            panel.dispose();
            resolve(null);
            break;
            
          case 'browseSchema':
            const schemaUri = await this.browseForFile('Select Schema JSON File', 'json');
            if (schemaUri) {
              panel.webview.postMessage({
                command: 'updateSchemaPath',
                path: schemaUri.fsPath
              });
            }
            break;
            
          case 'browseOptions':
            const optionsUri = await this.browseForFile('Select Options JSON File (Optional)', 'json');
            if (optionsUri) {
              panel.webview.postMessage({
                command: 'updateOptionsPath',
                path: optionsUri.fsPath
              });
            }
            break;
        }
      });
    });
  }

  private async browseForFile(title: string, fileType: string): Promise<vscode.Uri | null> {
    const uris = await vscode.window.showOpenDialog({
      title,
      filters: { [`${fileType.toUpperCase()} files`]: [fileType], 'All files': ['*'] },
      canSelectMany: false
    });
    
    return uris && uris.length > 0 ? uris[0] : null;
  }

  private async validateConfig(config: EditorConfig): Promise<boolean> {
    try {
      // Check schema file exists
      await vscode.workspace.fs.stat(vscode.Uri.file(config.schemaPath));
      
      // Check options file exists if provided
      if (config.optionsPath) {
        await vscode.workspace.fs.stat(vscode.Uri.file(config.optionsPath));
      }
      
      return true;
    } catch {
      return false;
    }
  }

  private getConfigHtml(): string {
    const existingConfig = this.getConfig();
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>JSON Data Editor Configuration</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 30px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            max-width: 800px;
            margin: 0 auto;
          }
          .config-container {
            background-color: var(--vscode-input-background);
            border-radius: 6px;
            padding: 30px;
            border: 1px solid var(--vscode-input-border);
          }
          h2 {
            margin-top: 0;
            margin-bottom: 25px;
            color: var(--vscode-textLink-foreground);
            border-bottom: 2px solid var(--vscode-textLink-foreground);
            padding-bottom: 10px;
          }
          .form-group {
            margin-bottom: 25px;
          }
          label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            font-size: 14px;
          }
          .input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 5px;
          }
          input[type="text"] {
            flex: 1;
            padding: 10px 12px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-family: var(--vscode-font-family);
            font-size: 14px;
          }
          input[type="text"]:focus {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: -1px;
          }
          .browse-btn {
            padding: 10px 20px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            white-space: nowrap;
          }
          .browse-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
          }
          .required::after {
            content: " *";
            color: var(--vscode-errorForeground);
          }
          .file-info {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .file-info::before {
            content: "📄";
          }
          .optional {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            margin-left: 5px;
            font-weight: normal;
          }
          .error-message {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 12px;
            border-radius: 4px;
            margin: 20px 0;
            display: none;
            font-size: 13px;
          }
          .buttons {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-input-border);
          }
          .confirm-btn {
            padding: 12px 24px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
          }
          .confirm-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          .cancel-btn {
            padding: 12px 24px;
            background-color: transparent;
            color: var(--vscode-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          .cancel-btn:hover {
            background-color: var(--vscode-list-hoverBackground);
          }
          .instructions {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textLink-foreground);
            padding: 15px;
            margin-bottom: 25px;
            border-radius: 2px;
          }
          .instructions h3 {
            margin-top: 0;
            color: var(--vscode-textLink-foreground);
          }
        </style>
      </head>
      <body>
        <div class="config-container">
          <h2>JSON Data Editor Configuration</h2>
          
          <div class="instructions">
            <h3>📋 Setup Instructions</h3>
            <p>1. Select your JSON schema file (required)</p>
            <p>2. Optionally select a options file for custom dropdown options</p>
            <p>3. Click "Confirm" to start editing your data</p>
          </div>
          
          <div class="error-message" id="error-message"></div>
          
          <div class="form-group">
            <label class="required">Schema JSON File</label>
            <div class="input-group">
              <input type="text" 
                     id="schemaPath" 
                     placeholder="Path to your schema.json file"
                     value="${existingConfig?.schemaPath || ''}">
              <button class="browse-btn" onclick="browseSchema()">Browse</button>
            </div>
            <div class="file-info" id="schema-info">
              ${existingConfig?.schemaPath ? `Current: ${existingConfig.schemaPath}` : 'No schema file selected'}
            </div>
          </div>
          
          <div class="form-group">
            <label>Options JSON File <span class="optional">(optional)</span></label>
            <div class="input-group">
              <input type="text" 
                     id="optionsPath" 
                     placeholder="Path to your options.json file"
                     value="${existingConfig?.optionsPath || ''}">
              <button class="browse-btn" onclick="browseOptions()">Browse</button>
            </div>
            <div class="file-info" id="options-info">
              ${existingConfig?.optionsPath ? `Current: ${existingConfig.optionsPath}` : 'No options file selected'}
            </div>
          </div>
          
          <div class="buttons">
            <button class="cancel-btn" onclick="cancel()">Cancel</button>
            <button class="confirm-btn" onclick="confirmConfig()">Confirm & Continue</button>
          </div>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          function showError(message) {
            const errorEl = document.getElementById('error-message');
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => {
              errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
          
          function hideError() {
            document.getElementById('error-message').style.display = 'none';
          }
          
          function updateFileInfo(fieldId, path) {
            const infoEl = document.getElementById(fieldId + '-info');
            if (path) {
              infoEl.textContent = 'Selected: ' + path;
              infoEl.style.color = 'var(--vscode-charts-green)';
            } else {
              infoEl.textContent = fieldId === 'schema' ? 'No schema file selected' : 'No options file selected';
              infoEl.style.color = 'var(--vscode-descriptionForeground)';
            }
          }
          
          function browseSchema() {
            vscode.postMessage({ command: 'browseSchema' });
          }
          
          function browseOptions() {
            vscode.postMessage({ command: 'browseOptions' });
          }
          
          function confirmConfig() {
            const schemaPath = document.getElementById('schemaPath').value.trim();
            const optionsPath = document.getElementById('optionsPath').value.trim();
            
            hideError();
            
            if (!schemaPath) {
              showError('Please select a schema JSON file');
              document.getElementById('schemaPath').focus();
              return;
            }
            
            vscode.postMessage({
              command: 'confirm',
              schemaPath: schemaPath,
              optionsPath: optionsPath || undefined
            });
          }
          
          function cancel() {
            vscode.postMessage({ command: 'cancel' });
          }
          
          // Listen for messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
              case 'updateSchemaPath':
                document.getElementById('schemaPath').value = message.path;
                updateFileInfo('schema', message.path);
                hideError();
                break;
                
              case 'updateOptionsPath':
                document.getElementById('optionsPath').value = message.path;
                updateFileInfo('options', message.path);
                hideError();
                break;
                
              case 'validationError':
                showError(message.message);
                break;
            }
          });
          
          // Initialize file info displays
          updateFileInfo('schema', '${existingConfig?.schemaPath || ''}');
          updateFileInfo('options', '${existingConfig?.optionsPath || ''}');
        </script>
      </body>
      </html>
    `;
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
