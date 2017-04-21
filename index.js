let _ = require('lodash');
let loaderUtils = require("loader-utils");

let definitions;

const globalRegex = /(?:((?:\/[*]|<!--).*?(?:[*]\/|-->))|(.*?))*/gm;

const elifRegex = /(?:\/[*]|<!--)(?:\s*)#elif\s+(\w+(?:(?:&&\w+)*|(?:[|]{2}\w+)*))(?:\s*)(?:[*]\/|-->)/;
const elseRegex = /(?:\/[*]|<!--)(?:\s*)#else(?:\s*)(?:[*]\/|-->)/;
const endifRegex = /(?:\/[*]|<!--)(?:\s*)#endif(?:\s*)(?:[*]\/|-->)/;
const ifRegex = /(?:\/[*]|<!--)(?:\s*)#if\s+(\w+(?:(?:&&\w+)*|(?:[|]{2}\w+)*))(?:\s*)(?:[*]\/|-->)/;

function getBranchCode(branchRules, code = '') {
    let activeBranch = _.find(branchRules, rule => {
        if (!rule.condition) { return true; }

        if (rule.condition.type === 'and') {
            return _.intersection(
                rule.condition.definitions,
                definitions
            ).length === rule.condition.definitions.length;
        } else if (rule.condition.type === 'or') {
            return _.intersection(
                rule.condition.definitions,
                definitions
            );
        } else {
            return definitions.indexOf(rule.condition) !== -1;
        }
    });

    if (activeBranch) {
        return getCode(activeBranch.content);
    }
}

function getCode(rules, code = '') {
    let rule = rules.shift();

    if (!rule) {
        return code;
    }

    if (rule.type === 'expression' && rule.content) {
        code += '\r\n' + rule.content;
    } else if (rule.type === 'branch') {
        code += getBranchCode(rule.content) || '';
    }

    return getCode(rules, code);
}

function getCondition(expression) {
    if (expression.indexOf('&&') !== -1) {
        return {
            type: 'and',
            definitions: expression.split('&&')
        };
    } else if (expression.indexOf('||') !== -1) {
        return {
            type: 'or',
            definitions: expression.split('||')
        };
    } else {
        return expression;
    }
}

function getRules(matches, stack = [{ content: [] }]) {
    let current = matches.shift();
    if (!current) {
        return stack[0];
    }

    let target;

    let match;
    if (match = current.match(ifRegex)) {
        target = stack[0];

        let branch = {
            type: 'branch',
            content: []
        };
        stack.unshift(branch);

        let ifBlock = {
            type: 'if',
            condition: getCondition(match[1]),
            content: []
        };
        stack.unshift(ifBlock);
        branch.content.push(ifBlock);

        target.content.push(branch);
        target.content.push(ifBlock);
    } else if (match = current.match(elifRegex)) {
        stack.shift(); // out of if
        target = stack[0];

        let ifBlock = {
            type: 'if',
            condition: getCondition(match[1]),
            content: []
        };
        stack.unshift(ifBlock);

        target.content.push(ifBlock);
    } else if (match = current.match(elseRegex)) {
        stack.shift(); // out of if
        target = stack[0];

        let ifBlock = {
            type: 'if',
            content: []
        };
        stack.unshift(ifBlock);

        target.content.push(ifBlock);
    } else if (match = current.match(endifRegex)) {
        stack.shift(); // out of if
        stack.shift(); // out of branch
    } else {
        target = stack[0];

        target.content.push({
            type: 'expression',
            content: current
        });
    }

    getRules(matches, stack);
    return stack;
}

function PreprocessorLoader(content) {
    let query = loaderUtils.parseQuery(this.query) || {};
    definitions = query.definitions || [];

    if (!content.trim()) {
        return content;
    }

    let matches = content.match(globalRegex);
    // ignore empty matches
    matches = _.filter(matches, match => match && match.length);

    let rules = getRules(matches);
    if (!rules) {
        return content;
    }

    rules = rules.shift().content;

    let code = getCode(rules);

    if (this.cacheable) {
        this.cacheable(true);
    }

    return code;
}

module.exports = PreprocessorLoader;