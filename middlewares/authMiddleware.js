const isAuth = (req, res, next) => {
  // return req.session.isAuth
  //   ? next()
  //   : res.status(401).json("Session Expired, please log in again");
  if (req.session.isAuth) {
    console.log("isAuth", req.session.isAuth);
    res.header("Access-Control-Allow-Credentials", true);
    console.log("befour next");
    next();
    console.log(next);
    console.log("after next");
  } else {
    return res.status(401).json("Session Expired, please log in again");
  }
};

module.exports = { isAuth };
