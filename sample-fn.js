module.exports = (...inputArgs) => {
	const jankNumber = new Array(3000000)
		.fill(0)
		.map(_ => Math.random() * Math.random())
		.reduce((acc, n) => acc + n, 0)
	return { jankNumber, inputArgs }
}
