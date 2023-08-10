import { Exploration } from './types';

let exploration: new () => Exploration;

export function setExplorationServiceFactory(factory: new () => Exploration) {
  exploration = factory;
}

export function getExplorationServiceFactory() {
  return exploration;
}
