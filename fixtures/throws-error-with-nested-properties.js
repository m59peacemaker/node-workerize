module.exports = () => {
	throw Object.assign(new Error('an error'), { foo: { bar: 'baz' } })
}
