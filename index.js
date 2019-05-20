const { Worker } = require('worker_threads')
const { promisify } = require('util')
const { ulid } = require('ulid')

module.exports = modules => {
	const functions = Object
		.entries(modules)
		.map(([ functionName, modulePath ]) => [
			functionName,
			async (...args) =>
				new Promise((resolve, reject) => {
					const jobId = ulid()
					const messageListener = message => {
						if (message.jobId === jobId) {
							worker.off('message', messageListener)
							message.error ? reject(message.error) : resolve(message.result)
						}
					}
					worker.on('message', messageListener)
					worker.postMessage({ jobId, functionName, args })
				})
		])
		.reduce((acc, [ k, v ]) => Object.assign(acc, { [k]: v }), {})

	// TODO: serialize error message better
	const workerCode = `
		const { parentPort, workerData } = require('worker_threads')
		parentPort.setMaxListeners(Infinity)

		const functions = Object
			.entries(workerData.modules)
			.map(([ functionName, modulePath ]) => [ functionName, require(modulePath) ])
			.reduce((acc, [ k, v ]) => Object.assign(acc, { [k]: v }), {})

		parentPort.on('message', async ({ jobId, functionName, args }) => {
			try {
				const result = await functions[functionName](...args)
				parentPort.postMessage({ jobId, result })
			} catch (error) {
				parentPort.postMessage({ jobId, error: error.toString() })
			}
		})
	`

	const worker = new Worker(workerCode, { eval: true, workerData: { modules } })
	worker.setMaxListeners(Infinity)

	const cleanup = promisify(worker.terminate.bind(worker))

	return { functions, worker, cleanup }
}
