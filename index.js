let argv = require('yargs').argv
console.dir(argv)

argv = require('minimist')(process.argv.slice(2), { alias: { s: 'story' } })
console.dir(argv)

// argv = require('optimist').argv
// console.dir(argv)