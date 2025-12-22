import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { HtmlUtils } from '../utils/HtmlUtils';

export class FormRenderer {
  constructor(private extensionUri: vscode.Uri) {
    console.log('FormRenderer constructor - extensionUri:', extensionUri.fsPath);
  }

  renderForm(schemaInfo: any, optionsInfo: any = {}, initialData: any = {}): string {
    try {
      // First, let's find where the form.html actually is
      const templatePath = this.findFormHtml();
      // console.log('Template path found:', templatePath);
      
      if (!templatePath || !fs.existsSync(templatePath)) {
        console.error('form.html not found at any expected location');
        return this.renderError('form.html template file not found. Please check your extension installation.');
      }
      
      let html = fs.readFileSync(templatePath, 'utf8');
      // console.log('HTML template loaded, length:', html.length);
      
      // Check if the HTML has the expected structure
      if (!html.includes('<!DOCTYPE html>')) {
        console.error('HTML template does not contain doctype');
      }
      
      // Prepare data for injection
      const dataScript = this.createDataScript(schemaInfo, optionsInfo, initialData);
      // console.log('Data script created, length:', dataScript.length);
      
      // Inject data script
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${dataScript}\n</head>`);
      } else {
        console.warn('HTML does not contain </head> tag, injecting before first script');
        const firstScriptIndex = html.indexOf('<script>');
        if (firstScriptIndex !== -1) {
          html = html.slice(0, firstScriptIndex) + dataScript + html.slice(firstScriptIndex);
        } else {
          console.warn('No script tag found, injecting at end');
          html = html + dataScript;
        }
      }
      
      // Return the final HTML
      return html;
      
    } catch (error: any) {
        console.error('Error rendering form:', error);
        console.error('Stack:', error.stack);
        return this.renderError(`Failed to render form: ${error.message}`);
    }
  }


  private findFormHtml(): string | null {
    // Try multiple possible locations in order
    const possiblePaths = [
      // Development: src/media/form.html
      path.join(this.extensionUri.fsPath, 'src', 'media', 'form.html'),
      // Development: media/form.html (root)
      path.join(this.extensionUri.fsPath, 'media', 'form.html'),
      // Production: out/media/form.html
      path.join(this.extensionUri.fsPath, 'out', 'media', 'form.html'),
      // Production: dist/media/form.html
      path.join(this.extensionUri.fsPath, 'dist', 'media', 'form.html'),
      // Just in case: form.html at root
      path.join(this.extensionUri.fsPath, 'form.html'),
      // Current working directory
      path.join(process.cwd(), 'src', 'media', 'form.html'),
      path.join(process.cwd(), 'media', 'form.html'),
    ];
    
    console.log('Searching for form.html in:');
    for (const p of possiblePaths) {
      console.log(`  - ${p}: ${fs.existsSync(p) ? 'FOUND' : 'not found'}`);
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return null;
  }    

  private getMediaFilePath(filename: string): string {
    // Try multiple possible locations
    const possiblePaths = [
      // Development structure (src/media/)
      path.join(this.extensionUri.fsPath, 'src', 'media', filename),
      // Production/compiled structure (out/media/ or media/)
      path.join(this.extensionUri.fsPath, 'media', filename),
      // Root directory
      path.join(this.extensionUri.fsPath, filename),
      // VS Code extension structure
      path.join(this.extensionUri.fsPath, 'resources', 'media', filename)
    ];
    
    return possiblePaths[0]; // Default to development structure
  }
  
  private createDataScript(schemaInfo: any, optionsInfo: any, initialData: any): string {
   return `
      <script>
        // Data injected by FormRenderer
        try {
          window.currentSchema = ${JSON.stringify(schemaInfo || {})};
          window.customOptions = ${JSON.stringify(optionsInfo || {})};
          window.initialData = ${JSON.stringify(initialData || {})};
          window.definitions = ${JSON.stringify(
            (schemaInfo || {}).definitions || (schemaInfo || {}).$defs || {}
          )};
          window.conditionalRules = ${JSON.stringify(
            (optionsInfo || {}).conditional_rules || {}
          )};
          
          // Log for debugging
          // console.log('Schema loaded:', window.currentSchema && Object.keys(window.currentSchema).length > 0);
          // console.log('Options loaded:', window.customOptions && Object.keys(window.customOptions).length > 0);
          // console.log('Initial data loaded:', window.initialData && Object.keys(window.initialData).length > 0);
        } catch (error) {
          console.error('Error parsing injected data:', error);
        }
      </script>
    `;
  }

  renderError(errorMessage: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <!-- ... styles ... -->
      </head>
      <body>
        <div class="error-container">
          <h2>Error Loading JSON Data Editor</h2>
          
          <div class="error-details">
            <strong>Error:</strong> ${HtmlUtils.escapeHtml(errorMessage)}
          </div>
          
          <!-- ... rest of HTML ... -->
        </div>
        
        <script>
          // ... JavaScript ...
          console.error("FormRenderer Error:", ${HtmlUtils.safeJsonStringify(errorMessage)});
        </script>
      </body>
      </html>
    `;
  }

  getMediaFilePathPublic(filename: string): string {
    return this.getMediaFilePath(filename);
  }  
}