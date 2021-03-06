const vscode = require('vscode');
const fetch = require('node-fetch');

let webViewPanel;

function getPanel() {
    if (!webViewPanel) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        webViewPanel = vscode.window.createWebviewPanel('lintlensPanel', 'LintLens Web View', column || vscode.ViewColumn.One, {
            enableScripts: false,
            localResourceRoots: [],
            retainContextWhenHidden: true
        });

        webViewPanel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'alert':
                    vscode.window.showErrorMessage(message.text);
                    return;
            }
        }, null, []);

        webViewPanel.onDidDispose(() => {
            webViewPanel = null;
        }, null, []);
    }

    return webViewPanel;
}

module.exports = function showWebPanel(url, title) {
    fetch(url)
    .then(res => res.text())
    .then(body => {
        const panel = getPanel();
        panel.title = title;
        panel.webview.html = body;
        panel.reveal();
    });
}
