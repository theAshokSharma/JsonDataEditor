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
    this._config = config;
    this._fileLoader = new FileLoader();
    this._formRenderer = new FormRenderer(extensionUri);
    this._messageHandler = new MessageHandler();

    // Set up panel events
    this.setupPanelEvents();
    
    // Initialize the panel content
    this.initializePanel();
    
    // Set up message handlers
    this.setupMessageHandlers();
  }

  private setupPanelEvents() {
    // Handle panel disposal
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle visibility changes
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible && this._isLoading) {
          this.refreshPanel();
        }
      },
      null,
      this._disposables
    );
  }

  private async initializePanel() {
    this._isLoading = true;
    
    console.log('initializePanel called with config:', this._config);
    
    try {
      // Load schema
      console.log('Loading schema from:', this._config.schemaPath);
      const schema = await this._fileLoader.loadSchema(this._config.schemaPath);
      console.log('Schema loaded successfully, properties:', Object.keys(schema.properties || {}));
      
      // Load choices if provided
      let choices = {};
      if (this._config.choicesPath) {
        console.log('Loading choices from:', this._config.choicesPath);
        try {
          choices = await this._fileLoader.loadChoices(this._config.choicesPath);
          console.log('Choices loaded successfully, keys:', Object.keys(choices));
        } catch (error) {
          console.warn('Failed to load choices file:', error);
        }
      }
      
      // Load data if provided
      let initialData = {};
      if (this._config.dataPath) {
        console.log('Loading data from:', this._config.dataPath);
        try {
          initialData = await this._fileLoader.loadData(this._config.dataPath);
          console.log('Data loaded successfully, keys:', Object.keys(initialData));
        } catch (error) {
          console.warn('Failed to load initial data:', error);
        }
      }
      
      // Render form with loaded data
      console.log('Calling FormRenderer.renderForm...');
      this._panel.webview.html = this._formRenderer.renderForm(schema, choices, initialData);
      console.log('Form rendered and set to webview');
      
      this._isLoading = false;
      
    } catch (error: any) {
      console.error('initializePanel error:', error);
      console.error('Stack:', error.stack);
      this._panel.webview.html = this._formRenderer.renderError(error.message);
      vscode.window.showErrorMessage(`Failed to initialize editor: ${error.message}`);
      this._isLoading = false;
    }
  }

  private refreshPanel() {
    if (!this._isLoading) {
      this.initializePanel();
    }
  }

  private setupMessageHandlers() {
    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        this._messageHandler.handleMessage(this._panel, message);
      },
      null,
      this._disposables
    );

    // Register message handlers
    this._messageHandler.on('loadData', async (data, panel) => {
      try {
        const loadedData = await this._fileLoader.loadDataFromDialog();
        if (loadedData) {
          this._messageHandler.postMessage(panel.webview, 'dataLoaded', loadedData);
          vscode.window.showInformationMessage('Data loaded successfully');
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to load data: ${error.message}`);
      }
    });

    this._messageHandler.on('saveJson', async (data, panel) => {
      try {
        await this._fileLoader.saveJsonToFile(data);
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to save file: ${error.message}`);
      }
    });

    this._messageHandler.on('exportJson', async (data, panel) => {
      try {
        await this._fileLoader.exportToClipboard(data);
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to export to clipboard: ${error.message}`);
      }
    });

    this._messageHandler.on('openConfig', async (data, panel) => {
      vscode.commands.executeCommand('json-data-editor.openConfig');
    });

    this._messageHandler.on('showNotification', (data, panel) => {
      if (data && data.text) {
        vscode.window.showInformationMessage(data.text);
      }
    });

    this._messageHandler.on('reportIssue', (data, panel) => {
      const errorMessage = data.error || 'Unknown error';
      vscode.window.showErrorMessage(`Issue reported: ${errorMessage}`);
    });
  }

  private getLoadingHtml(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Loading JSON Editor</title>
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
          .loading-container {
            text-align: center;
            max-width: 400px;
            padding: 40px;
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid var(--vscode-input-border);
            border-top: 4px solid var(--vscode-progressBar-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 {
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
          }
          p {
            margin: 10px 0;
            color: var(--vscode-descriptionForeground);
          }
          .loading-steps {
            text-align: left;
            margin: 20px 0;
            padding: 0;
            list-style: none;
          }
          .loading-steps li {
            margin: 10px 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .loading-steps li::before {
            content: "⏳";
            font-size: 18px;
          }
          .loading-steps li.loaded::before {
            content: "✅";
          }
          .loading-steps li.error::before {
            content: "❌";
          }
        </style>
      </head>
      <body>
        <div class="loading-container">
          <div class="spinner"></div>
          <h2>Loading JSON Data Editor</h2>
          <p>Please wait while we load your schema and configuration...</p>
          
          <ul class="loading-steps">
            <li id="step-schema">Loading schema file...</li>
            <li id="step-choices">Loading choices file...</li>
            <li id="step-data">Loading initial data...</li>
            <li id="step-render">Rendering form...</li>
          </ul>
        </div>
        
        <script>
          // Update loading steps dynamically
          setTimeout(() => {
            document.getElementById('step-schema').textContent = 'Schema file loaded ✓';
            document.getElementById('step-schema').classList.add('loaded');
          }, 800);
          
          setTimeout(() => {
            document.getElementById('step-choices').textContent = 'Choices file loaded ✓';
            document.getElementById('step-choices').classList.add('loaded');
          }, 1200);
          
          setTimeout(() => {
            document.getElementById('step-data').textContent = 'Initial data loaded ✓';
            document.getElementById('step-data').classList.add('loaded');
          }, 1600);
        </script>
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