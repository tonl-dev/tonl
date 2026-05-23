"use strict";
/**
 * TONL Document Tree Provider (T039)
 *
 * Provides a tree view for exploring TONL document structure.
 * Features real-time parsing, type-aware icons, and interactive navigation.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TONLTreeItem = exports.TONLTreeDataProvider = void 0;
const vscode = __importStar(require("vscode"));
const tonl_1 = require("tonl");
class TONLTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.parsedData = null;
        this.document = null;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
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
                this.parsedData = (0, tonl_1.decodeTONL)(text);
            }
            catch (error) {
                // If parsing fails, show error message
                return [
                    new TONLTreeItem('Parse Error', vscode.TreeItemCollapsibleState.None, error instanceof Error ? error.message : 'Unknown error', 'error')
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
    buildTreeItems(data, parentPath = '') {
        const items = [];
        if (Array.isArray(data)) {
            // Array items
            data.forEach((item, index) => {
                const path = parentPath ? `${parentPath}[${index}]` : `[${index}]`;
                const collapsibleState = this.getCollapsibleState(item);
                items.push(new TONLTreeItem(`[${index}]`, collapsibleState, item, this.getValueType(item), path));
            });
        }
        else if (typeof data === 'object' && data !== null) {
            // Object properties
            Object.entries(data).forEach(([key, value]) => {
                const path = parentPath ? `${parentPath}.${key}` : key;
                const collapsibleState = this.getCollapsibleState(value);
                items.push(new TONLTreeItem(key, collapsibleState, value, this.getValueType(value), path));
            });
        }
        return items;
    }
    getCollapsibleState(value) {
        if (Array.isArray(value) && value.length > 0) {
            return vscode.TreeItemCollapsibleState.Collapsed;
        }
        else if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) {
            return vscode.TreeItemCollapsibleState.Collapsed;
        }
        return vscode.TreeItemCollapsibleState.None;
    }
    getValueType(value) {
        if (value === null)
            return 'null';
        if (Array.isArray(value))
            return 'array';
        if (typeof value === 'object')
            return 'object';
        if (typeof value === 'string')
            return 'string';
        if (typeof value === 'number')
            return 'number';
        if (typeof value === 'boolean')
            return 'boolean';
        return 'unknown';
    }
}
exports.TONLTreeDataProvider = TONLTreeDataProvider;
class TONLTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, value, valueType, path) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.value = value;
        this.valueType = valueType;
        this.path = path;
        // Set description based on value type
        if (collapsibleState === vscode.TreeItemCollapsibleState.None && value !== undefined) {
            this.description = this.formatValue(value);
        }
        else if (valueType === 'array' && Array.isArray(value)) {
            this.description = `[${value.length}]`;
        }
        else if (valueType === 'object' && value !== null) {
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
    formatValue(value) {
        if (value === null)
            return 'null';
        if (typeof value === 'string') {
            // Truncate long strings
            const str = value.length > 50 ? value.substring(0, 47) + '...' : value;
            return `"${str}"`;
        }
        if (typeof value === 'boolean')
            return String(value);
        if (typeof value === 'number')
            return String(value);
        return '';
    }
    buildTooltip() {
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
    getIcon() {
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
exports.TONLTreeItem = TONLTreeItem;
//# sourceMappingURL=tree-provider.js.map