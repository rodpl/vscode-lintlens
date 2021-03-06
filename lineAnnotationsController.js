const vscode = require('vscode');
const eslintManager = require('./eslintManager');
const constants = require('./constants');

const glyphs = constants.glyphs;

const annotationDecoration = vscode.window.createTextEditorDecorationType({
    after: {
        margin: '0 0 0 1em',
        color: '#999999',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none'
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
});

function clearAnnotations(editor) {
    if (editor === undefined || editor._disposed === true) {
        return;
    }
    editor.setDecorations(annotationDecoration, []);
}

function addAnnotations(editor, parser) {
    if (editor === undefined || editor._disposed === true || editor.document === undefined) {
        return;
    }

    const rules = parser(editor.document);
    if (rules.length === 0) {
        return clearAnnotations(editor);
    }

    Promise.all(rules.map(rule => {
        return eslintManager.getRuleDetails(rule.name)
            .then(ruleInfo => {
                const contentText = getContentText(ruleInfo);
                const hoverMessage = getHoverMessage(ruleInfo);
                let decoration = getDecorationObject(contentText, hoverMessage);
                decoration.range = rule.lineEndingRange;
                return decoration;
            });
    }))
        .then(decorations => {
            editor.setDecorations(annotationDecoration, decorations);
        })
        .catch(err => {
            console.log(err);
        });
}

function getContentText(ruleInfo) {
    let contentText;
    if (ruleInfo.isPluginMissing) {
        contentText = `${glyphs.emptyIcon} Missing: \`${ruleInfo.pluginPackageName}\``;
    } else if (!ruleInfo.isRuleFound) {
        contentText = `${glyphs.magnifyIcon} Rule not found`;
    } else {
        contentText = '';
        if (ruleInfo.isRecommended === true) {
            contentText += `${glyphs.starIcon} `;
        }

        if (ruleInfo.isDeprecated === true) {
            contentText += `${glyphs.NoEntryIcon} `;
        }

        if (ruleInfo.isFixable === true) {
            contentText += `${glyphs.wrenchIcon} `;
        }

        if (ruleInfo.category) {
            contentText += `[${ruleInfo.category}]:  `;
        }

        if (ruleInfo.description) {
            contentText += ruleInfo.description;
        } else {
            contentText += `eslint rule: ${ruleInfo.ruleName}`;
        }
    }

    return contentText;
}

function getHoverMessage(ruleInfo) {
    let hoverMessage;
    let commandString = getCommandString(`Click for more information \[${glyphs.arrowIcon}\]`, ruleInfo.infoUrl, `${ruleInfo.infoPageTitle} - ${constants.extensionName}`, 'Click for more information');
    if (ruleInfo.isPluginMissing) {
        /*
        Missing plugin: `{{ pluginName }}`

        [Click for more information `↗`](infoUrl)
        */
        hoverMessage = `**Missing plugin**: \`${ruleInfo.pluginName}\`\n\n${commandString}`;
    } else if (!ruleInfo.isRuleFound) {
        /*
        `{{ ruleName }}` not found

        [Click for more information `↗`](infoUrl)
        */
        hoverMessage = `**Rule not found**: \`${ruleInfo.ruleName}\`\n\n${commandString}`;
    } else {
        /*
        [ {{ category }} ] {{ ruleName }}
        [[ {{ star }} "recommended" ]]
        [[ {{ wrench }} "fixable" ]]
        [[ {{ skull }} "deprecated" ]]
        [[ "replaced by" {{ double arrow }} {{ replacedBy }} ]]

        > {{ description }}

        [Click for more information `↗`](infoUrl)
        */

        hoverMessage = `**${ruleInfo.ruleName}**`;
        if (ruleInfo.category) {
            hoverMessage += `&nbsp;&nbsp;&nbsp;\\[\`${ruleInfo.category}\`\\]`;
        }
        hoverMessage += '\n';

        if (ruleInfo.isRecommended === true) {
            hoverMessage += `&nbsp;&nbsp;${glyphs.starIcon}&nbsp;&nbsp;recommended\n`;
        }

        if (ruleInfo.isFixable === true) {
            hoverMessage += `&nbsp;&nbsp;${glyphs.wrenchIcon}&nbsp;&nbsp;fixable\n`;
        }

        if (ruleInfo.isDeprecated === true) {
            hoverMessage += `&nbsp;&nbsp;${glyphs.NoEntryIcon}&nbsp;&nbsp;deprecated\n`;
        }

        if (ruleInfo.replacedBy) {
            hoverMessage += `&nbsp;&nbsp;replaced by \`${ruleInfo.replacedBy}\`\n`;
        }

        if (ruleInfo.description) {
            hoverMessage += `\n---\n`;

            hoverMessage += `> ${ruleInfo.description}\n`;
            hoverMessage += `> ${nonBreakingPad('', 70)}\n`;

            hoverMessage += `\n---\n`;
        }

        hoverMessage += `\n${commandString}`;

        hoverMessage = hoverMessage.replace(/\n/g, '  \n');
    }

    let markdown = new vscode.MarkdownString(hoverMessage);
    markdown.isTrusted = true;

    return markdown;
}

function nonBreakingPad(text, length) {
    let ret = text;
    for (let i = text.length; i <= length; i++) {
        ret += '&nbsp;';
    }
    return ret;
}

function getCommandString(text, url, pageTitle, tooltip = '') {
    let args = {
        url,
        pageTitle
    };

    return `[${text}](command:${constants.openWebViewPanelCommand}?${encodeURIComponent(JSON.stringify(args))} "${tooltip || 'Click here'}")`;
}

function getDecorationObject(contentText, hoverMessage) {
    return {
        hoverMessage,
        renderOptions: {
            after: {
                contentText
            }
        }
    };
}

module.exports = {
    addAnnotations,
    clearAnnotations
};
