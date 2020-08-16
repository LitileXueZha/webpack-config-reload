'use strict';

const commander = require('commander');
const checkConfig = require('./checkConfig');
const colorCli = require('./colorCli');

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
        colorCli.red('Error: no command found.');
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

    const command = args.slice(startArg).join(' ');
    const file = await checkConfig(command);

    if (!file) {
        console.log('Info: run command directly.');
    }
}
