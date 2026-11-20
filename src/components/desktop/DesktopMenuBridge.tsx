import React, { useEffect } from 'react';
import { useCourseStore } from '../../store/courseStore';
import { createBlankCourse } from '../../data/blankCourse';
import { saveTextWithDialog } from '../../utils/saveFile';

function safeFileName(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'course'
  );
}

/**
 * Connects the native application menu (File/View) to the editor.
 * Without this listener the desktop menu items are inert.
 */
export const DesktopMenuBridge: React.FC = () => {
  const {
    course,
    exportProjectJson,
    importProjectJson,
    startNewCourse,
    saveVersion,
    setIsExportModalOpen,
    setIsVersionHistoryOpen,
  } = useCourseStore();

  useEffect(() => {
    const bridge = typeof window !== 'undefined' ? window.desktop : undefined;
    if (!bridge?.onMenuAction) return;

    return bridge.onMenuAction((action) => {
      void (async () => {
        switch (action) {
          case 'new-course': {
            startNewCourse(createBlankCourse());
            break;
          }
          case 'save-version': {
            saveVersion();
            setIsVersionHistoryOpen(true);
            break;
          }
          case 'open-course': {
            const opened = await bridge.openCourseJson();
            if (!opened) return;
            if (!importProjectJson(opened.text)) {
              console.error('Not a valid course definition:', opened.filePath);
            }
            break;
          }
          case 'save-course': {
            const json = await exportProjectJson();
            await saveTextWithDialog(json, `${safeFileName(course.title)}_backup.json`);
            break;
          }
          case 'export-scorm': {
            setIsExportModalOpen(true);
            break;
          }
          default:
            break;
        }
      })();
    });
  }, [
    course.title,
    exportProjectJson,
    importProjectJson,
    saveVersion,
    setIsExportModalOpen,
    setIsVersionHistoryOpen,
    startNewCourse,
  ]);

  return null;
};
