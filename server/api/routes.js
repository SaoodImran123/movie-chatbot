const express = require("express")
const Post = require("./Post") // new
const router = express.Router()

// Get all posts
router.get("/posts", async (req, res) => {
	const posts = await Post.find()
	res.send(posts)
})


router.get("/posts/:id", async (req, res) => {
	const post = await Post.findOne({ _id: req.params.id })
	res.send(post)
})


module.exports = router