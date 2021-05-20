/* eslint-disable no-restricted-syntax */
const EventEmitter = require('events');
const fs = require('fs');

const EVENT_TYPE = {
    CHANGE: 'change',
    REMOVE: 'remove',
};

/**
 * **Caveat: only watch files.**
 * 
 * build-in two event type:
 * + `change` when one of list files changed
 * + `remove` file removed
 * 
 * listener form is on the basis of node `fs.watch`: `(eventType, filename) => {}`
 * 
 * @extends EventEmitter
 */
class FileWatcher extends EventEmitter {
    /**
     * @param {Array<string>} files absolute file paths, not dir
     */
    constructor(files) {
        super();
        this.files = files;
        this._watchers = new Map();
    }

    /**
     * start watching all files
     */
    start() {
        for (const file of this.files) {
            const watcher = this._watch(file);

            this._watchers.set(file, watcher);
        }
    }

    /**
     * @param {string} file
     * @returns {fs.FSWatcher} fs watcher
     */
    _watch(file) {
        let timer;
        let prevContent = fs.readFileSync(file);
        const watcher = fs.watch(file, (eventType) => {
            clearTimeout(timer);
            // debounce fired times because of some known issue
            timer = setTimeout(() => {
                if (eventType === 'change') {
                    const content = fs.readFileSync(file);
                    // use Buffer.equals seems faster
                    // NOTE: repace with content hash algorithm if occur problem
                    const isEqual = content.equals(prevContent);

                    if (isEqual) return;

                    prevContent = content;
                    this._emit(EVENT_TYPE.CHANGE, file);
                    return;
                }

                prevContent = null;
                this._emit(EVENT_TYPE.REMOVE, file);
            }, 500);
        });

        return watcher;
    }

    /**
     * fire a event
     * 
     * @param {string} eventType event type
     * @param {string} filename file path
     */
    _emit(eventType, filename) {
        // remove watcher
        if (eventType === EVENT_TYPE.REMOVE) {
            const watcher = this._watchers.get(filename);

            watcher.close();
            this.files = this.files.filter((f) => f !== filename);
            this._watchers.delete(filename);
        }

        this.emit(eventType, filename);
    }

    /**
     * stop watching all files
     */
    close() {
        for (const [key, watcher] of this._watchers) {
            watcher.close();
        }

        this._watchers.clear();
    }

    /**
     * add some files to watcher, skipped if it exist
     * 
     * @param {array<string>} files absolute file paths
     */
    add(files) {
        for (const file of files) {
            if (this._watchers.has(file)) {
                return;
            }

            this.files.push(file);
            this._watchers.set(file, this._watch(file));
        }
    }
}

module.exports = FileWatcher;
