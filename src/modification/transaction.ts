/**
 * Transaction support for atomic modifications
 */

import type { TONLValue } from '../types.js';

export interface Change {
  type: 'set' | 'delete' | 'push' | 'pop';
  path: string;
  oldValue?: any;
  newValue?: any;
}

export class Transaction {
  private changes: Change[] = [];
  private snapshot: any;
  private committed = false;

  constructor(private data: any) {
    this.snapshot = JSON.parse(JSON.stringify(data));
  }

  recordChange(change: Change): void {
    if (this.committed) {
      throw new Error('Transaction already committed');
    }
    this.changes.push(change);
  }

  commit(): Change[] {
    this.committed = true;
    return this.changes;
  }

  rollback(): any {
    return this.snapshot;
  }

  getChanges(): Change[] {
    return [...this.changes];
  }
}
