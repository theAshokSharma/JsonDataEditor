import * as vscode from 'vscode';

export class FileLoader {
  async loadSchema(filePath: string): Promise<any> {
    return this.loadJsonFile(filePath, 'Invalid JSON schema file');
  }

  async loadChoices(filePath: string): Promise<any> {
    return this.loadJsonFile(filePath, 'Invalid JSON choices file');
  }

  async loadData(filePath: string): Promise<any> {
    return this.loadJsonFile(filePath, 'Invalid JSON data file');
  }

  async loadDataFromDialog(): Promise<any | null> {
    const options: vscode.OpenDialogOptions = {
      canSelectMany: false,
      openLabel: 'Open Data File',
      filters: {
        'JSON files': ['json'],
        'All files': ['*']
      }
    };

    const fileUri = await vscode.window.showOpenDialog(options);
    if (fileUri && fileUri[0]) {
      return await this.loadData(fileUri[0].fsPath);
    }
    return null;
  }

  async saveJsonToFile(data: any): Promise<void> {
    const options: vscode.SaveDialogOptions = {
      saveLabel: 'Save JSON',
      filters: {
        'JSON files': ['json'],
        'All files': ['*']
      }
    };

    const fileUri = await vscode.window.showSaveDialog(options);
    if (fileUri) {
      const jsonString = JSON.stringify(data, null, 2);
      await vscode.workspace.fs.writeFile(
        fileUri,
        Buffer.from(jsonString, 'utf8')
      );
      vscode.window.showInformationMessage('JSON file saved successfully');
    }
  }

  async exportToClipboard(data: any): Promise<void> {
    const jsonString = JSON.stringify(data, null, 2);
    await vscode.env.clipboard.writeText(jsonString);
    vscode.window.showInformationMessage('JSON copied to clipboard');
  }

  private async loadJsonFile(filePath: string, errorMessage: string): Promise<any> {
    try {
      // FIX: Use workspace.fs.readFile instead of openTextDocument
      // This reads directly from disk without caching
      const uri = vscode.Uri.file(filePath);
      const fileContent = await vscode.workspace.fs.readFile(uri);
      const text = Buffer.from(fileContent).toString('utf8');
      
      // Parse and return the JSON
      const jsonData = JSON.parse(text);
      return jsonData;
    } catch (error) {
      vscode.window.showErrorMessage(`${errorMessage}: ${error}`);
      throw error;
    }
  }  
}