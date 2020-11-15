const { exec, spawn } = require('child_process');
const os = require('os');

/**
 * exec the command
 * 
 * after initialize, use `.start()` to execute
 */
class ExecCommand {
    /**
     * @param {string} cmd the command
     */
    constructor(cmd) {
        this.cmd = cmd;
        /** the child process */
        this._cp = null;
        this._win = os.platform() === 'win32';
        this.failed = false;
        /** events will be fired if failed */
        this._failEvents = null;
    }

    /**
     * with addition output
     */
    runDirectly() {
        console.info('INFO: run command directly.\n');
        console.info('$', this.cmd);
        this.start();
    }

    start() {
        this._cp = spawn(this.cmd, {
            shell: true,
            stdio: 'inherit',
        });
    }

    _close() {
        if (!this._win) {
            this._cp.kill(0);
            return;
        }

        // on Windows
        exec(`taskkill /T /F /PID ${this._cp.pid}`);
    }

    restart() {
        if (this._cp) {
            this._cp.off('exit', this._failEvents);
            this._close();
        }
        this.failed = false;
        this.start();
        // rebind for 'onFailed'
        this._cp.on('exit', this._failEvents);
    }

    /**
     * failed to exec command
     * 
     * @param {function} cb callback
     */
    onFailed(cb) {
        if (!this._cp) return;

        this._failEvents = (code) => {
            if (code !== 0) {
                this.failed = true;
                cb();
            }
        };
        this._cp.on('exit', this._failEvents);
    }
}

module.exports = ExecCommand;
