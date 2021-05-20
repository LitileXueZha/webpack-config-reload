/**
 * Check webpack's configuration.
 * 
 * First, if match npm/yarn script, read it's content from
 * `package.json`. If not, skipped.
 * 
 * Then, check the matched content or this command, it
 * should start with `webpack/webpack-dev-server`. Examples:
 * 
 * 1. `webpack` - watch default config file
 * 2. `webpack-dev-server --config webpack.config.dev.js` - watch
 *    the specific config file
 * 
 * @see https://webpack.js.org/api/cli/#configuration-options
 */

const path = require('path');
const fs = require('fs/promises');
const colorCli = require('./colorCli');

const CONF_DEFAULT = ['webpack.config.js', 'webpackfile.js'];
const COMMANDS = ['webpack', 'webpack-dev-server'];
const REG_WEBPACK_CONF = /--config (\S+)/;

module.exports = async (command) => {
    let guessWebpack = command;
    const script = getScriptName();

    // read command content of script from package.json
    if (script) {
        const pathId = path.resolve(process.cwd(), 'package.json');
        // eslint-disable-next-line
        const pkgScripts = require(pathId).scripts;
        const content = pkgScripts[script];

        guessWebpack = content;
    }

    const reg = new RegExp(`^(${COMMANDS.join('|')})(\\s|$)`, 'i');
    const isWebpack = reg.test(guessWebpack);

    if (!isWebpack) {
        colorCli.yellow('WARN: detect webpack failed.');
        return false;
    }

    // find config of webpack
    const conf = REG_WEBPACK_CONF.exec(guessWebpack);
    const files = conf ? [conf[1]] : CONF_DEFAULT;

    // eslint-disable-next-line no-restricted-syntax
    for (const filePath of files) {
        try {
            // eslint-disable-next-line no-await-in-loop
            await fs.access(filePath);
            return [filePath, guessWebpack];
        } catch (e) { /* skipped */ }
    }

    colorCli.yellow('WARN: webpack configuration not exists.');
    return false;
};

/**
 * get package script name from `process.argv`
 * 
 * @returns {string} script name
 */
function getScriptName() {
    const { argv } = process;
    // start with 'npm/yarn'
    const start = argv.indexOf('npm') || argv.indexOf('yarn');

    if (start < 0) {
        return '';
    }

    // handle 'run/run-scirpt' subcommand
    const runScript = /run(-script)?/.test(argv[start + 1]);

    // skip 'run[-script]' if found
    return argv[start + (runScript ? 2 : 1)];
}
