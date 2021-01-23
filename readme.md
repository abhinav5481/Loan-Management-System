## Loan Management System
+ Firebase function deployed base URL : https://us-central1-loan-management-redcarpet.cloudfunctions.net/api/
+ API documentaion link: https://documenter.getpostman.com/view/12152994/TVKEXcRU
+ Database used - **Firebase Firestore**
+ Framework - **Express.js**
+ Features:
    + **List & view** details of customers (only by agents & admins).
    + **Create a loan** request by the agent on behalf of its customer.
    + **Approval/Rejection** of loan request (only by admin roles).
    + **Edit a loan** if it's not been approved (only by agents). The database is designed to **have double safety**, the edited loan can be rolled back to its previous value.
    + **Rollback loan details** to its previous value (**double safety enabled**).
    + **List & view loans based on applied filters**. The response can be filtered & sorted by *loanStatus*, *loanType*, *registrationDate*, *tenure*, *loanAmount*.
    + **Customer can upload a required document in *pdf* or *doc* format** which can later be used to verify the customer credentials by agents or admins.
    + **Email verification after signup** (for agents & customers)
    + **Delete loan-request** only if it's not approved. (By agent)
---

### Database structure
The database has 4 collections namely *admin*, *agents*, *customers* & *loans*. 

 + admin
    + name : {type: String}
    + email : {type: String}
    + agents : {type: Array}
    + adminId : {type: String}
 + agents
    + name: {type: String}
    + email: {type: String}
    + phone: {type: Number}
    + age: {type: Number},
    + address: {type: String}
    + adminId: {type: String}
    + agentId: {type: String}
    + customers: {type: Array}
    + loanDetails: {type: Array}
 + customers
    + name: {type: String}
    + email: {type: String}
    + phone: {type: String}
    + age: {type: String}
    + address: {type: String}
    + city: {type: String}
    + country: {type: String}
    + state: {type: String}
    + phone: {type: Number}
    + agentId: {type: String}
    + customerId: {type: String}
    + grossMonthlyIncome: {type: Number}
    + loanDetails: {type: Array}
    + registrationDate: {type: Date}
    + occupation: {type: String}
    + DocURL: {type: String}
 + loans
    + **HISTORY (SUBCOLLECTION)**
    + agentId: {type: String}
    + customerId: {type: String}
    + loanId: {type: String}
    + loanAmount: {type: Number}
    + loanType: {type: String}
    + rate: {type: String}
    + loanStatus: {type: String}
    + tenure: {type: Number}
    + registrationDate: {type: Date}
    + lastUpdate: {type: Date}
---
### Working
 #### Admin
  + Admin will have the reference to each agent registered under them. Through this reference, admin can access agent details, customer details and loan details of customers.
  + Only admin can *approve* or *reject* loans.

 #### Agents  
  + Every agent has to register themselves under an admin (Agent signup API will take admin ID as param).
  + An agent must use business email id (For testing purpose agent must register themselves by an email id other than the ones having domain name *gmail.com*, *yahoo.com*, *hotmail.com*, *msn.com* & *outlook.com*, later on, we can allow agents to register themselves from a specific domain ). 
  + Each registered agent will have the reference to loans applied by him on behalf of his customer, also agents will have the reference to the customers under them. Agents have **access limited to their customers &  loans** (to ensure privacy between all agents & their customers). This means that an agent will not be able to access other agents' customer details or loan details.
  + Agents have the ability to edit loans request initiated by them only if it has not been approved by admin, also agents have the freedom to **rollback loan-details**.
  + Agents can filter, sort & view loan details.
 #### Customers
  + Every customer has to register themselves under an agent (Customer signup API will take agent ID as param).
  + A customer can register itself using an email and password. The email account must be verified before login.
  + A customer will have the reference to loan IDs registered under them which can be used to access loan details and check its status.
  + A customer can upload relevent document in *.pdf* & *.docs* format which can be used for verification.
  + A customer can filter, sort & view details of the loan under its id.
 #### Loans
  + Every loan object will have a subcollection named **history** to store the previous values just before update, this ensures **double-safety** of loans.
  + As soon a new loan is requested it will get updated in the respective customer collection and loan status of "new" will be assigned to this loan object.
  + *registrationDate* will be the date on which loan request is initiated & *lastUpdate* will be the date on which it's being approved by admin else updated by its agent. Admin will be the last person to update loan status.
  + *tenure* will be in months 






