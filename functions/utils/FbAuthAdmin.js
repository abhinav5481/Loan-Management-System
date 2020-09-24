const { admin, db } = require("./admin");
module.exports = (req, res, next) => {
    let idToken;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      idToken = req.headers.authorization.split("Bearer ")[1];
    } else {
      console.error("No token found");
      return res.status(403).json({ errror: "Unauthorized" });
    }

    admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
        req.user = decodedToken;
        console.log(decodedToken);
        // return next();
        return db.collection("admin")
        .where("email","==",req.user.email)
        .limit(1)
        .get();
    })
    .then((data)=> {
      if(data._size === 0){
        return res.status(403).json({error: "Unauthorized! Login Again"})
      }
            req.user.adminId = data.docs[0].data().adminId;       
            return next();
    })
    .catch((err) => {
        console.error("Error while verifying token ", err);
        return res.status(403).json(err);
      });
    
}