const todoValidation = ({ todoText }) => {
  return new Promise((resolve, reject) => {
    if (!todoText) reject("Missing todo text.");
    if (typeof todoText !== "string") reject("Todo is not a text.");
    if (todoText.length < 3 || todoText.length > 200)
      reject("Todo length should be 3-200.");

    resolve("Your account has been created successfully.");
  });
};

module.exports = { todoValidation };
