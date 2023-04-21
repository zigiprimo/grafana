import React from 'react';
import Moveable from 'react-moveable';

export const MoveableManager = (props: any) => {
  <Moveable {...props} draggable={true} resizable={true} individualGroupableProps={() => {}} />;
};
