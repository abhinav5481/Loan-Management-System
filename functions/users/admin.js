const { db, admin } = require("../utils/admin");
const firebase = require("firebase");
const { validateSignup, validateLogin } = require("../utils/validators");
const querystring = require("query-string");
const { raw } = require("express");


const isEmpty = (string) => {
  if (string.trim() === "") {
    return true;
  } else return false;
};


exports.loginAdmin = (req, res) => {
  const adminDetail = {
    email: req.body.email,
    password: req.body.password,
};

  const { valid, errors } = validateLogin(adminDetail);
  if (!valid) {
    return res.status(400).json(errors);
  }
  var token;
  // db.collection("admin")
  //   .where("email", "==", req.body.email)
  //   .limit(1)
  //   .get()
  //   .then((data) => {
  //     if (Object.keys(data).length === 0) {
  //       return res.status(400).json({ error: "No admin found!" });
  //     } else {
  //       return firebase
          firebase.auth()
          .signInWithEmailAndPassword(adminDetail.email, adminDetail.password)
      
    // })
    .then((data) => {
      token = data.user.getIdToken();
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

exports.adminGetAgents = (req, res) => {
  let adminId = req.user.adminId;
  let agents;
  db.collection("admin")
    .doc(`${adminId}`)
    .get()
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      agents = data.agents;
      return agents;
    })
    .then((agents) => {
      return res.status(200).json({ agentList: agents });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.adminGetAgentDetails = (req, res) => {
  let agentId = req.params.agentId;
  db.collection("admin")
    .doc(`${req.user.adminId}`)
    .get()
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      return data.agents;
    })
    .then((agentArr) => {
      if (!agentArr.includes(`${agentId}`)) {
        return res
          .status(404)
          .json({
            message: `Agent with id ${agentId} is not registered under you!`,
          });
      }
      return db.collection("agents").doc(`${agentId}`).get();
    })
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      return res.status(200).json({ agentDetails: data });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.adminGetCustomerDetails = (req, res) => {
  let customerId = req.params.customerId;
  let agentId = req.params.agentId;

  db.collection("admin")
    .doc(`${req.user.adminId}`)
    .get()
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      return data.agents;
    })
    .then((agentArr) => {
      if (!agentArr.includes(`${agentId}`)) {
        return res
          .status(404)
          .json({
            message: `Agent with id ${agentId} is not registered under you!`,
          });
      }
      return db.collection("agents").doc(`${agentId}`).get();
    })
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
      if (flag === 0) {
        return res
          .status(404)
          .json({
            message: `Customer with id: ${customerId} has not been registered under agent with id: ${agentId}`,
          });
      }
      return db.collection("customers").doc(`${customerId}`).get();
    })
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      return res.status(200).json({ customerDetails: data });
    })
    .catch((err) => {
      console.error({ err });
      return res.status(500).json({ error: err.code });
    });
};

exports.adminGetLoanDetails = (req, res) => {
  let loanId = req.params.loanId;
  let agentId = req.params.agentId;
  let customerId = req.params.customerId;

  db.collection("admin")
    .doc(`${req.user.adminId}`)
    .get()
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      return data.agents;
    })
    .then((agentArr) => {
      if (!agentArr.includes(`${agentId}`)) {
        return res
          .status(404)
          .json({
            message: `Agent with id ${agentId} is not registered under you!`,
          });
      }
      return db.collection("agents").doc(`${agentId}`).get();
    })
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
      if (flag === 0) {
        return res
          .status(404)
          .json({
            message: `Customer with id ${customerId} has not been registered under ${agentId}`,
          });
      }
      return db.collection("customers").doc(`${customerId}`).get();
    })
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      return data.loanDetails;
    })
    .then((loanArr) => {
      if (!loanArr.includes(`${loanId}`)) {
        return res.status(404).json({ message: "No loan found!" });
      }
      return db.collection("loans").doc(`${loanId}`).get();
    })
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      const loan = data;
      loan.registrationDate = loan.registrationDate.toDate();
      loan.lastUpdate = loan.lastUpdate.toDate();
      return res.status(200).json({ loanDetails: loan });
    })
    .catch((err) => {
      console.error({ err });
      return res.status(500).json({ error: err.code });
    });
};

exports.adminUpdateLoanStatus = (req, res) => {
  let loanId = req.params.loanId;
  let agentId = req.params.agentId;
  let customerId = req.params.customerId;
  let loanHistory;
  if(isEmpty(req.body.loanStatus)){
    return res.status(403).json({error: "loanStatus can't be empty!"});
  }
  const loanStatusObj = {
    loanStatus: req.body.loanStatus,
    lastUpdate: new Date(),
  };

  db.collection("admin")
    .doc(`${req.user.adminId}`)
    .get()
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      return data.agents;
    })
    .then((agentArr) => {
      if (!agentArr.includes(`${agentId}`)) {
        return res
          .status(404)
          .json({
            message: `Agent with id ${agentId} is not registered under you!`,
          });
      }
      return db.collection("agents").doc(`${agentId}`).get();
    })
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
      if (flag === 0) {
        return res
          .status(404)
          .json({
            message: `Customer with id: ${customerId} has not been registered under agent with id: ${agentId}`,
          });
      }
      return db.collection("customers").doc(`${customerId}`).get();
    })
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      return data.loanDetails;
    })
    .then((loanArr) => {
      if (!loanArr.includes(`${loanId}`)) {
        return res.status(404).json({ message: "No loan found!" });
      }
      return db.collection("loans").doc(`${loanId}`).get();
    })
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      loanHistory = data;
      return data;
    })
    .then((data) => {
      if (data.loanStatus !== "new") {
        return res.status(406).json({
          message: `Loan has already been ${data.loanStatus}`,
        });
      }
      return db.collection("loans").doc(`${loanId}`).update(loanStatusObj);
    })
    .then(() => {
      loanHistory.lastUpdate = new Date();
      return db
        .collection("loans")
        .doc(`${loanId}`)
        .collection("history")
        .doc(`${loanId}`)
        .update(loanHistory);
    })
    .then(() => {
      return db.collection("loans").doc(`${loanId}`).get();
    })
    .then((doc) => {
      return doc.data();
    })
    .then((data) => {
      data.registrationDate = data.registrationDate.toDate();
      data.lastUpdate = data.lastUpdate.toDate();

      return res.status(200).json({
        message: `Loan with id: ${loanId} has been successfully updated on ${loanStatusObj.lastUpdate}`,
        loanDetails: data,
      });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.adminGetAllLoans = (req, res) => {
  const arr = [];
  let ref = db.collection("loans");
  if (req.query.hasOwnProperty("tenure")) {
    ref = ref.orderBy("tenure", `${req.query.tenure}`);
  }

  if (req.query.hasOwnProperty("loanAmount")) {
    ref = ref.orderBy("loanAmount", `${req.query.loanAmount}`);
  }
  if (req.query.hasOwnProperty("registrationDate")) {
    ref = ref.orderBy("registrationDate", `${req.query.registrationDate}`);
  }
  ref
    .get()
    .then((doc) => {
      return doc.docs;
    })
    .then((datas) => {
      datas.map((data) => {
        const rawData = data.data();
        rawData.registrationDate = rawData.registrationDate.toDate();
        rawData.lastUpdate = rawData.lastUpdate.toDate();
        arr.push(rawData);
      });
      if (Object.keys(req.query).length === 0) {
        return res.status(200).json({ "Loan Details": arr });
      }
      // return res.status(200).json({"Loan Details": arr,"queries" : req.query.loanStatus});
      return arr;
    })
    .then((arr) => {
      if (req.query.hasOwnProperty("loanStatus")) {
        const ans = [];
        arr.map((an) => {
          if (an.loanStatus === req.query.loanStatus) {
            ans.push(an);
          }
        });
        return ans;
      } else {
        return arr;
      }
    })
    .then((arr) => {
      if (req.query.hasOwnProperty("loanType")) {
        const newAns = [];
        arr.map((an) => {
          if (an.loanType === req.query.loanType) {
            newAns.push(an);
          }
        });
        return newAns;
      } else {
        return arr;
      }
    })
    .then((newArr) => {
      //    const ansArray =  newArr.sort(compareValues('tenure'));
      return res.status(200).json({ "Loan Details": newArr });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.adminLogout = (req, res) => {
  firebase
    .auth()
    .signOut()
    .then(() => {
      return res
        .status(200)
        .json({ message: "You have successfully signed out!" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
