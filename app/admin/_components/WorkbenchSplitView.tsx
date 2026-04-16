import type { CSSProperties, ReactNode } from "react";

import { workbenchStickyPanelStyle } from "./workbenchStyles";

export default function WorkbenchSplitView({
  left,
  right,
  id,
  leftMinWidth = 320,
  rightMinWidth = 360,
  rightStickyTop = 12,
  style,
}: {
  left: ReactNode;
  right: ReactNode;
  id?: string;
  leftMinWidth?: number;
  rightMinWidth?: number;
  rightStickyTop?: number;
  style?: CSSProperties;
}) {
  const className = id ? `workbench-split-${id}` : "workbench-split-view";

  return (
    <>
      <style>{`
        @media (max-width: 1100px) {
          .${className} {
            grid-template-columns: 1fr !important;
          }
          .${className} [data-workbench-detail-pane="1"] {
            position: static !important;
            top: auto !important;
          }
        }
      `}</style>
      <div
        className={className}
        style={{
          display: "grid",
          gap: 16,
          alignItems: "start",
          gridTemplateColumns: `minmax(${leftMinWidth}px, 0.96fr) minmax(${rightMinWidth}px, 1.04fr)`,
          ...style,
        }}
      >
        <div style={{ minWidth: 0 }}>{left}</div>
        <div
          data-workbench-detail-pane="1"
          style={{
            minWidth: 0,
            alignSelf: "start",
            ...workbenchStickyPanelStyle(3, rightStickyTop),
          }}
        >
          {right}
        </div>
      </div>
    </>
  );
}
