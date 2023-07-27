import { Project, StructureKind } from 'ts-morph';

const project = new Project({
  // Optionally specify compiler options, tsconfig.json, in-memory file system, and more here.
  // If you initialize with a tsconfig.json, then it will automatically populate the project
  // with the associated source files.
  // Read more: https://ts-morph.com/setup/
});

project.addSourceFilesAtPaths('packages/grafana-ui/**/*.ts');
project.addSourceFilesAtPaths('packages/grafana-ui/**/*.tsx');

const indexFile = project.getSourceFiles('packages/grafana-ui/src/index.ts')[0];

const exportedDeclarations = indexFile.getExportedDeclarations();

for (const [name, declarations] of exportedDeclarations) {
  console.log('Exported name:', name);

  for (const decl of declarations) {
    console.log(decl);
  }
}
