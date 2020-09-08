const acorn = require('acorn');
const walk = require('acorn-walk');
const fs = require('fs');
const path = require('path');

const PARSE_OPTS = {
    ecmaVersion: 2020,
    sourceType: 'module',
};
const CWD = process.cwd();

/**
 * find all dependencies in one file
 * 
 * + support es6/import and node/require
 * + dependency from node_modules will be **IGNORED**
 * 
 * @param {string} filePath entrypoint file absolute path
 * @returns {Array<string>} dependency file paths
 */
module.exports = (filePath, dir = CWD) => {
    // eslint-disable-next-line no-use-before-define
    const fdep = new FileDependencies(filePath, dir);

    fdep.parseRecursive();
    return fdep.getAllDependencies();
};

class FileDependencies {
    /**
     * @param {string} file file path
     * @param {string} dir file relative directory
     */
    constructor(file, dir) {
        this._id = '';
        this.file = file;
        this.dir = dir;
        this.absolutePath = path.resolve(dir, file);
        this.dependencies = [];
        this._recursive = false;
    }

    /**
     * parse file content
     */
    parse() {
        const { absolutePath } = this;
        const content = fs.readFileSync(absolutePath, 'utf-8');
        const ast = acorn.parse(content, PARSE_OPTS);
        const deps = new Set();

        // see node types in estree
        // https://github.com/estree/estree
        walk.simple(ast, {
            ImportDeclaration(node) {
                walk.simple(node, {
                    Literal(cNode) {
                        deps.add(cNode.value);
                    },
                });
            },
            CallExpression(node) {
                // handle require('xxx')
                if (node.callee.name === 'require') {
                    walk.simple(node, {
                        Literal(cNode) {
                            deps.add(cNode.value);
                        },
                    });
                }
            },
        });

        this.dependencies = [...deps];
        this.ignore();
    }

    /**
     * parse recursively
     * 
     * find all of dependencies recursively, if can be required in file
     */
    parseRecursive() {
        this._recursive = true;
        this.parse();

        const { dependencies, dir } = this;
        const deps = [];

        // eslint-disable-next-line no-restricted-syntax
        for (const dep of dependencies) {
            try {
                const resolvedPath = require.resolve(path.resolve(dir, dep));
                const file = path.basename(resolvedPath);
                const ddir = path.dirname(resolvedPath);
                const fdep = new FileDependencies(file, ddir);

                // eslint-disable-next-line no-underscore-dangle
                fdep._id = dep;
                fdep.parseRecursive();
                deps.push(fdep);
            } catch (e) { /* skip */ }
        }

        this.dependencies = deps;
    }

    /**
     * delete dependency from node_modules,
     * it should start with './' or '../' or '/'
     * 
     * @see https://nodejs.org/api/modules.html#modules_loading_from_node_modules_folders
     */
    ignore() {
        const reg = /^\.{0,2}\//;
        const deps = this.dependencies.filter((dep) => reg.test(dep));

        this.dependencies = deps;
    }

    /**
     * get all dependent file absolute paths
     * 
     * @return {Array<string>} file paths
     */
    getAllDependencies() {
        // if parsed recursively
        if (this._recursive) {
            let paths = [this.absolutePath];

            // eslint-disable-next-line no-restricted-syntax
            for (const dep of this.dependencies) {
                const dPaths = dep.getAllDependencies();

                paths = paths.concat(dPaths);
            }

            return paths;
        }

        return this.dependencies;
    }
}
