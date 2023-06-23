import React, { useEffect, useRef, useState } from 'react';

export function useContainerOverflow(children: React.ReactNode) {
  // null/undefined are valid react children so we need to filter them out to prevent unnecessary padding
  const childrenWithoutNull = React.Children.toArray(children).filter((child) => child != null);
  const [childVisibility, setChildVisibility] = useState<boolean[]>(Array(childrenWithoutNull.length).fill(false));
  const containerRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target instanceof HTMLElement && entry.target.parentNode) {
            const index = Array.prototype.indexOf.call(entry.target.parentNode.children, entry.target);
            setChildVisibility((prev) => {
              const newVisibility = [...prev];
              newVisibility[index] = entry.isIntersecting;
              return newVisibility;
            });
          }
        });
      },
      {
        threshold: 1,
        root: containerRef.current,
      }
    );
    if (containerRef.current) {
      Array.from(containerRef.current.children).forEach((item) => {
        if (item instanceof HTMLElement && item !== overflowRef.current) {
          intersectionObserver.observe(item);
        }
      });
    }
    return () => intersectionObserver.disconnect();
  }, [children]);

  const visibleChildren = childrenWithoutNull.map((child, index) => (
    <div key={index} style={{ order: index, visibility: childVisibility[index] ? 'visible' : 'hidden' }}>
      {child}
    </div>
  ));

  const overflowingChildren = childrenWithoutNull
    .map((child, index) => !childVisibility[index] && child)
    .filter(Boolean);

  return {
    containerProps: {
      ref: containerRef,
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        minWidth: 0,
        position: 'relative' as const,
      },
    },
    overflowProps: {
      ref: overflowRef,
      style: {
        order: childVisibility.indexOf(false),
        visibility: childVisibility.indexOf(false) > -1 ? 'visible' : 'hidden',
      },
    },
    visibleChildren,
    overflowingChildren,
  };
}
