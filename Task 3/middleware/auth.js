function auth(req, res, next) {

    if (req.session.user) {
        next();
    } 
    else {
        res.send("Please login first");
    }

}

module.exports = auth;