const { test } = require('zora')
const workerize = require('./')
const { SomeCustomError } = require('../fixtures/throws-some-custom-error')

test('workerize returns functions that call modules in a worker', async t => {
	const { functions: { sampleFn }, worker, cleanup } = await workerize({
		sampleFn: require.resolve('../fixtures/sample-fn')
	})
	const args = [ 'foo', '123', { bar: 'baz' } ]
	const result = await sampleFn(...args)
	await cleanup()
	t.equal(typeof result.jankNumber, 'number')
	t.equal(result.inputArgs, args)
})

test('errors thrown in worker at initial module load get thrown by workerized function', async t => {
	try {
		const { functions: { syntaxErrorFn }, worker, cleanup } = await workerize({
			syntaxErrorFn: require.resolve('../fixtures/syntax-error')
		})
		t.fail('did not throw on worker init with syntax error')
	} catch (error) {
		t.ok(error instanceof SyntaxError, 'threw SyntaxError on worker init')
	}
})

test('errors with nested properties in worker are thrown with nested properties by workerized function', async t => {
	const { functions: { throwsError }, worker, cleanup } = await workerize({
		throwsError: require.resolve('../fixtures/throws-error-with-nested-properties')
	})
	try {
		await throwsError()
		t.fail('did not throw error thrown in worker')
	} catch (error) {
		t.ok(error instanceof Error, 'threw error from worker')
		t.equal(
			error.foo,
			{ bar: 'baz' },
			'error has nested properties from from error in worker'
		)
	}
	await cleanup()
})

test('{ customErrorConstructors } option allows handling custom errors from workers', async t => {
	const { functions: { throwsSomeCustomError }, worker, cleanup } = await workerize(
		{
			throwsSomeCustomError: require.resolve('../fixtures/throws-some-custom-error')
		},
		{
			customErrorConstructors: {
				SomeCustomError
			}
		}
	)
	try {
		await throwsSomeCustomError()
		t.fail('did not throw error thrown in worker')
	} catch (error) {
		t.ok(error instanceof SomeCustomError, 'threw the custom error thrown in worker')
	}
	await cleanup()
})
