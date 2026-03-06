function auth(req, res, next) {

    if (!req.session.user) {
        return res.status(401).send("Unauthorized access");
    }

    next();

}

module.exports = auth;