
const { db, admin } = require("./admin");
const isEmpty = (string) => {
    if (string.trim() === "") {
      return true;
    } else return false;
  };
  
  const isEmailValid = (email) => {
    const regEx = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
    if (email.match(regEx)) return true;
    else return false;
  };
  
  exports.validateSignup = (data) => {
      let errors = {};
      if(isEmpty(data.name)){
          errors.name = "Must not be empty";
      }
      if(isEmpty(data.email)){
          errors.email = "Must not be empty";
      }
      else if(!isEmailValid(data.email)){
          errors.email = "Must be a valid email address";
      }
      if(isEmpty(data.password)){
          errors.password = "Must not be empty";
      }
      else if(data.password !== data.confirmPassword){
        errors.confirmPassword = "Password must match";
    }
     
     return {errors, valid: Object.keys(errors).length === 0 ? true : false};
    
  }

  exports.validateLogin = (data) => {
    let errors = {};
    if (isEmpty(data.email)) {
      errors.email = "Must not be empty";
    }
    if (isEmpty(data.password)) {
      errors.password = "Must not be empty";
    }
    //   if (Object.keys(errors).length > 0) return res.status(400).json(errors);
    return {
      errors,
      valid: Object.keys(errors).length === 0 ? true : false,
    };
  }

  exports.reduceBody = (data) => {
      let loanDetails = {};
    //   if(!isEmpty(data.customerId)) loanDetails.customerId = data.customerId;
      if(!isEmpty(data.loanAmount.toString(10))) loanDetails.loanAmount = data.loanAmount;
      if(!isEmpty(data.rate)) loanDetails.rate = data.rate;
      if(!isEmpty(data.tenure.toString(10))) loanDetails.tenure = data.tenure;
      if(!isEmpty(data.loanType)) loanDetails.loanType = data.loanType;
      loanDetails.lastUpdate = new Date();
      return loanDetails;
  }


  exports.validateSignupAgent = (data) => {
    let errors = {};
    if(isEmpty(data.name)){
        errors.name = "Must not be empty";
    }
    if(isEmpty(data.email)){
        errors.email = "Must not be empty";
    }
    else if(!isEmailValid(data.email)){
        errors.email = "Must be a valid email address";
    }
    if(isEmpty(data.password)){
        errors.password = "Must not be empty";
    }
    else if(data.password !== data.confirmPassword){
      errors.confirmPassword = "Password must match";
  }
  if(isEmpty(data.age.toString(10))){
    errors.age = "Must not be empty";
}
if(isEmpty(data.phone.toString(10))){
    errors.phone = "Must not be empty";
}
if(isEmpty(data.address)){
    errors.address = "Must not be empty";
}
   
   return {errors, valid: Object.keys(errors).length === 0 ? true : false};
  }
