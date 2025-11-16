/**
 * TONL Document Tree Provider (T039)
 *
 * Provides a tree view for exploring TONL document structure.
 * Features real-time parsing, type-aware icons, and interactive navigation.
 */

import * as vscode from 'vscode';
import { decodeTONL } from 'tonl';

export class TONLTreeDataProvider implements vscode.TreeDataProvider<TONLTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TONLTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private parsedData: any = null;
  private document: vscode.TextDocument | null = null;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TONLTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TONLTreeItem): Promise<TONLTreeItem[]> {
    const editor = vscode.window.activeTextEditor;

    // No active editor or not a TONL file
    if (!editor || editor.document.languageId !== 'tonl') {
      return [];
    }

    // Parse document if not already parsed or document changed
    if (this.document !== editor.document) {
      this.document = editor.document;
      try {
        const text = editor.document.getText();
        this.parsedData = decodeTONL(text);
      } catch (error) {
        // If parsing fails, show error message
        return [
          new TONLTreeItem(
            'Parse Error',
            vscode.TreeItemCollapsibleState.None,
            error instanceof Error ? error.message : 'Unknown error',
            'error'
          )
        ];
      }
    }

    // Root level - show all top-level keys
    if (!element) {
      if (this.parsedData === null || this.parsedData === undefined) {
        return [];
      }

      return this.buildTreeItems(this.parsedData, '');
    }

    // Children of an element
    if (element.value !== undefined && element.value !== null) {
      return this.buildTreeItems(element.value, element.path);
    }

    return [];
  }

  private buildTreeItems(data: any, parentPath: string = ''): TONLTreeItem[] {
    const items: TONLTreeItem[] = [];

    if (Array.isArray(data)) {
      // Array items
      data.forEach((item, index) => {
        const path = parentPath ? `${parentPath}[${index}]` : `[${index}]`;
        const collapsibleState = this.getCollapsibleState(item);

        items.push(
          new TONLTreeItem(
            `[${index}]`,
            collapsibleState,
            item,
            this.getValueType(item),
            path
          )
        );
      });
    } else if (typeof data === 'object' && data !== null) {
      // Object properties
      Object.entries(data).forEach(([key, value]) => {
        const path = parentPath ? `${parentPath}.${key}` : key;
        const collapsibleState = this.getCollapsibleState(value);

        items.push(
          new TONLTreeItem(
            key,
            collapsibleState,
            value,
            this.getValueType(value),
            path
          )
        );
      });
    }

    return items;
  }

  private getCollapsibleState(value: any): vscode.TreeItemCollapsibleState {
    if (Array.isArray(value) && value.length > 0) {
      return vscode.TreeItemCollapsibleState.Collapsed;
    } else if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) {
      return vscode.TreeItemCollapsibleState.Collapsed;
    }
    return vscode.TreeItemCollapsibleState.None;
  }

  private getValueType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    return 'unknown';
  }
}

export class TONLTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly value?: any,
    public readonly valueType?: string,
    public readonly path?: string
  ) {
    super(label, collapsibleState);

    // Set description based on value type
    if (collapsibleState === vscode.TreeItemCollapsibleState.None && value !== undefined) {
      this.description = this.formatValue(value);
    } else if (valueType === 'array' && Array.isArray(value)) {
      this.description = `[${value.length}]`;
    } else if (valueType === 'object' && value !== null) {
      const keys = Object.keys(value);
      this.description = `{${keys.length} properties}`;
    }

    // Set tooltip
    this.tooltip = this.buildTooltip();

    // Set icon based on type
    this.iconPath = this.getIcon();

    // Set context value for commands
    this.contextValue = valueType;
  }

  private formatValue(value: any): string {
    if (value === null) return 'null';
    if (typeof value === 'string') {
      // Truncate long strings
      const str = value.length > 50 ? value.substring(0, 47) + '...' : value;
      return `"${str}"`;
    }
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'number') return String(value);
    return '';
  }

  private buildTooltip(): string {
    let tooltip = `${this.label}`;

    if (this.valueType) {
      tooltip += ` (${this.valueType})`;
    }

    if (this.path) {
      tooltip += `\nPath: ${this.path}`;
    }

    if (this.collapsibleState === vscode.TreeItemCollapsibleState.None && this.value !== undefined) {
      const valueStr = typeof this.value === 'string'
        ? `"${this.value}"`
        : String(this.value);
      tooltip += `\nValue: ${valueStr}`;
    }

    return tooltip;
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.valueType) {
      case 'object':
        return new vscode.ThemeIcon('symbol-class');
      case 'array':
        return new vscode.ThemeIcon('symbol-array');
      case 'string':
        return new vscode.ThemeIcon('symbol-string');
      case 'number':
        return new vscode.ThemeIcon('symbol-number');
      case 'boolean':
        return new vscode.ThemeIcon('symbol-boolean');
      case 'null':
        return new vscode.ThemeIcon('symbol-null');
      case 'error':
        return new vscode.ThemeIcon('error');
      default:
        return new vscode.ThemeIcon('symbol-field');
    }
  }
}
