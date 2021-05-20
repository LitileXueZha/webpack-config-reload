'use strict';

const commander = require('commander');
const fs = require('fs/promises');
const path = require('path');
const checkConfig = require('./checkConfig');
const colorCli = require('./colorCli');
const fileDependencies = require('./fileDependencies');
const FileWatcher = require('./FileWatcher');
const ExecCommand = require('./ExecCommand');

const { program } = commander;
const DESC = `
Auto reload webpack when configuration changes.
Examples:
  $ wc-reload npm start
  $ wc-reload webpack-dev-server --config dev.js
`.trim();

exports.run = () => {
    program
        .name('wc-reload')
        .version('0.0.1')
        .usage('[options] node scripts')
        .description(DESC)
        .allowUnknownOption(true)
        .action(runCommand);

    program.parse(process.argv);
};

async function runCommand() {
    const { args } = commander;

    if (args.length === 0) {
        colorCli.red('ERROR: no command found.');
        process.exit(1);
    }

    let startArg = 0;

    // unrecognized options also included in `args`
    // consider actual command should start without parameters
    // `--allow -b webpack` ==> `webpack`
    for (let i = 0, len = args.length; i < len; i++) {
        if (!/^-{1,2}/.test(args[i])) {
            startArg = i;
            break;
        }
    }
    await recognize();

    const command = args.slice(startArg).join(' ');
    const result = await checkConfig(command);

    // Webpack config not found
    if (!result) {
        new ExecCommand(command).runDirectly();
        return;
    }

    const [entryFile, webpackCmd] = result;
    const cmder = new ExecCommand(webpackCmd);
    let files;

    try {
        files = fileDependencies(entryFile);
    } catch (e) {
        console.error(e);
        colorCli.red('ERROR: failed to parse');
        return;
    }

    const watcher = new FileWatcher(files);
    const listener = (filename) => {
        try {
            // You have to catch error inside event listeners
            files = fileDependencies(entryFile);
        } catch (e) {
            cmder._close();
            console.error(e);
            colorCli.red('ERROR: failed to parse');
            return;
        }
        // console.log('INFO:', filename)
        watcher.add(files);
        console.clear();
        console.info('INFO:', 'reload webpack config');
        cmder.restart();
    };

    console.info('INFO: start watching files.\n');
    watcher.start();
    watcher.on('change', listener);
    watcher.on('remove', listener);
    console.info('$', webpackCmd);
    cmder.start();
    cmder.onFailed(() => {
        colorCli.red('ERROR: failed to run command');
        process.exit(1);
    });
}

/**
 * Recognize the npm project
 * 
 * It will chdir to the project root, add npm scripts to PATH.
 * For installed globally.
 * 
 * @return {string|boolean}
 */
async function recognize(name = 'package.json') {
    // Find current and ancestor's directory
    const find = async (dir) => {
        const pathname = path.join(dir, name);

        try {
            await fs.access(pathname);
            return dir;
        } catch (e) {
            const parentDir = path.join(dir, '..');

            // Reach to system root
            if (parentDir === dir) {
                return false;
            }
            return find(parentDir);
        }
    };
    const dir = await find(process.cwd());
    const DIR_BIN = 'node_modules/.bin';

    if (dir) {
        process.chdir(dir);
        process.env.PATH += `;${path.resolve(dir, DIR_BIN)}`;
    }
    return dir;
}
