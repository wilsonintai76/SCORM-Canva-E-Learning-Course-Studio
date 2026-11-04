/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TopNavBar } from './components/navigation/TopNavBar';
import { LeftSidebar } from './components/sidebar/LeftSidebar';
import { CanvasAdapter } from './components/canvas/CanvasAdapter';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { PageTabs } from './components/navigation/PageTabs';
import { ScormPlayerModal } from './components/player/ScormPlayerModal';
import { LmsDebuggerDrawer } from './components/lms/LmsDebuggerDrawer';
import { AiPalette } from './components/ai/AiPalette';
import { ScormExportModal } from './components/export/ScormExportModal';
import { ShortcutsModal } from './components/navigation/ShortcutsModal';
import { AccessibilityModal } from './components/accessibility/AccessibilityModal';
import { VersionHistoryDrawer } from './components/versioning/VersionHistoryDrawer';
import { CollaborateModal } from './components/modals/CollaborateModal';
import { GridSettingsModal } from './components/modals/GridSettingsModal';
import { MediaManagerModal } from './components/modals/MediaManagerModal';
import { BranchingFlowModal } from './components/modals/BranchingFlowModal';
import { PdfHandoutModal } from './components/modals/PdfHandoutModal';

export default function App() {
  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Application Bar */}
      <TopNavBar />

      {/* Main Workspace: Left Sidebar + Center Visual Canvas + Right Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        <LeftSidebar />
        <CanvasAdapter />
        <InspectorPanel />
      </div>

      {/* Bottom Filmstrip Page Navigator */}
      <PageTabs />

      {/* Global Modals & Drawers */}
      <ScormPlayerModal />
      <LmsDebuggerDrawer />
      <AiPalette />
      <ScormExportModal />
      <ShortcutsModal />
      <AccessibilityModal />
      <VersionHistoryDrawer />
      <CollaborateModal />
      <GridSettingsModal />
      <MediaManagerModal />
      <BranchingFlowModal />
      <PdfHandoutModal />
    </div>
  );
}
