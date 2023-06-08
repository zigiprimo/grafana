import { BettererFileTest } from '@betterer/betterer';
import { promises as fs } from 'fs';
import { ESLint, Linter } from 'eslint';
import path from 'path';
import glob from 'glob';

let lastTime: number = Date.now();
const startTime: number = Date.now();
async function log(message: string) {
  const currentTime: number = Date.now();
  const timeSinceStart: number = currentTime - startTime;
  const timeSinceLast: number = currentTime - lastTime;
  lastTime = currentTime;
  const line = `${message} - Time since start: ${timeSinceStart}ms, Time since last: ${timeSinceLast}ms`;
  console.log(line);
  return fs.appendFile('./log.log', line + '\n');
}
export default {
  'better eslint': () =>
    countEslintErrors()
      .include('**/*.{ts,tsx}')
      .exclude(/public\/app\/angular/),
  'no undocumented stories': () => countUndocumentedStories().include('**/!(*.internal).story.tsx'),
};

// const noCache = process.env.NO_CACHE;
const noCache = true;

function countUndocumentedStories() {
  return new BettererFileTest(async (filePaths, fileTestResult) => {
    await Promise.all(
      filePaths.map(async (filePath) => {
        // look for .mdx import in the story file
        const regex = new RegExp("^import.*.mdx';$", 'gm');
        const fileText = await fs.readFile(filePath, 'utf8');
        if (!regex.test(fileText)) {
          // In this case the file contents don't matter:
          const file = fileTestResult.addFile(filePath, '');
          // Add the issue to the first character of the file:
          file.addIssue(0, 0, 'No undocumented stories are allowed, please add an .mdx file with some documentation');
        }
      })
    );
    log('Finished stories');
  });
}
process.on('beforeExit', async () => {
  await log('Exit ');
  process.exit(0);
});

log('----');
function countEslintErrors() {
  return new BettererFileTest(async (filePaths, fileTestResult, resolver) => {
    log('Starting eslint cycle');
    const { baseDirectory } = resolver;
    const cli = new ESLint({ cwd: baseDirectory });

    const eslintConfigFiles = await glob('**/.eslintrc');
    const eslintConfigMainPaths = eslintConfigFiles.map((file) => path.resolve(path.dirname(file)));

    const baseRules: Partial<Linter.RulesRecord> = {
      '@typescript-eslint/no-explicit-any': 'error',
      '@grafana/no-aria-label-selectors': 'error',
    };

    const nonTestFilesRules: Partial<Linter.RulesRecord> = {
      ...baseRules,
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
    };

    // group files by eslint config file
    // this will create two file groups for each eslint config file
    // one for test files and one for non-test files
    const fileGroups: Record<string, string[]> = {};

    for (const filePath of filePaths) {
      let configPath = eslintConfigMainPaths.find((configPath) => filePath.startsWith(configPath)) ?? '';
      const isTestFile =
        filePath.endsWith('.test.tsx') ||
        filePath.endsWith('.test.ts') ||
        filePath.includes('__mocks__') ||
        filePath.includes('public/test/');

      if (isTestFile) {
        configPath += '-test';
      }
      if (!fileGroups[configPath]) {
        fileGroups[configPath] = [];
      }
      fileGroups[configPath].push(filePath);
    }

    log('Starting eslint checks');
    for (const configPath of Object.keys(fileGroups)) {
      const rules = configPath.endsWith('-test') ? baseRules : nonTestFilesRules;
      // this is by far the slowest part of this code. It takes eslint about 2 seconds just to find the config
      let linterOptions: Linter.Config;
      log('Fetching config');
      const cachedRules = noCache ? undefined : await getCachedEslintConfig(configPath);
      if (cachedRules) {
        linterOptions = cachedRules;
        const ignorePlugins = [
          'jsdoc',
          'react-hooks',
          'import',
          '@emotion',
          'jest',
          'lodash',
          'jsx-a11y',
          'react',
          // '@grafana',
        ];
        linterOptions.plugins = linterOptions.plugins?.filter((plugin) => !ignorePlugins.includes(plugin));
        log('Using cached rules');
      } else {
        linterOptions = (await cli.calculateConfigForFile(fileGroups[configPath][0])) as Linter.Config;
        await saveCachedEslintConfig(configPath, linterOptions);
        log('Using non-cached rules');
      }
      const runner = new ESLint({
        overrideConfig: {
          ...linterOptions,
          rules: rules,
        },
        allowInlineConfig: false,
        useEslintrc: false,
        cwd: baseDirectory,
      });
      log('Finishg initializing eslint');
      const lintResults = await runner.lintFiles(fileGroups[configPath]);
      log('Finished running eslint');
      lintResults
        .filter((lintResult) => lintResult.source)
        .forEach((lintResult) => {
          const { messages } = lintResult;
          const filePath = lintResult.filePath;
          const file = fileTestResult.addFile(filePath, '');
          messages.forEach((message, index) => {
            file.addIssue(0, 0, message.message, `${index}`);
          });
        });
    }
  });
}

let eslintCache: Record<string, Linter.Config> | undefined;

async function getEslintCache(): Promise<Record<string, Linter.Config> | undefined> {
  if (!eslintCache) {
    try {
      const cacheContent = await fs.readFile('.betterer-eslint-cache', 'utf8');
      eslintCache = JSON.parse(cacheContent);
    } catch (e) {
      return undefined;
    }
  }
  return eslintCache;
}

async function getCachedEslintConfig(path: string): Promise<Linter.Config | undefined> {
  const cache = await getEslintCache();
  return cache?.[path];
}

async function saveCachedEslintConfig(path: string, config: Linter.Config): Promise<void> {
  const cache = (await getEslintCache()) || {};
  cache[path] = config;
  await fs.writeFile('.betterer-eslint-cache', JSON.stringify(cache));
}
