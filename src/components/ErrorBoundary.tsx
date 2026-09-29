'use client';

import { catchError, type ErrorInfo } from 'next/error';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface FallbackProps {
  /** Name of the section shown in the fallback, e.g. "Device Simulator". */
  title: string;
}

function SectionErrorFallback({ title }: FallbackProps, { error, reset }: ErrorInfo) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
      <span className="flex items-center gap-1.5 font-semibold">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        ส่วน “{title}” ทำงานผิดพลาด
      </span>
      <code className="max-w-full truncate font-mono text-[11px] text-red-600">
        {error instanceof Error ? error.message : String(error)}
      </code>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-1 inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 py-1 font-medium hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <RotateCcw className="h-3 w-3" aria-hidden="true" />
        ลองใหม่
      </button>
    </div>
  );
}

/** Section-level error boundary: a crash in one module doesn't take down the whole workbench. */
const SectionErrorBoundary = catchError(SectionErrorFallback);

export default SectionErrorBoundary;
