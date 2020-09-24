const { db, admin } = require("../utils/admin");
const config = require("../utils/config");
const firebase = require("firebase");
// firebase.initializeApp(config);

const { validateSignup, validateLogin } = require("../utils/validators");

const isEmpty = (string) => {
    if (string.trim() === "") {
      return true;
    } else return false;
  };

const validateSignup2 = (data) => {
    let errors2 = {};
    if(isEmpty(data.age.toString(10))){
        errors2.age = "Must not be empty";
    }
    if(isEmpty(data.phone.toString(10))){
        errors2.phone = "Must not be empty";
    }
    if(isEmpty(data.address)){
        errors2.address = "Must not be empty";
    }
    if(isEmpty(data.city)){
        errors2.city = "Must not be empty";
    }
    if(isEmpty(data.state)){
        errors2.state = "Must not be empty";
    }
    if(isEmpty(data.country)){
        errors2.country = "Must not be empty";
    }
    if(isEmpty(data.occupation)){
        errors2.occupation = "Must not be empty";
    }
    if(isEmpty(data.grossMonthlyIncome.toString(10))){
        errors2.grossMonthlyIncome = "Must not be empty";
    }
   
   return {errors2, valid2: Object.keys(errors2).length === 0 ? true : false};
  
}

exports.signupCustomer = (req, res) => {
  const newCustomer = {
    agentId: req.body.agentId,
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    age: req.body.age,
    phone: req.body.phone,
    address: req.body.address,
    city: req.body.city,
    state: req.body.state,
    country: req.body.country,
    PIN: req.body.pin,
    occupation : req.body.occupation,
    grossMonthlyIncome: req.body.grossMonthlyIncome,
  };

  const { valid, errors } = validateSignup(newCustomer);
  if (!valid) {
    return res.status(400).json(errors);
  }

  const {valid2, errors2 } = validateSignup2(newCustomer);
  if(!valid2){
      return res.status(400).json({errors: errors2});
  }
  let token, customerId, customerCredentials;
  db.doc(`/agents/${newCustomer.agentId}`).get()
     .then((doc) => {
         if(!doc.exists){
            return res.status(404).json({error: "Please enter a valid agentId"});
         }
         else{
            return firebase
            .auth()
            .createUserWithEmailAndPassword(newCustomer.email, newCustomer.password);
         }
     })
     .then((data) => {
        customerId = data.user.uid;
        return data.user.getIdToken();
      })
      .then((idToken) => {
        token = idToken;
  
        customerCredentials = {
          name: newCustomer.name,
          email: newCustomer.email,
          phone: newCustomer.phone,
          agentId: newCustomer.agentId,
          loanDetails: [],
          customerId: customerId,
          age: newCustomer.age,
          address: newCustomer.address,
          city: newCustomer.city,
          state: newCustomer.state,
          country: newCustomer.country,
          PIN: newCustomer.PIN,
          occupation : newCustomer.occupation,
          grossMonthlyIncome: newCustomer.grossMonthlyIncome,
          registrationDate: new Date().toDateString()
        };
        return db.collection("customers").add(customerCredentials);
      })
      .then((doc) => {
        customerId = doc.id;
        return db.collection("customers").doc(customerId).update({ customerId: customerId });
      })
      .then((doc) => {
          var custForAgent = {
              name: customerCredentials.name,
            //   email: customerCredentials.email,
            //   agentId: customerCredentials.agentId,
            //   loanDetails: [],
              customerId: customerId
          }
        return db
          .collection("agents")
          .doc(`${newCustomer.agentId}`)
          .update({
            customers: admin.firestore.FieldValue.arrayUnion(custForAgent)
          });
      })
      .then(() => {
          var user = firebase.auth().currentUser;
         return user.sendEmailVerification();
      })
      .then(function() {
        return res.status(201).json({ token: token, Verification: `An email verification link has been sent to your email address ${newCustomer.email}, Please verify your email before login.` });
    })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
};


exports.loginCustomer = (req,res) => {
    const customer = {
        email: req.body.email,
        password: req.body.password,
      };
      const { valid, errors } = validateLogin(customer);
      if (!valid) {
        return res.status(400).json(errors);
      }
      var token; 
      db.collection("customers").where("email" ,"==" ,req.body.email).limit(1)
      .get()
      .then((data) => {
        if(data.docs[0].data() === null){
            return res.status(400).json({error: "No customer found!"})
        }
        else{
            return firebase
            .auth()
            .signInWithEmailAndPassword(customer.email, customer.password)
        }
      })     
        .then((data) => {
          token =  data.user.getIdToken();
          return token;
        })
        .then((token) => {
            var FbUser = firebase.auth().currentUser;
            var verficationStatus = FbUser.emailVerified;
            return verficationStatus;
        })
        .then((verified) => {
            if(!verified){
                return res.status(401).json({error: "Please verify your email!"});
            }
            return token;
        })
        .then((token) => {
          return res.status(200).json({ token });
        })
        .catch((err) => {
          console.error(err);
          if ((err.code === "auth/wrong-password")) {
            return res
              .status(403)
              .json({ general: "Wrong credential, please try again" });
          }
          return res.status(500).json({ error: err.code });
        });
}

exports.customerViewLoanList = (req,res) => {
    db.collection("customers").doc(`${req.user.customerId}`).get()
    .then((doc) => {
        return doc.data();
    })
    .then((data) => {
        return res.status(200).json({"Active loans": data.loanDetails})
    })
    .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    })
}

exports.customerViewLoanDetails = (req,res) => {
    const loanId = req.params.loanId;

    db.collection("customers").doc(`${req.user.customerId}`).get()
    .then((doc) => {
        return doc.data();
    })
    .then((data) => {
        return data.loanDetails
    })
    .then((loanArr) => {
        if(!(loanArr.includes(loanId))){
            return res.status(404).json({message: "No loan found!"})
        }
        return db.collection("loans").doc(`${loanId}`).get()
    })
    .then((doc) =>{
        return doc.data();
    })
    .then((data) => {
        const loanData = data;
        loanData.registrationDate = loanData.registrationDate.toDate();
        loanData.lastUpdate = loanData.lastUpdate.toDate();
        return res.status(200).json({"Loan Details": loanData})
    })
    .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    })
}

exports.customerGetAllLoans = (req,res) => {
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
           if(an.customerId === `${req.user.customerId}`){
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
           if(an.customerId === `${req.user.customerId}`){
               ansArr.push(an);
           }
       })

        return res.status(200).json({"Loan Details": ansArr})
    })
    .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    })
}

exports.listAllAgent = (req,res) => {
    let arr = [];
    db.collection("agents").get()
    .then((doc) => {
        return doc.docs;
    })
    .then((doc) =>{
        doc.map((d) => {
            arr.push(d.data().agentId);
        })
       return res.status(200).json({agentList: arr});
    })
    .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    })
}

exports.uploadDoc = (req,res) =>{
const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let docToBeUpload = {};
  let docFileName;
 

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname, file, filename, encoding, mimetype);
    if (mimetype !== "application/pdf" && mimetype !== "application/msword") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }
   
    const docExtension = filename.split(".")[filename.split(".").length - 1];
    
    docFileName = `${req.user.customerId}.${docExtension}`;
    const filepath = path.join(os.tmpdir(), docFileName);
    docToBeUpload = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(docToBeUpload.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: docToBeUpload.mimetype
          }
        }
      })
      .then(() => {
        // Append token to url
        const docUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${docFileName}?alt=media`;
        return db.doc(`/customers/${req.user.customerId}`).update({ docUrl });
      })
      .then(() => {
        return res.json({ message: "document uploaded successfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  });
  busboy.end(req.rawBody);

}


exports.customerLogout = (req,res) => {
  firebase.auth().signOut()
  .then(() => {
    return res.status(200).json({message: "You have successfully signed out!"})
  })
  .catch((err) => {
    console.error(err);
    res.status(500).json({ error: err.code });
  })
}