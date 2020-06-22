const { Worker } = require('worker_threads')
const { ulid } = require('ulid')
const { deserializeError: deserializeError_notConfigured } = require('@m59/error-cereal')
const errorCerealPath = require.resolve('@m59/error-cereal')

const workerCode = `
	const { parentPort, workerData } = require('worker_threads')
	const { serializeError } = require('${errorCerealPath}')
	parentPort.setMaxListeners(Infinity)

	try {
		const functions = Object
			.entries(workerData.modules)
			.map(([ functionName, modulePath ]) => [ functionName, require(modulePath) ])
			.reduce((acc, [ k, v ]) => Object.assign(acc, { [k]: v }), {})

		parentPort.on('message', async ({ jobId, functionName, args }) => {
			try {
				const result = await functions[functionName](...args)
				parentPort.postMessage({ jobId, result })
			} catch (error) {
				parentPort.postMessage({ jobId, error: serializeError(error) })
			}
		})
		parentPort.postMessage({ initError: null })
	} catch (error) {
		parentPort.postMessage({ initError: serializeError(error) })
	}
`

module.exports = (
	modules,
	{
		customErrorConstructors = { }
	} = { }
) => {
	const deserializeError = object => deserializeError_notConfigured(object, {
		customErrorConstructors
	})

	let exited = false

	return new Promise((resolve, reject) => {
		const functions = Object
			.entries(modules)
			.map(([ functionName, modulePath ]) => [
				functionName,
				async (...args) => {
					if (exited) {
						throw new Error('workerized function was called after worker has exited')
					}
					return new Promise((resolve, reject) => {
						const jobId = ulid()
						const messageListener = message => {
							if (message.jobId === jobId) {
								worker.off('message', messageListener)
								message.error
									? reject(deserializeError(message.error))
									: resolve(message.result)
							}
						}
						worker.on('message', messageListener)
						worker.postMessage({ jobId, functionName, args })
					})
				}
			])
			.reduce((acc, [ k, v ]) => Object.assign(acc, { [k]: v }), {})

		const worker = new Worker(workerCode, { eval: true, workerData: { modules } })
		worker.setMaxListeners(Infinity)
		worker.once('message', ({ initError }) => initError
			? reject(deserializeError(initError))
			: resolve({ functions, worker })
		)
		worker.on('exit', () => exited = true)
	})
}
