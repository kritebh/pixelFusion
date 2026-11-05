import { useRef, useState } from "react";

/**
 * Drag-and-drop wiring shared by every drop area. `onDrop` receives the raw
 * DataTransfer and must read it synchronously, because the browser empties it
 * as soon as the drop event returns.
 *
 * dragenter/dragleave fire for every child element crossed, so a depth counter
 * stops the highlight from flickering off over the drop area's own children.
 */
export default function useDropTarget(onDrop) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  const dragProps = {
    onDragEnter: (event) => {
      event.preventDefault();
      depth.current += 1;
      setDragging(true);
    },
    onDragLeave: () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    },
    onDragOver: (event) => event.preventDefault(),
    onDrop: (event) => {
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      onDrop(event.dataTransfer);
    },
  };

  return { dragging, dragProps };
}
