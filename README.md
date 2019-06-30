# @m59/workerize

Takes an object of CommonJS module paths that export functions and returns an object of functions that call the module functions in a worker.

Note that in many cases, it is better for a module like this one to accept a single value to act on rather than a collection, as the calling code could apply it to a collection if it wishes. In this case, that would restrict a single worker to running only a single module function. The simplest API I can think of at the moment for running more than one function in the same worker is to input an object of module paths and get an object of workerized functions.

## example

The bad thing you don't want to do:
```js
// some awful blocking synchronuos thing, or anything else that needs to run on a different thread
const perfHogzilla = require('./perf-hogzilla')

perfHogzilla() // bye-bye perf, you were hogged
```

```js
const workerize = require('@m59/workerize')

;(async () => {
	const {
		functions: { perfHogzilla }, // you can destructure the workerized function references
		worker,
		cleanup
	} = await workerize({
		perfHogzilla: require.resolve('./perfHogzilla')
	})

	// perfHogzilla is now asynchronous and no longer hogging this process
	// so... not really hog or zilla. Just perf.
	await perfHogzilla()

	await cleanup() // destroy the worker when you're done running functions in it
})
```

## caveats

You can only pass arguments to a workerized function that can be passed with [`postMessage`](https://nodejs.org/api/worker_threads.html#worker_threads_port_postmessage_value_transferlist). This limitation should not be obstructive for any usage I'd recommend.

## errors

Errors that are thrown in the worker are serialized, sent to the parent process, and deserialized back into errors. In most cases, the behavior would be the same as if the function were running directly on the parent and threw the error. If any workerized functions throw custom errors, the custom error constructors will need to be passed in to `workerize` so that it can deserialize them back into errors as they were in the worker.

## api

### `workerize(functionModulePaths, { customErrorConstructors })`


#### `functionModulePaths`
`functionModulePaths` is an object whose values should be string paths to CommonJS modules that export functions. The keys can be whatever you want. I like to name the functions the same as they would be named if not workerized, and then pass them to whatever needs them as usual. As long as the caller is expecting a promise to be returned, it does not need to realize the function is being executed in a worker.

```js
// ./foo.js
module.exports = () => 'foo value'
```
```js
// ./bar.js
module.exports = async () => 'bar value'
```
```js
const {
	functions: { foo, bar },
	worker,
	cleanup
} = await workerize({
	foo: './foo'
	bar: './bar'
})

;(async () => {
	await foo() // => 'foo value'
	await bar() // => 'bar value'
})
```

#### `customErrorConstructors`

This should be an object of custom error constructors of errors that may be thrown in workerized functions, if any.

```js
const { EpicBadFooError } = require('./foo')
const { BarredForLifeError } = require('./bar')

workerize(
	{
		foo: './foo',
		bar: './bar'
	},
	{
		customErrorConstructors: {
			// foo and bar can throw these, so this process needs to be aware of them
			EpicBadFooError,
			BarredForLifeError
		}
	}
)
```

#### returns `{ functions, worker, cleanup }`

##### `functions`

An object of workerized functions.

##### `worker`

The [`worker`](https://nodejs.org/api/worker_threads.html) instance the workerized functions run in.

##### `cleanup`

Function that undoes the effects of the call to `workerize`, particularly by destroying the worker.
