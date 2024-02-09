export { default as FlameGraph, type Props } from './FlameGraphContainer';
export { checkFields, getMessageCheckFieldsResult } from './FlameGraph/dataTransform';
export { data } from './FlameGraph/testData/dataNestedSet';

// TODO(bryan) Trying to export this and use it somewhere in the plugin code.
const TEST_CONSTANT = 'MY CONSTANT';
export { TEST_CONSTANT };
