module.exports = {
  notFound(req, res, next) {
    res.status(404);
    res.json({"msg": "Api endpoint not available"});
  }
}
