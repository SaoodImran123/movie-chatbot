const mongoose = require("mongoose")

const schema = mongoose.Schema({
	title: String,
	popularity: Number,
})

module.exports = mongoose.model("Post", schema)