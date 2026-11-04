/**
 * Global Undo/Redo State Management System using the Command Pattern.
 * Encapsulates canvas mutations as reversible Command objects.
 */

import { CanvasNode, CourseManifest, Page } from '../types/schema';

export interface Command {
  readonly id: string;
  readonly description: string;
  readonly timestamp: number;
  execute(): void;
  undo(): void;
  redo?(): void;
}

export interface CommandHistoryItem {
  id: string;
  description: string;
  timestamp: number;
}

/**
 * Concrete Command: Add Node to Canvas Page
 */
export class AddNodeCommand implements Command {
  readonly id: string;
  readonly description: string;
  readonly timestamp = Date.now();

  constructor(
    private getCourse: () => CourseManifest,
    private setCourse: (c: CourseManifest) => void,
    private getPageIndex: () => number,
    private setSelectedNodeIds: (ids: string[]) => void,
    private notify: () => void,
    private node: CanvasNode,
    desc?: string
  ) {
    this.id = 'cmd_add_' + Math.random().toString(36).substring(2, 9);
    this.description = desc || `Add ${node.type.toUpperCase()} node`;
  }

  execute(): void {
    const course = this.getCourse();
    const pageIndex = this.getPageIndex();
    const page = course.pages[pageIndex];
    if (!page) return;

    if (!page.nodes.some((n) => n.id === this.node.id)) {
      page.nodes.push(JSON.parse(JSON.stringify(this.node)));
    }
    this.setSelectedNodeIds([this.node.id]);
    this.notify();
  }

  undo(): void {
    const course = this.getCourse();
    const pageIndex = this.getPageIndex();
    const page = course.pages[pageIndex];
    if (!page) return;

    page.nodes = page.nodes.filter((n) => n.id !== this.node.id);
    this.setSelectedNodeIds([]);
    this.notify();
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Concrete Command: Delete Node(s) from Canvas Page
 */
export class DeleteNodeCommand implements Command {
  readonly id: string;
  readonly description: string;
  readonly timestamp = Date.now();
  private deletedItems: Array<{ node: CanvasNode; index: number }> = [];

  constructor(
    private getCourse: () => CourseManifest,
    private setCourse: (c: CourseManifest) => void,
    private getPageIndex: () => number,
    private setSelectedNodeIds: (ids: string[]) => void,
    private notify: () => void,
    private targetNodeIds: string[],
    desc?: string
  ) {
    this.id = 'cmd_delete_' + Math.random().toString(36).substring(2, 9);
    this.description =
      desc ||
      (targetNodeIds.length === 1
        ? `Delete element #${targetNodeIds[0].slice(-4)}`
        : `Delete ${targetNodeIds.length} elements`);
  }

  execute(): void {
    const course = this.getCourse();
    const pageIndex = this.getPageIndex();
    const page = course.pages[pageIndex];
    if (!page) return;

    this.deletedItems = [];
    page.nodes.forEach((n, idx) => {
      if (this.targetNodeIds.includes(n.id)) {
        this.deletedItems.push({
          node: JSON.parse(JSON.stringify(n)),
          index: idx,
        });
      }
    });

    page.nodes = page.nodes.filter((n) => !this.targetNodeIds.includes(n.id));
    this.setSelectedNodeIds([]);
    this.notify();
  }

  undo(): void {
    const course = this.getCourse();
    const pageIndex = this.getPageIndex();
    const page = course.pages[pageIndex];
    if (!page) return;

    // Restore each node at its previous index
    this.deletedItems.forEach((item) => {
      if (!page.nodes.some((n) => n.id === item.node.id)) {
        const insertIndex = Math.min(item.index, page.nodes.length);
        page.nodes.splice(insertIndex, 0, JSON.parse(JSON.stringify(item.node)));
      }
    });

    this.setSelectedNodeIds(this.deletedItems.map((item) => item.node.id));
    this.notify();
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Concrete Command: Update / Move / Resize Nodes
 */
export class UpdateNodeCommand implements Command {
  readonly id: string;
  readonly description: string;
  readonly timestamp = Date.now();

  constructor(
    private getCourse: () => CourseManifest,
    private setCourse: (c: CourseManifest) => void,
    private getPageIndex: () => number,
    private notify: () => void,
    private nodeId: string,
    private beforeState: Partial<CanvasNode>,
    private afterState: Partial<CanvasNode>,
    desc?: string
  ) {
    this.id = 'cmd_update_' + Math.random().toString(36).substring(2, 9);
    this.description = desc || `Update #${nodeId.slice(-4)}`;
  }

  execute(): void {
    const course = this.getCourse();
    const pageIndex = this.getPageIndex();
    const page = course.pages[pageIndex];
    if (!page) return;

    const node = page.nodes.find((n) => n.id === this.nodeId);
    if (!node) return;

    Object.assign(node, this.afterState);
    this.notify();
  }

  undo(): void {
    const course = this.getCourse();
    const pageIndex = this.getPageIndex();
    const page = course.pages[pageIndex];
    if (!page) return;

    const node = page.nodes.find((n) => n.id === this.nodeId);
    if (!node) return;

    Object.assign(node, this.beforeState);
    this.notify();
  }

  redo(): void {
    this.execute();
  }
}

/**
 * Concrete Command: Batch Multiple Canvas Actions (Atomic Undo/Redo)
 */
export class BatchCommand implements Command {
  readonly id: string;
  readonly description: string;
  readonly timestamp = Date.now();

  constructor(private commands: Command[], desc?: string) {
    this.id = 'cmd_batch_' + Math.random().toString(36).substring(2, 9);
    this.description = desc || `Batch of ${commands.length} actions`;
  }

  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  undo(): void {
    // Undo in reverse execution order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  redo(): void {
    for (const cmd of this.commands) {
      if (cmd.redo) cmd.redo();
      else cmd.execute();
    }
  }
}

/**
 * Concrete Command: Course Snapshot Command (Macro state transitions)
 */
export class CourseSnapshotCommand implements Command {
  readonly id: string;
  readonly timestamp = Date.now();

  constructor(
    private setCourseState: (manifest: CourseManifest) => void,
    private notify: () => void,
    private beforeSnapshot: CourseManifest,
    private afterSnapshot: CourseManifest,
    public description: string = 'Modify canvas state'
  ) {
    this.id = 'cmd_snapshot_' + Math.random().toString(36).substring(2, 9);
  }

  public setAfter(after: CourseManifest, desc?: string): void {
    this.afterSnapshot = JSON.parse(JSON.stringify(after));
    if (desc) {
      this.description = desc;
    }
  }

  execute(): void {
    this.setCourseState(JSON.parse(JSON.stringify(this.afterSnapshot)));
    this.notify();
  }

  undo(): void {
    this.setCourseState(JSON.parse(JSON.stringify(this.beforeSnapshot)));
    this.notify();
  }

  redo(): void {
    this.execute();
  }
}

/**
 * CommandManager: Central invoker and stack tracker for the Command Pattern.
 */
export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxStackSize = 60;
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  /**
   * Executes a command and pushes it to the undo stack.
   * If executeImmediately is false, assumes command was already executed and only pushes to stack.
   */
  public execute(command: Command, executeImmediately = true): void {
    if (executeImmediately) {
      command.execute();
    }
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notify();
  }

  public undo(): Command | null {
    if (this.undoStack.length === 0) return null;
    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);
    this.notify();
    return command;
  }

  public redo(): Command | null {
    if (this.redoStack.length === 0) return null;
    const command = this.redoStack.pop()!;
    if (command.redo) {
      command.redo();
    } else {
      command.execute();
    }
    this.undoStack.push(command);
    this.notify();
    return command;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getUndoCount(): number {
    return this.undoStack.length;
  }

  public getRedoCount(): number {
    return this.redoStack.length;
  }

  public getLastUndoDescription(): string | null {
    return this.undoStack.length > 0
      ? this.undoStack[this.undoStack.length - 1].description
      : null;
  }

  public getLastRedoDescription(): string | null {
    return this.redoStack.length > 0
      ? this.redoStack[this.redoStack.length - 1].description
      : null;
  }

  public getHistory(): { undo: CommandHistoryItem[]; redo: CommandHistoryItem[] } {
    return {
      undo: this.undoStack.map((c) => ({
        id: c.id,
        description: c.description,
        timestamp: c.timestamp,
      })),
      redo: this.redoStack.map((c) => ({
        id: c.id,
        description: c.description,
        timestamp: c.timestamp,
      })),
    };
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }
}

export const globalCommandManager = new CommandManager();
