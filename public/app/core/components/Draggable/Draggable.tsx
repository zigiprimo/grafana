import { css, cx } from '@emotion/css';
import React, { forwardRef, useState, DragEvent, ReactNode, Ref } from 'react';

import { GrafanaTheme2, PluginExtensionGlobalDrawerDroppedData } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

import { useTimeout } from '../../hooks/useTimeout';

interface DraggableProps {
  children: ReactNode;
  className?: string;
  data?: PluginExtensionGlobalDrawerDroppedData;
  draggable?: boolean;
  onDragStart?: (data: PluginExtensionGlobalDrawerDroppedData) => void;
  onDragEnd?: () => void;
}

export const Draggable = forwardRef(
  (
    { as: Tag = 'div', className, children, data, draggable = true, onDragStart, onDragEnd, ...props }: DraggableProps,
    ref: Ref<HTMLElement>
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isHovered] = useState(false);
    const styles = useStyles2(getDraggableStyles, { isDragging: isDragging, isHovered });

    const handleDragStart = (_: DragEvent<HTMLDivElement>) => {
      setIsDragging(true);
      data && onDragStart?.(data);
    };

    const handleDragEnd = (_: DragEvent<HTMLDivElement>) => {
      setIsDragging(false);
      onDragEnd?.();
    };

    useTimeout(() => setIsDragging(false), isDragging ? 1 : null);

    return (
      <Tag
        {...props}
        ref={ref}
        className={cx(className, styles.wrapper)}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {children}
      </Tag>
    );
  }
);

interface GetDraggableStylesProps {
  isDragging: boolean;
  isHovered: boolean;
}

const getDraggableStyles = (theme: GrafanaTheme2, { isDragging }: GetDraggableStylesProps) => ({
  wrapper: css({
    boxShadow: isDragging ? theme.shadows.z3 : 'none',
  }),
});
