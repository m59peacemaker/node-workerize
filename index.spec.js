const { test } = require('zora')
const workerize = require('./')

test('workerize returns functions that call modules in a worker', async t => {
	const { functions, worker, cleanup } = workerize({ sampleFn: require.resolve('./sample-fn') })
	const { sampleFn } = functions
	const args = [ 'foo', '123', { bar: 'baz' } ]
	const result = await sampleFn(...args)
	await cleanup()
	t.equal(typeof result.jankNumber, 'number')
	t.equal(result.inputArgs, args)
})
