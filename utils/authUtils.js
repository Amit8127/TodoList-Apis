const validator = require("validator");

const userDataValidation = ({ name, email, username, password }) => {
  return new Promise((resolve, reject) => {
    if (!name || !username || !email || !password)
      reject("Missing credentials");

    if (typeof name !== "string") reject("Name is not a string");
    if (typeof username !== "string") reject("Username is not a string");
    if (typeof email !== "string") reject("Email is not a string");
    if (typeof password !== "string") reject("Password is not a string");

    if (username.length <= 2 || username.length > 20)
      reject("Username length should be 3-20");

    if (password.length <= 2 || password.length > 20)
      reject("Password length should be 3-20");

    // if (!validator.isAlphanumeric(password))
    //   reject("Password should contains a-z, A-Z and 0-9");
    if (!validator.isEmail(email)) reject("Email format is incorrect");

    resolve("Your account has been created successfully");
  });
};

const userLoginDataValidation = ({ loginId, password }) => {
  return new Promise((resolve, reject) => {
    if (!loginId || !password) reject("Missing credentials");

    if (typeof loginId !== "string")
      reject("Username or Email is not a string");
    if (typeof password !== "string") reject("Password is not a string");

    resolve("You have successfully logged in");
  });
};

module.exports = { userDataValidation, userLoginDataValidation };
