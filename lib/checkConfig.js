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
const fs = require('fs');
const colorCli = require('./colorCli');

const CONF_DEFAULT = ['webpack.config.js', 'webpackfile.js'];
const COMMANDS = ['webpack', 'webpack-dev-server'];
const REG_WEBPACK_CONF = /--config (\S+)/;

module.exports = async (command) => {
    let guessWebpack = command;
    const script = getScriptName();

    // read command content of script from package.json
    if (script) {
        const pkgScripts = await readPkgScripts();
        const content = pkgScripts[script];

        guessWebpack = content;
    }

    const reg = new RegExp(`^(${COMMANDS.join('|')})\\s`);
    const isWebpack = reg.test(guessWebpack);

    if (!isWebpack) {
        colorCli.yellow('Warn: detect webpack failed.');
        return false;
    }

    // find config of webpack
    const conf = REG_WEBPACK_CONF.exec(guessWebpack);
    let files = CONF_DEFAULT;

    // custom config found
    if (conf) {
        files = [conf[1]];
    }
    // eslint-disable-next-line no-restricted-syntax
    for (const filePath of files) {
        if (await fileExists(filePath)) {
            return filePath;
        }
    }

    // config file doesn't exist
    colorCli.yellow('Warn: webpack config file doesn\'t exist in current directory.');
    return false;
};

/**
 * read "scirpts" field from `package.json`
 * 
 * @returns {object} scripts
 */
function readPkgScripts() {
    return new Promise((resolve, reject) => {
        const cwd = process.cwd();
        // lookup max deepth
        const files = ['', '..', '../..'];

        ((function readRecursion(i) {
            if (i >= files.length) {
                reject();
                return;
            }

            const filePath = path.resolve(cwd, files[i], 'package.json');

            fs.access(filePath, (err) => {
                if (err) {
                    readRecursion(i + 1);
                    return;
                }

                // eslint-disable-next-line
                resolve(require(filePath).scripts);
            });
        })(0));
    });
}

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

function fileExists(filePath) {
    return new Promise((resolve) => {
        fs.access(filePath, (err) => {
            resolve(!err);
        });
    });
}
