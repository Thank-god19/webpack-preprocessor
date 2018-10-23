let _ = require('lodash');
let loaderUtils = require('loader-utils');
const os = require('os');

let definitions;
let EOLChar;        // Holds content EOL marker.

const globalRegex = /(?:((?:\/[*]|<!--).*?(?:[*]\/|-->))|(.*?))*/gm;

const elifRegex = /(?:\/[*]|<!--)(?:\s*)#elif\s+([!]?[\w-_]+(?:(?:&&[!]?[\w-_]+)*|(?:[|]{2}[!]?[\w-_]+)*))(?:\s*)(?:[*]\/|-->)/;
const elseRegex = /(?:\/[*]|<!--)(?:\s*)#else(?:\s*)(?:[*]\/|-->)/;
const endifRegex = /(?:\/[*]|<!--)(?:\s*)#endif(?:\s*)(?:[*]\/|-->)/;
const ifRegex = /(?:\/[*]|<!--)(?:\s*)#if\s+([!]?[\w-_]+(?:(?:&&[!]?[\w-_]+)*|(?:[|]{2}[!]?[\w-_]+)*))(?:\s*)(?:[*]\/|-->)/;

function getBranchCode(branchRules, code = '') {
    let activeBranch = _.find(branchRules, rule => {
        if (!rule.condition) { return true; }

        if (rule.condition.type === 'and') {
            let r = _.intersection(rule.condition.regard, definitions);
            let dr = _.difference(rule.condition.disregard, definitions);

            return r.length + dr.length === rule.condition.regard.length + rule.condition.disregard.length;
        } else if (rule.condition.type === 'or') {
            let r = _.intersection(rule.condition.regard, definitions);
            let dr = _.difference(rule.condition.disregard, definitions);

            return r.length + dr.length > 0;
        } else if (rule.condition[0] === '!') {
            return definitions.indexOf(rule.condition.substr(1)) === -1;
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
        code += EOLChar + rule.content;
    } else if (rule.type === 'branch') {
        code += getBranchCode(rule.content) || '';
    }

    return getCode(rules, code);
}

function getCondition(expression) {
    if (expression.indexOf('&&') !== -1) {
        let definitions = expression.split('&&');

        return {
            type: 'and',
            regard: _.filter(definitions, def => def[0] !== '!'),
            disregard: _.map(_.filter(definitions, def => def[0] === '!'), def => def.substr(1))
        };
    } else if (expression.indexOf('||') !== -1) {
        let definitions = expression.split('||');

        return {
            type: 'or',
            regard: _.filter(definitions, def => def[0] !== '!'),
            disregard: _.map(_.filter(definitions, def => def[0] === '!'), def => def.substr(1))
        };
    } else {
        return expression;
    }
}

function getRules(matches, stack = [{ content: [] }]) {
    let current;
    while (current = matches.shift()) {
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
    }

    return stack;
}

function PreprocessorLoader(content) {
    let query = loaderUtils.parseQuery(this.query) || {};
    definitions = query.definitions || [];

    // Dynamically determine file end of line (EOL) marker.
    // Use os.EOL if no EOL marker found.
    // Note: ECMA 5.1 Specifications permits end slicing
    // on empty strings
    let lc = content.slice(-1);
    if (lc === '\n') {
        let slc = content.slice(-2);
        if (slc === '\r') {
            EOLChar = '\r\n';
        } else {
            EOLChar = '\n';
        }
    } else {
        // Unknown EOL marker, use current OS EOL instead.
        EOLChar = os.EOL;
    }

    // Trim removes EOL marker. Place after finding it.
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

    // Ensure modified code reconstitutes final EOL marker,
    // as trim function removes it. ESLint is one of many
    // programs to complain if final line EOL marker is
    // missing.
    content = code + EOLChar;

    let variables = query.variables || [];

    _.each(variables, (value, key) => {
        let regex = new RegExp(`[$]{2}[{]{2}${key}[}]{2}`, 'g');

        content = content.replace(regex, value)
    });

    return content;
}

module.exports = PreprocessorLoader;
