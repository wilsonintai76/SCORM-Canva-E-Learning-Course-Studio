import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CourseManifest,
  Page,
  CanvasNode,
  NodeType,
  CanvasComment,
  CourseVariable,
  VersionSnapshot,
  AssetItem,
  GlobalTheme,
  BranchingConnection,
  AudioNarration,
  QuizNode,
} from '../types/schema';
import { CYBERSECURITY_COURSE } from '../data/templates';
import { SlideLayout } from '../data/slideLayouts';
import { DEFAULT_COURSE_VARIABLES } from '../utils/variableInterpolator';
import { DEFAULT_ASSETS } from '../data/assetsData';
import {
  globalCommandManager,
  Command,
  CourseSnapshotCommand,
  AddNodeCommand,
  DeleteNodeCommand,
  UpdateNodeCommand,
} from './commandManager';

export interface CourseStoreState {
  course: CourseManifest;
  activePageIndex: number;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  isSnapToGridEnabled: boolean;
  gridSize: number;
  gridColor: string;
  zoom: number; // 0.5 to 2.0
  pan: { x: number; y: number };
  showRulers: boolean;
  showGuides: boolean;
  isPreviewOpen: boolean;
  isDebuggerOpen: boolean;
  isAiPaletteOpen: boolean;
  isExportModalOpen: boolean;
  isShortcutsModalOpen: boolean;
  isVersionHistoryOpen: boolean;
  isAccessibilityModalOpen: boolean;
  isCollaborateModalOpen: boolean;
  isGridSettingsModalOpen: boolean;
  isMediaManagerOpen: boolean;
  isBranchingFlowOpen: boolean;
  isPdfModalOpen: boolean;
  activeCommentMode: boolean;
  showComments: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  lastUndoDescription?: string | null;
  lastRedoDescription?: string | null;
  versionHistory: VersionSnapshot[];
  assets: AssetItem[];
}

// Global subscribers for lightweight store across React components
type Listener = () => void;

class CourseStore {
  private course: CourseManifest = JSON.parse(JSON.stringify(CYBERSECURITY_COURSE));
  private activePageIndex = 0;
  private selectedNodeId: string | null = null;
  private selectedNodeIds: string[] = [];
  private isSnapToGridEnabled = true;
  private gridSize = 10;
  private gridColor = '#334155';
  private zoom = 1.0;
  private pan = { x: 0, y: 0 };
  private showRulers = true;
  private showGuides = true;
  private isPreviewOpen = false;
  private isDebuggerOpen = false;
  private isAiPaletteOpen = false;
  private isExportModalOpen = false;
  private isShortcutsModalOpen = false;
  private isVersionHistoryOpen = false;
  private isAccessibilityModalOpen = false;
  private isCollaborateModalOpen = false;
  private isGridSettingsModalOpen = false;
  private isMediaManagerOpen = false;
  private isBranchingFlowOpen = false;
  private isPdfModalOpen = false;
  private activeCommentMode = false;
  private showComments = true;
  private versionHistory: VersionSnapshot[] = [];
  private assets: AssetItem[] = [...DEFAULT_ASSETS];

  private pendingSnapshotCommand: CourseSnapshotCommand | null = null;
  private listeners: Set<Listener> = new Set();

  constructor() {
    globalCommandManager.subscribe(() => {
      this.notify(false);
    });

    if (!this.course.variables || this.course.variables.length === 0) {
      this.course.variables = JSON.parse(JSON.stringify(DEFAULT_COURSE_VARIABLES));
    }
    if (!this.course.comments) {
      this.course.comments = [
        {
          id: 'comment_sample_1',
          pageId: this.course.pages[0]?.id || 'p1',
          x: 680,
          y: 110,
          author: 'Lead Instructional Designer',
          text: 'Great hero banner layout! Verified WCAG contrast compliance for the title.',
          createdAt: new Date().toISOString(),
          color: 'yellow',
          isResolved: false,
        },
      ];
    }
    if (!this.course.theme) {
      this.course.theme = {
        primaryColor: '#2563eb',
        secondaryColor: '#4f46e5',
        accentColor: '#06b6d4',
        backgroundColor: '#0f172a',
        fontFamily: 'Inter, sans-serif',
      };
    }
    try {
      const savedCourse = localStorage.getItem('scorm_canva_course_state');
      if (savedCourse) {
        const parsed = JSON.parse(savedCourse);
        if (parsed && parsed.id && parsed.pages) {
          this.course = parsed;
        }
      }
      const savedTheme = localStorage.getItem('scorm_canva_global_theme');
      if (savedTheme) {
        const themeObj = JSON.parse(savedTheme);
        if (themeObj) {
          this.course.theme = themeObj;
        }
      }
      const saved = localStorage.getItem('scorm_canva_versions');
      if (saved) {
        this.versionHistory = JSON.parse(saved);
      }
    } catch {
      // ignore
    }
  }

  private persistVersions(): void {
    try {
      localStorage.setItem('scorm_canva_versions', JSON.stringify(this.versionHistory));
    } catch {
      // ignore
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public commitUndo(description?: string): void {
    if (this.pendingSnapshotCommand) {
      this.pendingSnapshotCommand.setAfter(this.course, description);
      this.pendingSnapshotCommand = null;
    }
  }

  private notify(shouldCommit = true): void {
    if (shouldCommit) {
      this.commitUndo();
    }
    try {
      localStorage.setItem('scorm_canva_course_state', JSON.stringify(this.course));
      if (this.course.theme) {
        localStorage.setItem('scorm_canva_global_theme', JSON.stringify(this.course.theme));
      }
    } catch {
      // ignore
    }
    this.listeners.forEach((l) => l());
  }

  public pushUndo(desc?: string): void {
    if (this.pendingSnapshotCommand) {
      this.pendingSnapshotCommand.setAfter(this.course);
    }
    const before = JSON.parse(JSON.stringify(this.course));
    const description = desc || 'Canvas change';
    const cmd = new CourseSnapshotCommand(
      (manifest) => {
        this.course = manifest;
        if (this.activePageIndex >= this.course.pages.length) {
          this.activePageIndex = Math.max(0, this.course.pages.length - 1);
        }
      },
      () => this.notify(false),
      before,
      JSON.parse(JSON.stringify(this.course)),
      description
    );
    this.pendingSnapshotCommand = cmd;
    globalCommandManager.execute(cmd, false);
    this.notify(false);
  }

  public executeCommand(command: Command): void {
    this.commitUndo();
    globalCommandManager.execute(command);
    this.notify(false);
  }

  public getState(): CourseStoreState {
    return {
      course: this.course,
      activePageIndex: this.activePageIndex,
      selectedNodeId: this.selectedNodeIds[0] || null,
      selectedNodeIds: this.selectedNodeIds,
      isSnapToGridEnabled: this.isSnapToGridEnabled,
      gridSize: this.gridSize,
      gridColor: this.gridColor,
      zoom: this.zoom,
      pan: this.pan,
      showRulers: this.showRulers,
      showGuides: this.showGuides,
      isPreviewOpen: this.isPreviewOpen,
      isDebuggerOpen: this.isDebuggerOpen,
      isAiPaletteOpen: this.isAiPaletteOpen,
      isExportModalOpen: this.isExportModalOpen,
      isShortcutsModalOpen: this.isShortcutsModalOpen,
      isVersionHistoryOpen: this.isVersionHistoryOpen,
      isAccessibilityModalOpen: this.isAccessibilityModalOpen,
      isCollaborateModalOpen: this.isCollaborateModalOpen,
      isGridSettingsModalOpen: this.isGridSettingsModalOpen,
      isMediaManagerOpen: this.isMediaManagerOpen,
      isBranchingFlowOpen: this.isBranchingFlowOpen,
      isPdfModalOpen: this.isPdfModalOpen,
      activeCommentMode: this.activeCommentMode,
      showComments: this.showComments,
      canUndo: globalCommandManager.canUndo(),
      canRedo: globalCommandManager.canRedo(),
      undoCount: globalCommandManager.getUndoCount(),
      redoCount: globalCommandManager.getRedoCount(),
      lastUndoDescription: globalCommandManager.getLastUndoDescription(),
      lastRedoDescription: globalCommandManager.getLastRedoDescription(),
      versionHistory: this.versionHistory,
      assets: this.assets,
    };
  }

  public setPan(pan: { x: number; y: number }): void {
    this.pan = pan;
    this.notify();
  }

  public resetView(): void {
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
    this.notify();
  }

  public setIsExportModalOpen(open: boolean): void {
    this.isExportModalOpen = open;
    this.notify();
  }

  public setIsShortcutsModalOpen(open: boolean): void {
    this.isShortcutsModalOpen = open;
    this.notify();
  }

  public setIsVersionHistoryOpen(open: boolean): void {
    this.isVersionHistoryOpen = open;
    this.notify();
  }

  public setIsAccessibilityModalOpen(open: boolean): void {
    this.isAccessibilityModalOpen = open;
    this.notify();
  }

  public setIsCollaborateModalOpen(open: boolean): void {
    this.isCollaborateModalOpen = open;
    this.notify();
  }

  public setIsGridSettingsModalOpen(open: boolean): void {
    this.isGridSettingsModalOpen = open;
    this.notify();
  }

  public setIsMediaManagerOpen(open: boolean): void {
    this.isMediaManagerOpen = open;
    this.notify();
  }

  public setIsBranchingFlowOpen(open: boolean): void {
    this.isBranchingFlowOpen = open;
    this.notify();
  }

  public setIsPdfModalOpen(open: boolean): void {
    this.isPdfModalOpen = open;
    this.notify();
  }

  public setShowRulers(show: boolean): void {
    this.showRulers = show;
    this.notify();
  }

  public setShowGuides(show: boolean): void {
    this.showGuides = show;
    this.notify();
  }

  public setGridColor(color: string): void {
    this.gridColor = color;
    this.notify();
  }

  public applyGlobalTheme(
    theme: GlobalTheme,
    options?: {
      applyBackgroundToPages?: boolean;
      applyLogoToPages?: boolean;
    }
  ): void {
    this.pushUndo();
    this.course.theme = { ...theme };

    const headingFont = theme.headingFontFamily || theme.fontFamily || 'Inter, sans-serif';
    const bodyFont = theme.bodyFontFamily || theme.fontFamily || 'Inter, sans-serif';
    const logoPos = theme.logoPosition || 'top-left';

    // Helper to calculate luminance of background hex
    const isDarkBg = (hex?: string) => {
      if (!hex || !hex.startsWith('#') || hex.length < 7) return false;
      const r = parseInt(hex.substring(1, 3), 16);
      const g = parseInt(hex.substring(3, 5), 16);
      const b = parseInt(hex.substring(5, 7), 16);
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return luma < 128;
    };

    const targetBg = theme.backgroundColor;
    const shouldUpdateBg = options?.applyBackgroundToPages ?? true;
    const darkTheme = targetBg ? isDarkBg(targetBg) : false;

    this.course.pages.forEach((page) => {
      // 1. Cascade background color
      if (shouldUpdateBg && targetBg) {
        page.background = {
          type: 'color',
          value: targetBg,
        };
      }

      // 2. Cascade element design tokens
      page.nodes.forEach((node) => {
        if (node.type === 'text') {
          const isHeading =
            node.fontSize >= 22 || node.fontWeight === 'bold' || node.fontWeight === 'black';
          node.fontFamily = isHeading ? headingFont : bodyFont;

          // Automatically sync text contrast if background was updated
          if (shouldUpdateBg && targetBg) {
            if (darkTheme) {
              if (
                ['#0f172a', '#000000', '#1e293b', '#334155', '#111827'].includes(
                  node.color.toLowerCase()
                )
              ) {
                node.color = '#f8fafc';
              }
            } else {
              if (
                ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0'].includes(
                  node.color.toLowerCase()
                )
              ) {
                node.color = '#0f172a';
              }
            }
          }
        } else if (node.type === 'shape') {
          if (
            node.fill &&
            !['#ffffff', '#000000', 'transparent'].includes(node.fill.toLowerCase())
          ) {
            node.fill = theme.primaryColor;
          }
          if (
            node.stroke &&
            !['#ffffff', '#000000', 'transparent'].includes(node.stroke.toLowerCase())
          ) {
            node.stroke = theme.accentColor;
          }
        } else if (node.type === 'quiz') {
          node.themeColor = theme.primaryColor;
        }
      });

      // 3. Cascade Brand Logo if requested and provided
      if (options?.applyLogoToPages && theme.logoUrl?.trim()) {
        const existingLogo = page.nodes.find(
          (n) => n.type === 'image' && (n.id.startsWith('logo_') || (n as any).alt === 'Brand Logo')
        );

        let logoX = 40;
        let logoY = 30;
        if (logoPos === 'top-right') {
          logoX = (page.width || 960) - 160;
          logoY = 30;
        } else if (logoPos === 'bottom-right') {
          logoX = (page.width || 960) - 160;
          logoY = (page.height || 540) - 60;
        }

        if (existingLogo) {
          (existingLogo as any).url = theme.logoUrl;
          existingLogo.x = logoX;
          existingLogo.y = logoY;
        } else {
          const maxZ = page.nodes.reduce((m, n) => Math.max(m, n.zIndex || 0), 0) + 10;
          page.nodes.push({
            id: 'logo_' + Math.random().toString(36).substring(2, 9),
            type: 'image',
            x: logoX,
            y: logoY,
            width: 120,
            height: 40,
            url: theme.logoUrl,
            alt: 'Brand Logo',
            objectFit: 'contain',
            borderRadius: 4,
            opacity: 0.95,
            zIndex: maxZ,
          });
        }
      }
    });

    this.notify();
  }

  public setSlideAudioNarration(pageId: string, narration?: AudioNarration): void {
    const page = this.course.pages.find((p) => p.id === pageId);
    if (!page) return;
    this.pushUndo();
    page.audioNarration = narration;
    this.notify();
  }

  public addBranchingConnection(conn: BranchingConnection): void {
    if (!this.course.branching) this.course.branching = [];
    this.pushUndo();
    this.course.branching.push(conn);
    this.notify();
  }

  public deleteBranchingConnection(id: string): void {
    if (!this.course.branching) return;
    this.pushUndo();
    this.course.branching = this.course.branching.filter((c) => c.id !== id);
    this.notify();
  }

  public replaceAssetReference(oldUrl: string, newUrl: string): void {
    this.pushUndo();
    this.course.pages.forEach((page) => {
      page.nodes.forEach((node) => {
        if (node.type === 'image' && node.url === oldUrl) {
          node.url = newUrl;
        }
      });
    });
    this.assets = this.assets.map((a) => (a.url === oldUrl ? { ...a, url: newUrl } : a));
    this.notify();
  }

  public deleteAssetReference(url: string): void {
    this.pushUndo();
    this.course.pages.forEach((page) => {
      page.nodes = page.nodes.filter((node) => !(node.type === 'image' && node.url === url));
    });
    this.assets = this.assets.filter((a) => a.url !== url);
    this.notify();
  }

  public changeSlideBackground(pageIndices: number[], color: string): void {
    this.pushUndo();
    pageIndices.forEach((idx) => {
      const page = this.course.pages[idx];
      if (page) {
        page.background = { type: 'color', value: color };
      }
    });
    this.notify();
  }

  public duplicateMultiplePages(indices: number[]): void {
    if (indices.length === 0) return;
    this.pushUndo();
    const sorted = [...indices].sort((a, b) => b - a);
    sorted.forEach((idx) => {
      const src = this.course.pages[idx];
      if (!src) return;
      const clone: Page = JSON.parse(JSON.stringify(src));
      clone.id = 'page_' + Math.random().toString(36).substring(2, 9);
      clone.title = `${src.title} (Copy)`;
      clone.nodes = clone.nodes.map((n) => ({
        ...n,
        id: n.type + '_' + Math.random().toString(36).substring(2, 9),
      }));
      this.course.pages.splice(idx + 1, 0, clone);
    });
    this.notify();
  }

  public deleteMultiplePages(indices: number[]): void {
    if (this.course.pages.length <= indices.length) return;
    this.pushUndo();
    const sorted = [...indices].sort((a, b) => b - a);
    sorted.forEach((idx) => {
      if (this.course.pages.length > 1 && idx < this.course.pages.length) {
        this.course.pages.splice(idx, 1);
      }
    });
    this.activePageIndex = Math.min(this.activePageIndex, this.course.pages.length - 1);
    this.notify();
  }

  public setActiveCommentMode(active: boolean): void {
    this.activeCommentMode = active;
    this.notify();
  }

  public setShowComments(show: boolean): void {
    this.showComments = show;
    this.notify();
  }

  public addComment(comment: Omit<CanvasComment, 'id' | 'createdAt'>): void {
    if (!this.course.comments) this.course.comments = [];
    const newComment: CanvasComment = {
      ...comment,
      id: 'comment_' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      isResolved: false,
    };
    this.course.comments.push(newComment);
    this.activeCommentMode = false;
    this.notify();
  }

  public updateComment(id: string, updates: Partial<CanvasComment>): void {
    if (!this.course.comments) return;
    const idx = this.course.comments.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.course.comments[idx] = { ...this.course.comments[idx], ...updates };
      this.notify();
    }
  }

  public deleteComment(id: string): void {
    if (!this.course.comments) return;
    this.course.comments = this.course.comments.filter((c) => c.id !== id);
    this.notify();
  }

  public toggleCommentResolved(id: string): void {
    if (!this.course.comments) return;
    const comment = this.course.comments.find((c) => c.id === id);
    if (comment) {
      comment.isResolved = !comment.isResolved;
      this.notify();
    }
  }

  public addVariable(variable: Omit<CourseVariable, 'id'>): void {
    if (!this.course.variables) this.course.variables = [];
    const cleanName = variable.name.replace(/[^a-zA-Z0-9_-]/g, '');
    const newVar: CourseVariable = {
      ...variable,
      name: cleanName || `var_${Date.now()}`,
      id: 'var_' + Math.random().toString(36).substring(2, 9),
    };
    this.course.variables.push(newVar);
    this.notify();
  }

  public updateVariable(id: string, updates: Partial<CourseVariable>): void {
    if (!this.course.variables) return;
    const idx = this.course.variables.findIndex((v) => v.id === id);
    if (idx !== -1) {
      this.course.variables[idx] = { ...this.course.variables[idx], ...updates };
      this.notify();
    }
  }

  public deleteVariable(id: string): void {
    if (!this.course.variables) return;
    this.course.variables = this.course.variables.filter((v) => v.id !== id);
    this.notify();
  }

  public saveVersion(name?: string, note?: string): VersionSnapshot {
    const nodeCount = this.course.pages.reduce((acc, p) => acc + p.nodes.length, 0);
    const snapshot: VersionSnapshot = {
      id: 'ver_' + Date.now(),
      name:
        name?.trim() ||
        `Snapshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      timestamp: new Date().toISOString(),
      course: JSON.parse(JSON.stringify(this.course)),
      pageCount: this.course.pages.length,
      nodeCount,
      note,
    };
    this.versionHistory.unshift(snapshot);
    if (this.versionHistory.length > 20) {
      this.versionHistory = this.versionHistory.slice(0, 20);
    }
    this.persistVersions();
    this.notify();
    return snapshot;
  }

  public restoreVersion(versionId: string): boolean {
    const snapshot = this.versionHistory.find((v) => v.id === versionId);
    if (!snapshot) return false;
    this.pushUndo();
    this.course = JSON.parse(JSON.stringify(snapshot.course));
    this.activePageIndex = Math.min(this.activePageIndex, this.course.pages.length - 1);
    this.selectedNodeId = null;
    this.selectedNodeIds = [];
    this.notify();
    return true;
  }

  public deleteVersion(versionId: string): void {
    this.versionHistory = this.versionHistory.filter((v) => v.id !== versionId);
    this.persistVersions();
    this.notify();
  }

  public addCustomAsset(asset: AssetItem): void {
    this.assets.unshift(asset);
    this.notify();
  }

  public deleteAsset(assetId: string): void {
    this.assets = this.assets.filter((a) => a.id !== assetId);
    this.notify();
  }

  public bulkRenameAssets(
    assetIds: string[],
    options: {
      mode: 'prefix' | 'replace' | 'sequence';
      prefix?: string;
      find?: string;
      replaceWith?: string;
      baseName?: string;
    }
  ): void {
    this.assets = this.assets.map((asset) => {
      if (!assetIds.includes(asset.id)) return asset;
      let newName = asset.name;
      if (options.mode === 'prefix' && options.prefix) {
        newName = `${options.prefix}${asset.name}`;
      } else if (options.mode === 'replace' && options.find) {
        newName = asset.name.replaceAll(options.find, options.replaceWith || '');
      } else if (options.mode === 'sequence' && options.baseName) {
        const idx = assetIds.indexOf(asset.id) + 1;
        const numStr = idx < 10 ? `0${idx}` : `${idx}`;
        newName = `${options.baseName}_${numStr}`;
      }
      return { ...asset, name: newName };
    });
    this.notify();
  }

  public exportProjectJson(): string {
    const exportData = {
      exportedAt: new Date().toISOString(),
      generator: 'SCORM Canva v1.2',
      course: this.course,
      versionHistory: this.versionHistory,
    };
    return JSON.stringify(exportData, null, 2);
  }

  public importProjectJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      const courseData = parsed.course || parsed;
      if (!courseData.id || !courseData.pages || !Array.isArray(courseData.pages)) {
        throw new Error('Invalid course JSON structure');
      }
      this.pushUndo();
      this.course = courseData;
      if (!this.course.variables || this.course.variables.length === 0) {
        this.course.variables = JSON.parse(JSON.stringify(DEFAULT_COURSE_VARIABLES));
      }
      if (parsed.versionHistory && Array.isArray(parsed.versionHistory)) {
        this.versionHistory = parsed.versionHistory;
        this.persistVersions();
      }
      this.activePageIndex = 0;
      this.selectedNodeId = null;
      this.selectedNodeIds = [];
      this.notify();
      return true;
    } catch (err) {
      console.error('Failed to import project JSON:', err);
      return false;
    }
  }

  public undo(): void {
    this.commitUndo();
    const cmd = globalCommandManager.undo();
    if (cmd) {
      if (this.activePageIndex >= this.course.pages.length) {
        this.activePageIndex = Math.max(0, this.course.pages.length - 1);
      }
      this.notify(false);
    }
  }

  public redo(): void {
    this.commitUndo();
    const cmd = globalCommandManager.redo();
    if (cmd) {
      if (this.activePageIndex >= this.course.pages.length) {
        this.activePageIndex = Math.max(0, this.course.pages.length - 1);
      }
      this.notify(false);
    }
  }

  public loadCourse(course: CourseManifest): void {
    this.pushUndo();
    this.course = JSON.parse(JSON.stringify(course));
    this.activePageIndex = 0;
    this.selectedNodeId = null;
    this.notify();
  }

  public updateManifest(updates: Partial<CourseManifest>): void {
    this.pushUndo();
    this.course = { ...this.course, ...updates, updatedAt: new Date().toISOString() };
    this.notify();
  }

  public setActivePage(index: number): void {
    if (index >= 0 && index < this.course.pages.length) {
      this.activePageIndex = index;
      this.selectedNodeId = null;
      this.notify();
    }
  }

  public setSelectedNodeId(nodeId: string | null): void {
    if (nodeId === null) {
      this.selectedNodeIds = [];
      this.selectedNodeId = null;
    } else {
      const page = this.course.pages[this.activePageIndex];
      const node = page?.nodes.find((n) => n.id === nodeId);
      if (node && node.groupId) {
        // Select all nodes in this group
        const groupMemberIds = page.nodes
          .filter((n) => n.groupId === node.groupId)
          .map((n) => n.id);
        this.selectedNodeIds = groupMemberIds;
      } else {
        this.selectedNodeIds = [nodeId];
      }
      this.selectedNodeId = nodeId;
    }
    this.notify();
  }

  public setSelectedNodeIds(ids: string[] | null): void {
    if (!ids || ids.length === 0) {
      this.selectedNodeIds = [];
      this.selectedNodeId = null;
    } else {
      this.selectedNodeIds = [...ids];
      this.selectedNodeId = ids[0];
    }
    this.notify();
  }

  public toggleNodeSelection(nodeId: string): void {
    const page = this.course.pages[this.activePageIndex];
    const node = page?.nodes.find((n) => n.id === nodeId);
    const targetIds = node?.groupId
      ? page.nodes.filter((n) => n.groupId === node.groupId).map((n) => n.id)
      : [nodeId];

    const isAlreadySelected = targetIds.every((id) => this.selectedNodeIds.includes(id));
    if (isAlreadySelected) {
      this.selectedNodeIds = this.selectedNodeIds.filter((id) => !targetIds.includes(id));
    } else {
      const newSet = new Set([...this.selectedNodeIds, ...targetIds]);
      this.selectedNodeIds = Array.from(newSet);
    }
    this.selectedNodeId = this.selectedNodeIds[0] || null;
    this.notify();
  }

  public setSnapToGrid(enabled: boolean): void {
    this.isSnapToGridEnabled = enabled;
    this.notify();
  }

  public setGridSize(size: number): void {
    this.gridSize = Math.max(2, Math.min(100, size));
    this.notify();
  }

  public groupNodes(idsToGroup?: string[]): void {
    const ids = idsToGroup || this.selectedNodeIds;
    if (ids.length < 2) return;
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;

    this.pushUndo();
    const newGroupId = 'group_' + Math.random().toString(36).substring(2, 9);
    page.nodes.forEach((node) => {
      if (ids.includes(node.id)) {
        node.groupId = newGroupId;
      }
    });
    this.selectedNodeIds = [...ids];
    this.selectedNodeId = ids[0];
    this.notify();
  }

  public ungroupNodes(targetGroupId?: string): void {
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;

    this.pushUndo();
    if (targetGroupId) {
      page.nodes.forEach((node) => {
        if (node.groupId === targetGroupId) {
          delete node.groupId;
        }
      });
    } else {
      const selectedNodes = page.nodes.filter((n) => this.selectedNodeIds.includes(n.id));
      const groupIdsToClear = new Set(selectedNodes.map((n) => n.groupId).filter((id): id is string => Boolean(id)));
      page.nodes.forEach((node) => {
        if (node.groupId && groupIdsToClear.has(node.groupId)) {
          delete node.groupId;
        } else if (this.selectedNodeIds.includes(node.id)) {
          delete node.groupId;
        }
      });
    }
    this.notify();
  }

  public setZoom(zoom: number): void {
    this.zoom = Math.max(0.4, Math.min(2.0, zoom));
    this.notify();
  }

  public setIsPreviewOpen(open: boolean): void {
    this.isPreviewOpen = open;
    this.notify();
  }

  public setIsDebuggerOpen(open: boolean): void {
    this.isDebuggerOpen = open;
    this.notify();
  }

  public setIsAiPaletteOpen(open: boolean): void {
    this.isAiPaletteOpen = open;
    this.notify();
  }

  public addPage(): void {
    this.pushUndo();
    const newPageNumber = this.course.pages.length + 1;
    const newPage: Page = {
      id: 'page_' + Math.random().toString(36).substring(2, 9),
      title: `Slide ${newPageNumber}`,
      width: this.course.canvasWidth,
      height: this.course.canvasHeight,
      background: {
        type: 'color',
        value: '#ffffff',
      },
      nodes: [
        {
          id: 'text_' + Math.random().toString(36).substring(2, 9),
          type: 'text',
          x: 80,
          y: 80,
          width: 800,
          height: 60,
          content: `New Slide Title`,
          fontSize: 32,
          fontWeight: 'bold',
          color: '#0f172a',
          textAlign: 'left',
          zIndex: 1,
        },
      ],
    };
    this.course.pages.push(newPage);
    this.activePageIndex = this.course.pages.length - 1;
    this.selectedNodeId = null;
    this.notify();
  }

  public applySlideLayout(layout: SlideLayout, targetPageIndex?: number): void {
    const pageIdx = targetPageIndex !== undefined ? targetPageIndex : this.activePageIndex;
    const page = this.course.pages[pageIdx];
    if (!page) return;

    this.pushUndo();

    // Instantiate unique node IDs for the new nodes
    const instantiatedNodes: CanvasNode[] = layout.nodes.map((nodeTemplate, idx) => ({
      ...nodeTemplate,
      id: `${nodeTemplate.type}_${Math.random().toString(36).substring(2, 9)}_${idx}`,
    })) as CanvasNode[];

    this.course.pages[pageIdx] = {
      ...page,
      title: layout.title,
      background: { ...layout.background },
      nodes: instantiatedNodes,
    };

    this.selectedNodeId = null;
    this.notify();
  }

  public addSlideWithLayout(layout: SlideLayout): void {
    this.pushUndo();
    const instantiatedNodes: CanvasNode[] = layout.nodes.map((nodeTemplate, idx) => ({
      ...nodeTemplate,
      id: `${nodeTemplate.type}_${Math.random().toString(36).substring(2, 9)}_${idx}`,
    })) as CanvasNode[];

    const newPage: Page = {
      id: 'page_' + Math.random().toString(36).substring(2, 9),
      title: layout.title,
      width: this.course.canvasWidth,
      height: this.course.canvasHeight,
      background: { ...layout.background },
      nodes: instantiatedNodes,
    };

    this.course.pages.push(newPage);
    this.activePageIndex = this.course.pages.length - 1;
    this.selectedNodeId = null;
    this.notify();
  }

  public duplicatePage(index: number): void {
    if (index < 0 || index >= this.course.pages.length) return;
    this.pushUndo();
    const src = this.course.pages[index];
    const clone: Page = JSON.parse(JSON.stringify(src));
    clone.id = 'page_' + Math.random().toString(36).substring(2, 9);
    clone.title = `${src.title} (Copy)`;
    clone.nodes = clone.nodes.map((n) => ({
      ...n,
      id: n.type + '_' + Math.random().toString(36).substring(2, 9),
    }));
    this.course.pages.splice(index + 1, 0, clone);
    this.activePageIndex = index + 1;
    this.notify();
  }

  public deletePage(index: number): void {
    if (this.course.pages.length <= 1) return;
    this.pushUndo();
    this.course.pages.splice(index, 1);
    if (this.activePageIndex >= this.course.pages.length) {
      this.activePageIndex = this.course.pages.length - 1;
    }
    this.selectedNodeId = null;
    this.notify();
  }

  public reorderPages(fromIndex: number, toIndex: number): void {
    if (
      fromIndex < 0 ||
      fromIndex >= this.course.pages.length ||
      toIndex < 0 ||
      toIndex >= this.course.pages.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    this.pushUndo();
    const [moved] = this.course.pages.splice(fromIndex, 1);
    this.course.pages.splice(toIndex, 0, moved);
    this.activePageIndex = toIndex;
    this.notify();
  }

  public updateActivePage(updates: Partial<Page>): void {
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;
    this.pushUndo();
    this.course.pages[this.activePageIndex] = { ...page, ...updates };
    this.notify();
  }

  public addNode(
    nodeType: NodeType,
    initialPos?: { x: number; y: number },
    initialData?: Partial<CanvasNode>
  ): CanvasNode {
    const page = this.course.pages[this.activePageIndex];
    if (!page) return {} as CanvasNode;
    this.pushUndo();

    const id = nodeType + '_' + Math.random().toString(36).substring(2, 9);
    const maxZ = page.nodes.reduce((m, n) => Math.max(m, n.zIndex || 0), 0) + 1;

    const posX =
      initialPos?.x !== undefined
        ? Math.max(10, Math.min(800, Math.round(initialPos.x)))
        : initialData?.x !== undefined
        ? initialData.x
        : 100;
    const posY =
      initialPos?.y !== undefined
        ? Math.max(10, Math.min(450, Math.round(initialPos.y)))
        : initialData?.y !== undefined
        ? initialData.y
        : 120;

    let newNode: CanvasNode;
    if (nodeType === 'text') {
      newNode = {
        id,
        type: 'text',
        x: posX,
        y: posY,
        width: 400,
        height: 60,
        content: 'Edit this text content',
        fontSize: 22,
        fontWeight: 'normal',
        fontFamily: this.course.theme?.bodyFontFamily || this.course.theme?.fontFamily || 'Inter, sans-serif',
        color: '#0f172a',
        textAlign: 'left',
        zIndex: maxZ,
      };
    } else if (nodeType === 'image') {
      newNode = {
        id,
        type: 'image',
        x: posX,
        y: posY,
        width: 320,
        height: 240,
        url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=700&q=80',
        alt: 'Illustration image',
        objectFit: 'cover',
        borderRadius: 12,
        opacity: 1,
        shadow: true,
        zIndex: maxZ,
      };
    } else if (nodeType === 'quiz') {
      newNode = {
        id,
        type: 'quiz',
        x: initialPos?.x !== undefined ? Math.max(20, Math.min(200, Math.round(initialPos.x))) : 80,
        y: initialPos?.y !== undefined ? Math.max(20, Math.min(100, Math.round(initialPos.y))) : 60,
        width: 800,
        height: 400,
        quizType: 'single',
        question: 'What is the most effective defense against credential theft?',
        options: [
          {
            id: 'opt_' + Math.random().toString(36).substring(2, 7),
            text: 'Multi-Factor Authentication (MFA) and strong password managers',
            isCorrect: true,
            feedback: 'Correct! MFA blocks 99.9% of automated account compromise attempts.',
          },
          {
            id: 'opt_' + Math.random().toString(36).substring(2, 7),
            text: 'Writing down passwords on a sticky note placed on the monitor',
            isCorrect: false,
            feedback: 'Incorrect! Physical exposure creates immediate vulnerability.',
          },
          {
            id: 'opt_' + Math.random().toString(36).substring(2, 7),
            text: 'Using the word "password123" for every application',
            isCorrect: false,
            feedback: 'Incorrect! Reused passwords cause credential stuffing cascades.',
          },
        ],
        points: 25,
        showFeedbackImmediately: true,
        themeColor: this.course.theme?.primaryColor || '#2563eb',
        zIndex: maxZ,
      };
    } else if (nodeType === 'callout') {
      newNode = {
        id,
        type: 'callout',
        x: posX,
        y: posY,
        width: 440,
        height: 120,
        variant: 'info',
        title: 'Key Takeaway',
        content: 'Remember to verify suspicious requests out-of-band using verified internal contact information.',
        zIndex: maxZ,
      };
    } else {
      newNode = {
        id,
        type: 'shape',
        shapeType: 'rounded-rect',
        x: posX,
        y: posY,
        width: 220,
        height: 140,
        fill: this.course.theme?.primaryColor || '#3b82f6',
        opacity: 0.9,
        borderRadius: 12,
        zIndex: maxZ,
      };
    }

    if (initialData) {
      newNode = {
        ...newNode,
        ...initialData,
        id,
        x: posX,
        y: posY,
        zIndex: maxZ,
      } as CanvasNode;
    }

    page.nodes.push(newNode);
    this.selectedNodeId = id;
    this.selectedNodeIds = [id];
    this.notify();
    return newNode;
  }

  public addQuizNode(quizData: Partial<QuizNode>, pos?: { x: number; y: number }): QuizNode {
    return this.addNode('quiz', pos, quizData) as QuizNode;
  }

  public toggleLockNode(nodeId?: string): void {
    const targetId = nodeId || this.selectedNodeId;
    if (!targetId) return;
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;
    const node = page.nodes.find((n) => n.id === targetId);
    if (!node) return;

    this.pushUndo();
    const newLockState = !node.isLocked;

    const targetIds = node.groupId
      ? page.nodes.filter((n) => n.groupId === node.groupId).map((n) => n.id)
      : this.selectedNodeIds.includes(targetId)
      ? this.selectedNodeIds
      : [targetId];

    page.nodes.forEach((n) => {
      if (targetIds.includes(n.id)) {
        n.isLocked = newLockState;
      }
    });

    this.notify();
  }

  public toggleHideNode(nodeId?: string): void {
    const targetId = nodeId || this.selectedNodeId;
    if (!targetId) return;
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;
    const node = page.nodes.find((n) => n.id === targetId);
    if (!node) return;

    this.pushUndo();
    const newHideState = !node.isHidden;

    const targetIds = node.groupId
      ? page.nodes.filter((n) => n.groupId === node.groupId).map((n) => n.id)
      : this.selectedNodeIds.includes(targetId)
      ? this.selectedNodeIds
      : [targetId];

    page.nodes.forEach((n) => {
      if (targetIds.includes(n.id)) {
        n.isHidden = newHideState;
      }
    });

    this.notify();
  }

  public reorderLayerNodes(orderedIdsFromTopToBottom: string[]): void {
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;

    this.pushUndo('Reordered layer stack');
    const total = orderedIdsFromTopToBottom.length;
    orderedIdsFromTopToBottom.forEach((id, index) => {
      const node = page.nodes.find((n) => n.id === id);
      if (node) {
        node.zIndex = total - index;
      }
    });
    this.notify();
  }

  public updateNode(nodeId: string, updates: Partial<CanvasNode>, recordHistory = true): void {
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;
    const nodeIdx = page.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIdx === -1) return;

    if (recordHistory) {
      this.pushUndo();
    }
    page.nodes[nodeIdx] = { ...page.nodes[nodeIdx], ...updates } as CanvasNode;
    this.notify();
  }

  public deleteNode(nodeId: string): void {
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;
    const nodeIdx = page.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIdx === -1) return;

    this.pushUndo();
    page.nodes.splice(nodeIdx, 1);
    if (this.selectedNodeId === nodeId) {
      this.selectedNodeId = null;
    }
    this.notify();
  }

  public duplicateNode(nodeId: string): void {
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;
    const node = page.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    this.pushUndo();
    const clone: CanvasNode = JSON.parse(JSON.stringify(node));
    clone.id = clone.type + '_' + Math.random().toString(36).substring(2, 9);
    clone.x += 20;
    clone.y += 20;
    const maxZ = page.nodes.reduce((m, n) => Math.max(m, n.zIndex || 0), 0) + 1;
    clone.zIndex = maxZ;

    page.nodes.push(clone);
    this.selectedNodeId = clone.id;
    this.notify();
  }

  public bringToFront(nodeId: string): void {
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;
    const node = page.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    this.pushUndo();
    const maxZ = page.nodes.reduce((m, n) => Math.max(m, n.zIndex || 0), 0);
    node.zIndex = maxZ + 1;
    this.notify();
  }

  public sendToBack(nodeId: string): void {
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;
    const node = page.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    this.pushUndo();
    const minZ = page.nodes.reduce((m, n) => Math.min(m, n.zIndex || 0), 1);
    node.zIndex = Math.max(0, minZ - 1);
    this.notify();
  }

  public moveUp(nodeId: string): void {
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;
    const node = page.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    this.pushUndo();
    node.zIndex = (node.zIndex || 1) + 1;
    this.notify();
  }

  public moveDown(nodeId: string): void {
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;
    const node = page.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    this.pushUndo();
    node.zIndex = Math.max(0, (node.zIndex || 1) - 1);
    this.notify();
  }

  public alignSelected(
    alignType:
      | 'left'
      | 'center-h'
      | 'right'
      | 'top'
      | 'center-v'
      | 'bottom'
      | 'baseline'
      | 'distribute-h'
      | 'distribute-v'
  ): void {
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;

    const ids =
      this.selectedNodeIds.length > 0
        ? this.selectedNodeIds
        : this.selectedNodeId
        ? [this.selectedNodeId]
        : [];

    if (ids.length === 0) return;

    const cW = this.course.canvasWidth || 960;
    const cH = this.course.canvasHeight || 540;

    const selectedNodes = page.nodes.filter((n) => ids.includes(n.id) && !n.isLocked);
    if (selectedNodes.length === 0) return;

    this.pushUndo();

    if (selectedNodes.length === 1) {
      const node = selectedNodes[0];
      switch (alignType) {
        case 'left':
          node.x = 0;
          break;
        case 'center-h':
          node.x = Math.round((cW - node.width) / 2);
          break;
        case 'right':
          node.x = cW - node.width;
          break;
        case 'top':
          node.y = 0;
          break;
        case 'center-v':
          node.y = Math.round((cH - node.height) / 2);
          break;
        case 'bottom':
        case 'baseline':
          node.y = cH - node.height;
          break;
        default:
          break;
      }
    } else {
      const minX = Math.min(...selectedNodes.map((n) => n.x));
      const maxX = Math.max(...selectedNodes.map((n) => n.x + n.width));
      const minY = Math.min(...selectedNodes.map((n) => n.y));
      const maxY = Math.max(...selectedNodes.map((n) => n.y + n.height));

      switch (alignType) {
        case 'left':
          selectedNodes.forEach((n) => (n.x = minX));
          break;
        case 'center-h': {
          const midX = (minX + maxX) / 2;
          selectedNodes.forEach((n) => (n.x = Math.round(midX - n.width / 2)));
          break;
        }
        case 'right':
          selectedNodes.forEach((n) => (n.x = Math.round(maxX - n.width)));
          break;
        case 'top':
          selectedNodes.forEach((n) => (n.y = minY));
          break;
        case 'center-v': {
          const midY = (minY + maxY) / 2;
          selectedNodes.forEach((n) => (n.y = Math.round(midY - n.height / 2)));
          break;
        }
        case 'bottom':
          selectedNodes.forEach((n) => (n.y = Math.round(maxY - n.height)));
          break;
        case 'baseline': {
          const commonBaseline = Math.max(...selectedNodes.map((n) => n.y + n.height));
          selectedNodes.forEach((n) => (n.y = Math.round(commonBaseline - n.height)));
          break;
        }
        case 'distribute-h':
          this.distributeNodes('horizontal', ids);
          return;
        case 'distribute-v':
          this.distributeNodes('vertical', ids);
          return;
      }
    }

    this.notify();
  }

  public alignNode(
    nodeId: string,
    align: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom'
  ): void {
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;
    const node = page.nodes.find((n) => n.id === nodeId);
    if (!node || node.isLocked) return;

    this.pushUndo();
    const cW = this.course.canvasWidth || 960;
    const cH = this.course.canvasHeight || 540;

    if (align === 'left') node.x = 0;
    else if (align === 'center-x') node.x = Math.round((cW - node.width) / 2);
    else if (align === 'right') node.x = cW - node.width;
    else if (align === 'top') node.y = 0;
    else if (align === 'center-y') node.y = Math.round((cH - node.height) / 2);
    else if (align === 'bottom') node.y = cH - node.height;

    this.notify();
  }

  public distributeNodes(axis: 'horizontal' | 'vertical', targetIds?: string[]): void {
    const page = this.course.pages[this.activePageIndex];
    if (!page) return;

    const ids = targetIds || (this.selectedNodeIds.length >= 3 ? this.selectedNodeIds : page.nodes.map((n) => n.id));
    if (ids.length < 3) return;

    const nodesToDistribute = page.nodes.filter((n) => ids.includes(n.id) && !n.isLocked);
    if (nodesToDistribute.length < 3) return;

    this.pushUndo();

    if (axis === 'horizontal') {
      const sorted = [...nodesToDistribute].sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalDistance = (last.x + last.width) - first.x;
      const totalNodesWidth = sorted.reduce((sum, n) => sum + n.width, 0);
      const availableSpace = Math.max(0, totalDistance - totalNodesWidth);
      const gap = availableSpace / (sorted.length - 1);

      let currentX = first.x + first.width + gap;
      for (let idx = 1; idx < sorted.length - 1; idx++) {
        sorted[idx].x = Math.round(currentX);
        currentX += sorted[idx].width + gap;
      }
    } else {
      const sorted = [...nodesToDistribute].sort((a, b) => a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalDistance = (last.y + last.height) - first.y;
      const totalNodesHeight = sorted.reduce((sum, n) => sum + n.height, 0);
      const availableSpace = Math.max(0, totalDistance - totalNodesHeight);
      const gap = availableSpace / (sorted.length - 1);

      let currentY = first.y + first.height + gap;
      for (let idx = 1; idx < sorted.length - 1; idx++) {
        sorted[idx].y = Math.round(currentY);
        currentY += sorted[idx].height + gap;
      }
    }

    this.notify();
  }
}

export const globalCourseStore = new CourseStore();

/**
 * Custom React Hook for accessing and subscribing to global CourseStore
 */
export function useCourseStore() {
  const [state, setState] = useState<CourseStoreState>(() => globalCourseStore.getState());

  useEffect(() => {
    return globalCourseStore.subscribe(() => {
      setState(globalCourseStore.getState());
    });
  }, []);

  return {
    ...state,
    currentPage: state.course.pages[state.activePageIndex],
    selectedNode: state.course.pages[state.activePageIndex]?.nodes.find(
      (n) => n.id === state.selectedNodeId
    ),
    loadCourse: (course: CourseManifest) => globalCourseStore.loadCourse(course),
    updateManifest: (updates: Partial<CourseManifest>) => globalCourseStore.updateManifest(updates),
    setActivePage: (idx: number) => globalCourseStore.setActivePage(idx),
    setSelectedNodeId: (id: string | null) => globalCourseStore.setSelectedNodeId(id),
    setSelectedNodeIds: (ids: string[] | null) => globalCourseStore.setSelectedNodeIds(ids),
    toggleNodeSelection: (id: string) => globalCourseStore.toggleNodeSelection(id),
    setSnapToGrid: (enabled: boolean) => globalCourseStore.setSnapToGrid(enabled),
    setGridSize: (size: number) => globalCourseStore.setGridSize(size),
    groupNodes: (ids?: string[]) => globalCourseStore.groupNodes(ids),
    ungroupNodes: (groupId?: string) => globalCourseStore.ungroupNodes(groupId),
    toggleLockNode: (nodeId?: string) => globalCourseStore.toggleLockNode(nodeId),
    toggleHideNode: (nodeId?: string) => globalCourseStore.toggleHideNode(nodeId),
    reorderLayerNodes: (orderedIdsFromTopToBottom: string[]) =>
      globalCourseStore.reorderLayerNodes(orderedIdsFromTopToBottom),
    setZoom: (z: number) => globalCourseStore.setZoom(z),
    setPan: (pan: { x: number; y: number }) => globalCourseStore.setPan(pan),
    resetView: () => globalCourseStore.resetView(),
    setIsPreviewOpen: (open: boolean) => globalCourseStore.setIsPreviewOpen(open),
    setIsDebuggerOpen: (open: boolean) => globalCourseStore.setIsDebuggerOpen(open),
    setIsAiPaletteOpen: (open: boolean) => globalCourseStore.setIsAiPaletteOpen(open),
    setIsExportModalOpen: (open: boolean) => globalCourseStore.setIsExportModalOpen(open),
    setIsShortcutsModalOpen: (open: boolean) => globalCourseStore.setIsShortcutsModalOpen(open),
    setIsVersionHistoryOpen: (open: boolean) => globalCourseStore.setIsVersionHistoryOpen(open),
    setIsAccessibilityModalOpen: (open: boolean) =>
      globalCourseStore.setIsAccessibilityModalOpen(open),
    setIsCollaborateModalOpen: (open: boolean) =>
      globalCourseStore.setIsCollaborateModalOpen(open),
    setIsGridSettingsModalOpen: (open: boolean) =>
      globalCourseStore.setIsGridSettingsModalOpen(open),
    setIsMediaManagerOpen: (open: boolean) =>
      globalCourseStore.setIsMediaManagerOpen(open),
    setIsBranchingFlowOpen: (open: boolean) =>
      globalCourseStore.setIsBranchingFlowOpen(open),
    setIsPdfModalOpen: (open: boolean) =>
      globalCourseStore.setIsPdfModalOpen(open),
    setShowRulers: (show: boolean) => globalCourseStore.setShowRulers(show),
    setShowGuides: (show: boolean) => globalCourseStore.setShowGuides(show),
    setGridColor: (color: string) => globalCourseStore.setGridColor(color),
    applyGlobalTheme: (
      theme: GlobalTheme,
      options?: { applyBackgroundToPages?: boolean; applyLogoToPages?: boolean }
    ) => globalCourseStore.applyGlobalTheme(theme, options),
    setSlideAudioNarration: (pageId: string, narration?: AudioNarration) =>
      globalCourseStore.setSlideAudioNarration(pageId, narration),
    addBranchingConnection: (conn: BranchingConnection) =>
      globalCourseStore.addBranchingConnection(conn),
    deleteBranchingConnection: (id: string) =>
      globalCourseStore.deleteBranchingConnection(id),
    replaceAssetReference: (oldUrl: string, newUrl: string) =>
      globalCourseStore.replaceAssetReference(oldUrl, newUrl),
    deleteAssetReference: (url: string) =>
      globalCourseStore.deleteAssetReference(url),
    changeSlideBackground: (pageIndices: number[], color: string) =>
      globalCourseStore.changeSlideBackground(pageIndices, color),
    duplicateMultiplePages: (indices: number[]) =>
      globalCourseStore.duplicateMultiplePages(indices),
    deleteMultiplePages: (indices: number[]) =>
      globalCourseStore.deleteMultiplePages(indices),
    setActiveCommentMode: (active: boolean) => globalCourseStore.setActiveCommentMode(active),
    setShowComments: (show: boolean) => globalCourseStore.setShowComments(show),
    addComment: (comment: Omit<CanvasComment, 'id' | 'createdAt'>) =>
      globalCourseStore.addComment(comment),
    updateComment: (id: string, updates: Partial<CanvasComment>) =>
      globalCourseStore.updateComment(id, updates),
    deleteComment: (id: string) => globalCourseStore.deleteComment(id),
    toggleCommentResolved: (id: string) => globalCourseStore.toggleCommentResolved(id),
    addVariable: (variable: Omit<CourseVariable, 'id'>) => globalCourseStore.addVariable(variable),
    updateVariable: (id: string, updates: Partial<CourseVariable>) =>
      globalCourseStore.updateVariable(id, updates),
    deleteVariable: (id: string) => globalCourseStore.deleteVariable(id),
    saveVersion: (name?: string, note?: string) => globalCourseStore.saveVersion(name, note),
    restoreVersion: (versionId: string) => globalCourseStore.restoreVersion(versionId),
    deleteVersion: (versionId: string) => globalCourseStore.deleteVersion(versionId),
    addCustomAsset: (asset: AssetItem) => globalCourseStore.addCustomAsset(asset),
    deleteAsset: (assetId: string) => globalCourseStore.deleteAsset(assetId),
    bulkRenameAssets: (
      assetIds: string[],
      options: {
        mode: 'prefix' | 'replace' | 'sequence';
        prefix?: string;
        find?: string;
        replaceWith?: string;
        baseName?: string;
      }
    ) => globalCourseStore.bulkRenameAssets(assetIds, options),
    exportProjectJson: () => globalCourseStore.exportProjectJson(),
    importProjectJson: (jsonString: string) => globalCourseStore.importProjectJson(jsonString),
    addPage: () => globalCourseStore.addPage(),
    applySlideLayout: (layout: SlideLayout, pageIndex?: number) =>
      globalCourseStore.applySlideLayout(layout, pageIndex),
    addSlideWithLayout: (layout: SlideLayout) => globalCourseStore.addSlideWithLayout(layout),
    duplicatePage: (idx: number) => globalCourseStore.duplicatePage(idx),
    deletePage: (idx: number) => globalCourseStore.deletePage(idx),
    reorderPages: (from: number, to: number) => globalCourseStore.reorderPages(from, to),
    updateActivePage: (updates: Partial<Page>) => globalCourseStore.updateActivePage(updates),
    addNode: (type: NodeType, pos?: { x: number; y: number }, initialData?: Partial<CanvasNode>) =>
      globalCourseStore.addNode(type, pos, initialData),
    addQuizNode: (quizData: Partial<QuizNode>, pos?: { x: number; y: number }) =>
      globalCourseStore.addQuizNode(quizData, pos),
    updateNode: (id: string, updates: Partial<CanvasNode>, recordHistory?: boolean) =>
      globalCourseStore.updateNode(id, updates, recordHistory),
    deleteNode: (id: string) => globalCourseStore.deleteNode(id),
    duplicateNode: (id: string) => globalCourseStore.duplicateNode(id),
    bringToFront: (id: string) => globalCourseStore.bringToFront(id),
    sendToBack: (id: string) => globalCourseStore.sendToBack(id),
    moveUp: (id: string) => globalCourseStore.moveUp(id),
    moveDown: (id: string) => globalCourseStore.moveDown(id),
    alignNode: (
      id: string,
      align: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom'
    ) => globalCourseStore.alignNode(id, align),
    alignSelected: (
      alignType:
        | 'left'
        | 'center-h'
        | 'right'
        | 'top'
        | 'center-v'
        | 'bottom'
        | 'baseline'
        | 'distribute-h'
        | 'distribute-v'
    ) => globalCourseStore.alignSelected(alignType),
    distributeNodes: (axis: 'horizontal' | 'vertical', targetIds?: string[]) =>
      globalCourseStore.distributeNodes(axis, targetIds),
    pushUndo: (desc?: string) => globalCourseStore.pushUndo(desc),
    undo: () => globalCourseStore.undo(),
    redo: () => globalCourseStore.redo(),
    executeCommand: (command: Command) => globalCourseStore.executeCommand(command),
  };
}
