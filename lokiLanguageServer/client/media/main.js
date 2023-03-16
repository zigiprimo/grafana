(function () {
  const vscode = acquireVsCodeApi();

  document.getElementById('logs').addEventListener('click', function () {
    vscode.postMessage({ type: 'changeMode', value: 'logs' });
  });

  document.getElementById('exceptions').addEventListener('click', function () {
    vscode.postMessage({ type: 'changeMode', value: 'exceptions' });
  });

  document.getElementById('events').addEventListener('click', function () {
    vscode.postMessage({ type: 'changeMode', value: 'events' });
  });
})();
