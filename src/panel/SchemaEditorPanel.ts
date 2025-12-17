import * as vscode from 'vscode';
import { EditorConfig } from '../config/ConfigManager';
import { FileLoader } from '../utils/FileLoader';
import { FormRenderer } from './FormRenderer';
import { MessageHandler } from '../message/MessageHandler';

export class SchemaEditorPanel {
  public static currentPanel: SchemaEditorPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _config: EditorConfig;
  private _extensionUri: vscode.Uri;  
  private _formRenderer: FormRenderer;
  private _fileLoader: FileLoader;
  private _messageHandler: MessageHandler;
  private _isLoading: boolean = false;

  public static async createOrShow(extensionUri: vscode.Uri, config: EditorConfig) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (SchemaEditorPanel.currentPanel) {
      SchemaEditorPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'jsonSchemaEditor',
      'JSON Data Editor',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri]
      }
    );

    try {
      SchemaEditorPanel.currentPanel = new SchemaEditorPanel(panel, extensionUri, config);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to create editor: ${error.message}`);
      panel.dispose();
    }
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, config: EditorConfig) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._config = config;
    this._fileLoader = new FileLoader();
    this._formRenderer = new FormRenderer(extensionUri);
    this._messageHandler = new MessageHandler();

    this.initializePanel();
    this.setupMessageHandlers();
    this.setupPanelEvents();
  }


  private setupPanelEvents() {
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  private async initializePanel() {
    try {
      // Show loading message
      this._panel.webview.html = this.getLoadingHtml();
      
      // Load schema
      const schema = await this._fileLoader.loadSchema(this._config.schemaPath);
      
      // Load choices if provided
      let choices = {};
      if (this._config.choicesPath) {
        try {
          choices = await this._fileLoader.loadChoices(this._config.choicesPath);
        } catch (error) {
          console.warn('Failed to load choices file:', error);
          vscode.window.showWarningMessage('Choices file could not be loaded, using schema defaults');
        }
      }
      
      // Render form with loaded data
      this._panel.webview.html = this._formRenderer.renderForm(schema, choices);
      
      // Update panel title with schema name
      const schemaTitle = schema.title || 'JSON Editor';
      this._panel.title = schemaTitle;
      
    } catch (error: any) {
      this._panel.webview.html = this._formRenderer.renderError(error.message);
      vscode.window.showErrorMessage(`Failed to initialize editor: ${error.message}`);
    }
  }

  private setupMessageHandlers() {
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        this._messageHandler.handleMessage(this._panel, message);
      },
      null,
      this._disposables
    );

    // Load data file
    this._messageHandler.on('loadData', async (data, panel) => {
      const loadedData = await this._fileLoader.loadDataFromDialog();
      if (loadedData) {
        this._messageHandler.postMessage(panel.webview, 'dataLoaded', loadedData);
        vscode.window.showInformationMessage('Data loaded successfully');
      }
    });

    // Save to file
    this._messageHandler.on('saveJson', async (data, panel) => {
      await this._fileLoader.saveJsonToFile(data);
    });

    // Export to clipboard
    this._messageHandler.on('exportJson', async (data, panel) => {
      await this._fileLoader.exportToClipboard(data);
    });

    // Open config screen
    this._messageHandler.on('openConfig', async (data, panel) => {
      // Open config command
      vscode.commands.executeCommand('json-data-editor.openConfig');
    });
  }

  private getLoadingHtml(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Loading...</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-foreground);
          }
          .loading {
            text-align: center;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--vscode-input-border);
            border-top: 3px solid var(--vscode-progressBar-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h3 {
            margin: 0;
            color: var(--vscode-textLink-foreground);
          }
          p {
            margin: 10px 0 0 0;
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="loading">
          <div class="spinner"></div>
          <h3>Loading Form...</h3>
          <p>Please wait while we load the schema</p>
        </div>
      </body>
      </html>
    `;
  }

  public dispose() {
    SchemaEditorPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}