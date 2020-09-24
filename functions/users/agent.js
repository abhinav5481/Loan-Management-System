const { db, admin } = require("../utils/admin");
const config = require("../utils/config");
const firebase = require("firebase");

firebase.initializeApp(config);

const {
  validateSignupAgent,
  validateLogin,
  reduceBody,
} = require("../utils/validators");

const isAgent = (email) => {
  var domain = email.split("@")[1];
  //TODO: Replace domain name with the company's domain name to authenticate agent!
  // return domain === "vomoto.com" ? true : false;

  //REMARK: Avoiding non-business email for testing purpose
  return (domain === "gmail.com" || domain === "yahoo.com" || domain === "hotmail.com" || domain === "msn.com" || domain === "outlook.com") ? false : true;
};

const isEmpty = (string) => {
    if (string.trim() === "") {
      return true;
    } else return false;
  };

const validateLoanRequest = (data) => {
    let errors = {};
    if(isEmpty(data.loanType)){
        errors.loanType = "Must not be empty";
    }
    if(isEmpty(data.loanAmount.toString(10))){
        errors.loanAmount = "Must not be empty";
    }
    if(isEmpty(data.tenure.toString(10))){
        errors.tenure = "Must not be empty";
    }
    if(isEmpty(data.rate)){
        errors.rate = "Must not be empty";
    }
    return {errors, valid: Object.keys(errors).length === 0 ? true : false};
}

exports.signupAgent = (req, res) => {
  const newAgent = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    adminId: req.body.adminId,
    phone: req.body.phone,
    age: req.body.age,
    address: req.body.address
  };

  const { valid, errors } = validateSignupAgent(newAgent);
  if (!valid) {
    return res.status(400).json(errors);
  }

  if (!isAgent(newAgent.email)) {
    return res.status(403).json({ error: "Unauthorized / Use business email or domain name other than ['gmail.com','yahoo.com','msn.com','outlook.com','hotmail.com']" });
  }
  let token, agentId;
  db.doc(`/admin/${newAgent.adminId}`)
    .get()
    .then((doc) => {
      console.log(doc);
      if (!doc.exists) {
        return res.status(404).json({ error: "Please enter a valid adminId" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newAgent.email, newAgent.password);
      }
    })
    .then((data) => {
      agentId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;

      const agentCredentials = {
        name: newAgent.name,
        email: newAgent.email,
        agentId: agentId,
        loanDetails: [],
        adminId: newAgent.adminId,
        customers: [],
        age: newAgent.age,
        phone: newAgent.phone,
        address: newAgent.address
      };
      return db.collection("agents").add(agentCredentials);
    })
    .then((doc) => {
      agentId = doc.id;
      return db.collection("agents").doc(agentId).update({ agentId: agentId });
    })
    .then((doc) => {
      return db
        .collection("admin")
        .doc(`${newAgent.adminId}`)
        .update({
          agents: admin.firestore.FieldValue.arrayUnion(`${agentId}`),
        });
    })
    .then(() => {
      var user = firebase.auth().currentUser;
      return user.sendEmailVerification();
    })
    .then(function () {
      return res
        .status(201)
        .json({ token: token, Verification: "Sent an email verification link, please verify you email before login." });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.loginAgent = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  const { valid, errors } = validateLogin(user);
  if (!valid) {
    return res.status(400).json(errors);
  }
  var token;
  db.collection("agents")
    .where("email", "==", req.body.email)
    .limit(1)
    .get()
    .then((data) => {
      if (data.docs[0].data() === null) {
        return res.status(400).json({ error: "No agent found!" });
      } else {
        return firebase
          .auth()
          .signInWithEmailAndPassword(user.email, user.password);
      }
    })
    .then((data) => {
      token = data.user.getIdToken();
      return token;
    })
    .then((token) => {
      var FbUser = firebase.auth().currentUser;
      var verficationStatus = FbUser.emailVerified;
      return verficationStatus;
    })
    .then((verified) => {
      if (!verified) {
        return res.status(401).json({ error: "Please verify your email!" });
      }
      return token;
    })
    .then((token) => {
      return res.status(200).json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ general: "Wrong credential, please try again" });
      }
      return res.status(500).json({ error: err.code });
    });
};

exports.loanRequest = (req, res) => {
  const newLoan = {
    customerId: req.params.customerId,
    agentId: req.user.agentId,
    loanType: req.body.loanType,
    loanAmount: req.body.loanAmount,
    tenure: req.body.tenure,
    rate: req.body.rate,
    loanStatus: "new",
    registrationDate: new Date(),
    lastUpdate: new Date()
    // registrationDate: new Date().to
  };
  let cusId = req.params.customerId;
  const { valid, errors } = validateLoanRequest(newLoan);
  if(!valid){
      return res.status(400).json(errors);
  }
  let loanId;

  db.collection("agents").doc(`${req.user.agentId}`)
  .get()
  .then((doc) => {
      return doc.data();
  })
  .then((data) => {
      return data.customers;
  })
  .then((custArr) => {
    let flag = 0;
    for (var i = 0; i < custArr.length; i++) {
        if (custArr[i].customerId === `${cusId}`) {
          flag = 1;
          break;
        }
      }
      if(flag === 0){
          return res.status(404).json({message: `Customer with id ${cusId} has not been registered under you!`})
      }
      return db.collection("loans")
      .add(newLoan)
})
    .then((doc) => {
      loanId = doc.id;
      return db.collection("loans").doc(`${loanId}`).update({
        loanId: loanId,
      });
    })
    .then(() => {
       return db.collection("loans").doc(`${loanId}`).collection("history").doc(`${loanId}`).set(newLoan)
    })
    .then((doc) => {
        return db.collection("loans").doc(`${loanId}`).collection("history").doc(`${loanId}`).update({
            loanId: loanId
        })
    })
    .then((doc) => {
      return db
        .collection("customers")
        .doc(`${newLoan.customerId}`)
        .update({
          loanDetails: admin.firestore.FieldValue.arrayUnion(`${loanId}`),
        });
    })
    .then((doc) => {
      return db
        .collection("agents")
        .doc(`${newLoan.agentId}`)
        .update({
          loanDetails: admin.firestore.FieldValue.arrayUnion(`${loanId}`),
        });
    })
    .then((doc) => {
      return res
        .status(200)
        .json({
          message: "Loan request successfully initiated.",
          loanId: loanId,
        });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.agentGetCustomers = (req, res) => {
 
  let agentId = req.user.agentId;
  let customers;
  db.collection("agents")
    .doc(`${agentId}`)
    .get()
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      customers = data.customers;
      return customers;
    })
    .then((customerDetails) => {
      return res.status(200).json({ CustomerList: customerDetails });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.agentGetCustomerDetails = (req, res) => {
  let customerId = req.params.customerId;
  db.collection("agents").doc(`${req.user.agentId}`).get()
  .then((doc) => {
      return doc.data();
  })
  .then((data) => {
    return data.customers;
})
.then((custArr) => {
    let flag = 0;
    for (var i = 0; i < custArr.length; i++) {
        if (custArr[i].customerId === `${customerId}`) {
          flag = 1;
          break;
        }
      }
      if(flag === 0){
          return res.status(404).json({message: `Customer with id ${customerId} has not been registered under you`})
      }
      return db.collection("customers")
      .doc(`${customerId}`)
      .get()
})
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      return res.status(200).json({ customerDetails: data });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.agentGetLoanDetails = (req, res) => {
  let loanId = req.params.loanId;
  let cusId = req.params.customerId;

  db.collection("agents").doc(`${req.user.agentId}`)
  .get()
  .then((doc) => {
      return doc.data();
  })
  .then((data) => {
      return data.customers;
  })
  .then((custArr) => {
    let flag = 0;
    for (var i = 0; i < custArr.length; i++) {
        if (custArr[i].customerId === `${cusId}`) {
          flag = 1;
          break;
        }
      }
      if(flag === 0){
          return res.status(404).json({message: `Customer with id ${cusId} has not been registered under you!`})
      }
      return db.collection("customers").doc(`${cusId}`).get();
})
.then((doc) => {
    return doc.data();
})
.then((data) => {
    return data.loanDetails;
})
.then((loanArr) => {
    if(!(loanArr.includes(`${loanId}`))){
        return res.status(404).json({message: "No loan found!"})
    }
    return db.collection("loans")
    .doc(`${loanId}`)
    .get();
})
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
        const loanData = data;
        loanData.registrationDate = loanData.registrationDate.toDate();
        loanData.lastUpdate = loanData.lastUpdate.toDate();
      return res.status(200).json({ loanDetails: loanData });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.agentEditLoanDetails = (req, res) => {
  let loanId = req.params.loanId;
  let cusId = req.params.customerId;
  let loanDetails = reduceBody(req.body);
  let loanHistory;

  db.collection("agents").doc(`${req.user.agentId}`)
  .get()
  .then((doc) => {
      return doc.data();
  })
  .then((data) => {
      return data.customers;
  })
  .then((custArr) => {
    let flag = 0;
    for (var i = 0; i < custArr.length; i++) {
        if (custArr[i].customerId === `${cusId}`) {
          flag = 1;
          break;
        }
      }
      if(flag === 0){
          return res.status(404).json({message: `Customer with id ${cusId} has not been registered under you!`})
      }
      return db.collection("customers").doc(`${cusId}`).get();
})
.then((doc) => {
    return doc.data();
})
.then((data) => {
    return data.loanDetails;
})
.then((loanArr) => {
    if(!(loanArr.includes(`${loanId}`))){
        return res.status(404).json({message: "No loan found!"})
    }
    return db.collection("loans")
    .doc(`${loanId}`)
    .get();
})
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
        loanHistory = data;
        return data;
    })
    .then((data) => {
      if (data.loanStatus === "approved") {
        return res.status(403).json({
          message:
            "This loan has been approved by admin & it can not be edited!",
        });
      }
      return db.collection("loans").doc(`${loanId}`).update(loanDetails);
    })
    .then(() => {
        loanHistory.lastUpdate = new Date();
        return db.collection("loans").doc(`${loanId}`).collection("history").doc(`${loanId}`).update(loanHistory);
    })
    .then((doc) => {
      return res
        .status(200)
        .json({ message: "Loan details updated sucessfully!" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.agentRollbackLoan = (req,res) => {
    let loanId = req.params.loanId;
    let cusId = req.params.customerId;
    let loanHistory;
    let loanCurrent;

    db.collection("agents").doc(`${req.user.agentId}`)
  .get()
  .then((doc) => {
      return doc.data();
  })
  .then((data) => {
      return data.customers;
  })
  .then((custArr) => {
    let flag = 0;
    for (var i = 0; i < custArr.length; i++) {
        if (custArr[i].customerId === `${cusId}`) {
          flag = 1;
          break;
        }
      }
      if(flag === 0){
          return res.status(404).json({message: `Customer with id ${cusId} has not been registered under you!`})
      }
      return db.collection("customers").doc(`${cusId}`).get();
})
.then((doc) => {
    return doc.data();
})
.then((data) => {
    return data.loanDetails;
})
.then((loanArr) => {
    if(!(loanArr.includes(`${loanId}`))){
        return res.status(404).json({message: "No loan found!"})
    }
    return db.collection("loans")
    .doc(`${loanId}`)
    .get();
})
    .then((doc)=>{
        return doc.data();
    })
    .then((data) =>{
        loanCurrent = data;
        if(data.loanStatus !== "new"){
            return res.status(403).json({
                message:
                  `This loan has alredy been ${data.loanStatus} by admin hence it can't be edited!`,
              });
        }
        return db.collection("loans").doc(`${loanId}`).collection("history").doc(`${loanId}`).get();
    })
    .then((doc) => {
        return doc.data();
    })
    .then((data) => {
        loanHistory = data;
        loanHistory.lastUpdate = new Date();
        return db.collection("loans").doc(`${loanId}`).update(loanHistory);
    })
    .then(() => {
        loanCurrent.lastUpdate = new Date();
        return db.collection("loans").doc(`${loanId}`).collection("history").doc(`${loanId}`).update(loanCurrent);
    })
    .then(() => {
        loanHistory.registrationDate = loanHistory.registrationDate.toDate()
      return res.status(200).json({message: "Loan has successfully been rolled back to previous value", loanDetails: loanHistory});
    })
    .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    })
}

exports.agentDeleteLoan = (req, res) => {
  let loanId = req.params.loanId;
  let cusId = req.params.customerId;

  db.collection("agents").doc(`${req.user.agentId}`)
  .get()
  .then((doc) => {
      return doc.data();
  })
  .then((data) => {
      return data.customers;
  })
  .then((custArr) => {
    let flag = 0;
    for (var i = 0; i < custArr.length; i++) {
        if (custArr[i].customerId === `${cusId}`) {
          flag = 1;
          break;
        }
      }
      if(flag === 0){
          return res.status(404).json({message: `Customer with id ${cusId} has not been registered under you!`})
      }
      return db.collection("customers").doc(`${cusId}`).get();
})
.then((doc) => {
    return doc.data();
})
.then((data) => {
    return data.loanDetails;
})
.then((loanArr) => {
    if(!(loanArr.includes(`${loanId}`))){
        return res.status(404).json({message: "No loan found!"})
    }
    return db.collection("loans")
    .doc(`${loanId}`)
    .get();
})
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      if (data.loanStatus === "approved") {
        return res.status(403).json({
          message:
            "This loan has been approved by admin & it can not be deleted!",
        });
      }
      return db.collection("loans").doc(`${loanId}`).delete();
    })
    .then(() => {
      return res
        .status(200)
        .json({ message: `Loan with id: ${loanId} has been deleted successfully!` });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.agentGetAllLoans = (req,res) => {
    const arr = [];  
    let ref = db.collection("loans");  
    if(req.query.hasOwnProperty("tenure")){
       ref =  ref.orderBy("tenure",`${req.query.tenure}`);
    }
    
    if(req.query.hasOwnProperty("loanAmount")){
        ref =  ref.orderBy("loanAmount",`${req.query.loanAmount}`);
     }
     if(req.query.hasOwnProperty("registrationDate")){
         ref = ref.orderBy("registrationDate",`${req.query.registrationDate}`)
     }
    ref.get()
    .then((doc) => {
        return doc.docs;
    })
    .then((datas) => {
       
        datas.map((data) => {
            const rawData = data.data();
            rawData.registrationDate = rawData.registrationDate.toDate();
            rawData.lastUpdate = rawData.lastUpdate.toDate();
            arr.push(rawData);
        })
        if(Object.keys(req.query).length === 0){
            const ansArr = [];
            arr.map((an) => {
           if(an.agentId === `${req.user.agentId}`){
               ansArr.push(an);
           }
       })
            return res.status(200).json({"Loan Details": ansArr})
        }
        return arr
    })
    .then((arr) => {
        if(req.query.hasOwnProperty("loanStatus")){
            const ans = [];
            arr.map((an) => {
                if(an.loanStatus === req.query.loanStatus){
                    ans.push(an);
                }
            })
            return ans;
        }
        else{
            return arr;
        }
        
    })
    .then((arr) => {
        
        if(req.query.hasOwnProperty("loanType")){
          const  newAns = [];
            arr.map((an) => {
                if(an.loanType === req.query.loanType){
                    newAns.push(an);
                }
            })
            return newAns;
        }
        else{
            return arr;
        }
    })
    .then((newArr) => {
       const ansArr = [];
       newArr.map((an) => {
           if(an.agentId === `${req.user.agentId}`){
               ansArr.push(an);
           }
       })

        return res.status(200).json({"Loan Details": ansArr})
    })
    .catch((err) => {
        console.error(err);
    })
}

exports.listAllAdmins = (req,res) => {
    let arr = [];
    db.collection("admin").get()
    .then((doc) => {
        return doc.docs;
    })
    .then((doc) =>{
        doc.map((d) => {
            arr.push(d.data().adminId);
        })
       return res.status(200).json({adminList: arr});
    })
    .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    })
}


exports.agentLogout = (req,res) => {
  firebase.auth().signOut()
  .then(() => {
    return res.status(200).json({message: "You have successfully signed out!"})
  })
  .catch((err) => {
    console.error(err);
    res.status(500).json({ error: err.code });
  })
}