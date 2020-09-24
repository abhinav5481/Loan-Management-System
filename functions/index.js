const functions = require("firebase-functions");
const { db, admin } = require("./utils/admin");
const {
    signupAgent,
    loginAgent,
    loanRequest,
    agentGetCustomers,
    agentGetCustomerDetails,
    agentGetLoanDetails,
    agentEditLoanDetails,
    agentDeleteLoan,
      agentGetAllLoans,
      agentRollbackLoan,
      listAllAdmins,
      agentLogout
} = require("./users/agent");

const {
    loginAdmin,
    adminGetAgents,
    adminGetAgentDetails,
    adminGetCustomerDetails,
    adminGetLoanDetails,
    adminUpdateLoanStatus,
    adminGetAllLoans,
    adminLogout
    
} = require("./users/admin");
const {
    signupCustomer,
    loginCustomer,
    customerViewLoanList,
    customerViewLoanDetails,
    customerGetAllLoans,
    listAllAgent,
    uploadDoc,
    customerLogout
} = require("./users/customer");
const FbAuthAgent = require("./utils/FbAuthAgent");
const FbAuthAdmin = require("./utils/FbAuthAdmin");
const FbAuthCustomer = require("./utils/FbAuthCustomer");
const express = require("express");
const app = express();

const cors = require('cors');
app.use(cors());


//*****************************Admin Work***************************************************************************** */
//**************login admin */
app.post("/admin/login", loginAdmin);

//*************get agent list */
app.get("/admin/getAgents", FbAuthAdmin, adminGetAgents);

//**********************get agent details ***********/
app.get("/admin/getAgents/:agentId", FbAuthAdmin, adminGetAgentDetails);

//**********************get customer details *******/
app.get("/admin/getAgents/:agentId/:customerId",FbAuthAdmin,adminGetCustomerDetails);

//**********************get customer loan details *********************/
app.get("/admin/getAgents/:agentId/:customerId/:loanId",FbAuthAdmin,adminGetLoanDetails);

//**********************approve or reject loan *************************/
app.post("/admin/getAgents/:agentId/:customerId/:loanId",FbAuthAdmin,adminUpdateLoanStatus);

//***********Filter & sort loans*************** */
app.get("/admin/getAllLoans",FbAuthAdmin, adminGetAllLoans)

//*************Admin Logout***************** */
app.get("/admin/logout", FbAuthAdmin, adminLogout)





//****************************agent work*****************************************************************************

//get the list of Admins
app.get("/agent/adminList",listAllAdmins)

//agent Singup
app.post("/agent/signup", signupAgent);

//agent login
app.post("/agent/login", loginAgent);

//getCustomerList
app.get("/agent/getCustomers", FbAuthAgent, agentGetCustomers);

//get details of customer
app.get("/agent/getCustomers/:customerId",FbAuthAgent,agentGetCustomerDetails);

//loanRequest
app.post("/agent/getCustomers/:customerId/loanRequest",FbAuthAgent,loanRequest);

//get loan details
app.get("/agent/getCustomers/:customerId/:loanId",FbAuthAgent,agentGetLoanDetails);

//edit loan details
app.post("/agent/getCustomers/:customerId/:loanId",FbAuthAgent,agentEditLoanDetails);


//Roll back last loan update
app.get("/agent/getCustomers/:customerId/:loanId/rollback",FbAuthAgent,agentRollbackLoan)

//delete loan (by agent)
app.delete("/agent/getCustomers/:customerId/:loanId",FbAuthAgent,agentDeleteLoan);

//filter and get loan details
app.get("/agent/getAllLoans", FbAuthAgent, agentGetAllLoans);

app.get("/agent/logout", FbAuthAgent, agentLogout)





//*****************************Customer Work********************** ******************************/

//get list of agents
app.get("/customer/agentList", listAllAgent);

//customer signup
app.post("/customer/signup", signupCustomer);

//customer login
app.post("/customer/login", loginCustomer);

//file upload
app.post("/customer/upload",FbAuthCustomer, uploadDoc);

//customer view loan list
app.get("/customer/activeLoans", FbAuthCustomer, customerViewLoanList);

//customer view loan details
app.get("/customer/activeLoans/:loanId",FbAuthCustomer,customerViewLoanDetails);


//get all loans customer
app.get("/customer/getAllLoans", FbAuthCustomer, customerGetAllLoans);


app.get("/customer/logout", FbAuthCustomer, customerLogout);




exports.api = functions.https.onRequest(app);

//Triggers
exports.onLoanDelete = functions.firestore
    .document("/loans/{loanId}")
    .onDelete((snapshot, context) => {
        const deletedDoc = snapshot.data();
        db.collection("customers")
            .doc(`${deletedDoc.customerId}`)
            .update({
                loanDetails: admin.firestore.FieldValue.arrayRemove(
                    `${deletedDoc.loanId}`
                ),
            })
            .then(() => {
                db.collection("agents")
                    .doc(`${deletedDoc.agentId}`)
                    .update({
                        loanDetails: admin.firestore.FieldValue.arrayRemove(
                            `${deletedDoc.loanId}`
                        ),
                    });
                return;
            })
            .catch((err) => {
                console.error(err);
            });
    });
