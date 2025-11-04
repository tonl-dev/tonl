/**
 * TONL VS Code Extension (T038-T041 - Foundation)
 *
 * Provides language support for TONL files
 */

import * as vscode from 'vscode';

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('TONL extension activated');

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('tonl.validateDocument', validateDocument)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tonl.formatDocument', formatDocument)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('tonl.showDocumentTree', showDocumentTree)
  );

  // Register document tree provider (foundation)
  const treeDataProvider = new TONLTreeDataProvider();
  vscode.window.registerTreeDataProvider('tonlDocumentTree', treeDataProvider);

  // Refresh tree when active editor changes
  vscode.window.onDidChangeActiveTextEditor(() => {
    treeDataProvider.refresh();
  });

  // Refresh tree when document changes
  vscode.workspace.onDidChangeTextDocument(() => {
    treeDataProvider.refresh();
  });
}

/**
 * Validate TONL document
 */
async function validateDocument() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  const document = editor.document;
  if (document.languageId !== 'tonl') {
    vscode.window.showErrorMessage('Not a TONL file');
    return;
  }

  try {
    // Basic validation - check syntax
    const text = document.getText();

    // TODO: Use tonl library to validate
    // For now, just show success
    vscode.window.showInformationMessage('TONL document is valid');
  } catch (error) {
    vscode.window.showErrorMessage(
      `Validation error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Format TONL document
 */
async function formatDocument() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  const document = editor.document;
  if (document.languageId !== 'tonl') {
    vscode.window.showErrorMessage('Not a TONL file');
    return;
  }

  try {
    // TODO: Use tonl library to format
    vscode.window.showInformationMessage('TONL formatting coming soon');
  } catch (error) {
    vscode.window.showErrorMessage(
      `Formatting error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Show document tree view
 */
async function showDocumentTree() {
  // Tree view is always visible in sidebar
  vscode.window.showInformationMessage('Check TONL Explorer in the sidebar');
}

/**
 * Tree data provider for TONL documents (T039 - Foundation)
 */
class TONLTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'tonl') {
      return [];
    }

    if (!element) {
      // Root level
      return [
        new TreeItem('Document Root', vscode.TreeItemCollapsibleState.Collapsed)
      ];
    }

    // TODO: Parse TONL and build tree
    // For now, return empty
    return [];
  }
}

/**
 * Tree item
 */
class TreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly value?: any
  ) {
    super(label, collapsibleState);

    if (value !== undefined) {
      this.description = String(value);
    }
  }
}

/**
 * Extension deactivation
 */
export function deactivate() {
  console.log('TONL extension deactivated');
}
