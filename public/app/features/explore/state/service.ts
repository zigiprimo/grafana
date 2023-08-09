import { ReduxExploreService } from '../extensions/ReduxExploreService';

import { setExploreStore } from './store';

let exploreService: ReduxExploreService;

export function getExploreService() {
  return exploreService;
}

export function setupExploreRedux() {
  exploreService = new ReduxExploreService();
  exploreService.init();
  // @ts-ignore
  window.exploration = exploreService;
  // used internally by Explore. In other plugins create new instance
  setExploreStore(exploreService.getStore());
}
