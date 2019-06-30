class SomeCustomError extends Error {
	constructor (message) {
		super(message)
		this.name = 'SomeCustomError'
	}
}

module.exports = () => {
	throw new SomeCustomError('a custom bad thing has happened')
}

Object.assign(module.exports, {
	SomeCustomError
})
