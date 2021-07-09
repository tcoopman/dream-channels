require('@babel/polyfill');
require('@babel/register')({
	// These patterns are relative to the project directory (where the `package.json` file lives):
	ignore: ['node_modules/*', 'test/*']
});

const browserEnv = require('browser-env');
browserEnv();
