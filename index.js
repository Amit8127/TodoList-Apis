const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const clc = require("cli-color");
const bcrypt = require("bcrypt");
const validator = require("validator");
const session = require("express-session");
const mongoDbsession = require("connect-mongodb-session")(session);
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");

// File Imports
const {
  userDataValidation,
  userLoginDataValidation,
} = require("./utils/authUtils");
const userModel = require("./models/userModel");
const { isAuth } = require("./middlewares/authMiddleware");
const todoModel = require("./models/todoModel");
const { todoValidation } = require("./utils/todoUtils");

// Constants
const app = express();
const PORT = process.env.PORT;
const store = new mongoDbsession({
  uri: process.env.MONGO_URI,
  collection: "sessions",
});

// Middleware
app.set("view engine", "ejs");
app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      sameSite: "None", // "none" for cross-origin requests
      secure: true, // Set to true if using HTTPS
    },
  })
);
app.use(
  cors({
    // origin: "http://localhost:5173",
    origin: "https://amittodoapp.netlify.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// DB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Mongoose connectd");
  })
  .catch((error) => {
    console.log("Error : ", error);
  });

// APIs
app.get("/", (req, res) => {
  return res.send("TODO Server in running");
});

app.post("/register", async (req, res) => {
  const { name, email, username, password } = req.body;

  //data validation
  try {
    await userDataValidation({ name, password, email, username });
  } catch (error) {
    return res.send({
      status: 400,
      message: "user data error",
      error: error,
    });
  }

  //check if email and username already exist or not
  const userEmailExists = await userModel.findOne({ email });
  if (userEmailExists) {
    return res.send({
      status: 400,
      message: "Email already Exist",
    });
  }

  const userNameExists = await userModel.findOne({ username });
  if (userNameExists) {
    return res.send({
      status: 400,
      message: "Username already Exist",
    });
  }

  // Hashed password
  const hashedPassword = await bcrypt.hash(
    password,
    parseInt(process.env.SALT)
  );

  // creating user object for saveing in DB
  const userObj = new userModel({
    name: name,
    email: email,
    username: username,
    password: hashedPassword,
  });

  //store the data in Db
  try {
    const userDb = await userObj.save();
    // return res.redirect("/login");
    return res.send({
      status: 201,
      message: "User Created Successfully",
      data: userDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

app.post("/login", async (req, res) => {
  // Create new utils and check all thinks
  const { loginId, password } = req.body;
  console.log("/login WORKING ");
  console.log(loginId, password);

  //data validation
  try {
    await userLoginDataValidation({ loginId, password });
  } catch (error) {
    return res.send({
      status: 400,
      message: "Login data error",
      error: error,
    });
  }

  //find the user from DB with loginId
  try {
    let userDb;
    if (validator.isEmail(loginId)) {
      userDb = await userModel.findOne({ email: loginId });
    } else {
      userDb = await userModel.findOne({ username: loginId });
    }

    if (!userDb) {
      return res.send({
        status: 400,
        message: "User not found, please try again",
      });
    }

    // compare the password
    const isPasswordValid = await bcrypt.compare(password, userDb.password);
    if (!isPasswordValid) {
      return res.send({
        status: 400,
        message: "Password in not Valid",
      });
    }

    // Session base Authentication
    req.session.isAuth = true;
    req.session.user = {
      userId: userDb._id,
      email: userDb.email,
      username: userDb.username,
    };
    // Session base Authentication with an expiration time of 24 hour (1440 minutes)
    req.session.cookie.expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hour in milliseconds
    req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hour in milliseconds

    console.log(req.session);
    // return res.redirect("/dashboard");

    return res.send({
      status: 200,
      message: "You have successfully logged in",
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

app.post("/logout", isAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send({
        status: 500,
        message: "Logout unsuccessfull",
        error: err,
      });
    } else {
      return res.send({
        status: 200,
        message: "Logout successfull",
      });
    }
  });
});

app.post("/logout_from_all_devices", isAuth, async (req, res) => {
  const userEmail = req.session.user.email;

  //session Schema
  const sessionSchema = new mongoose.Schema({ _id: String }, { strict: false });
  const sessionModel = mongoose.model("session", sessionSchema);

  try {
    const deleteDb = await sessionModel.deleteMany({
      "session.user.email": userEmail,
    });
    // return res.status(200).redirect("/login");
    return res.send({
      status: 200,
      message: "Logout successfull",
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

//TODO API's
app.post("/create-item", isAuth, async (req, res) => {
  //todoText, username
  const todoText = req.body.todoText;
  const username = req.session.user.username;

  //data validation
  try {
    await todoValidation({ todoText });
  } catch (error) {
    return res.send({
      status: 400,
      message: "Todo data error",
      error: error,
    });
  }

  const todoObj = new todoModel({
    todo: todoText,
    username: username,
  });

  try {
    const todoDb = await todoObj.save();
    return res.send({
      status: 201,
      message: "Todo created successfully",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

app.get("/read-item", isAuth, async (req, res) => {
  console.log("/read-item WORKING");
  const username = req.session.user.username;
  try {
    const todos = await todoModel.find({ username });
    return res.send({
      status: 200,
      message: "Read success",
      data: todos,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

app.post("/edit-item", isAuth, async (req, res) => {
  //id, todo, username
  const { id, newData } = req.body;
  const username = req.session.user.username;

  //data validation
  try {
    await todoValidation({ todoText: newData });
  } catch (error) {
    return res.send({
      status: 400,
      message: "Todo data error",
      error: error,
    });
  }

  //find the todo
  try {
    const todoDb = await todoModel.findOne({ _id: id });

    if (!todoDb) {
      return res.send({
        status: 404,
        message: "Todo not found",
      });
    }
    //check the ownership
    if (username !== todoDb.username) {
      return res.send({
        status: 403,
        message: "Not authorized to edit the todo.",
      });
    }
    const prevTodo = await todoModel.findOneAndUpdate(
      { _id: id },
      { todo: newData }
    );

    return res.send({
      status: 200,
      message: "Todo edited successfully",
      data: prevTodo,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

app.delete("/delete-item/:id", isAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.session.user;

    if (!id) {
      return res.send({
        status: 400,
        message: "Missing todo id",
      });
    }

    const todoDb = await todoModel.findOne({ _id: id });

    if (!todoDb) {
      return res.send({
        status: 404,
        message: `Todo not found with id: ${id}`,
      });
    }

    if (todoDb.username !== username) {
      return res.send({
        status: 403,
        message: "Not allowed to delete, authorization failed",
      });
    }

    const deletedTodo = await todoModel.findOneAndDelete({ _id: id });

    return res.send({
      status: 200,
      message: "Todo deleted successfully",
      data: deletedTodo,
    });
  } catch (error) {
    console.error("Error deleting todo:", error);
    return res.send({
      status: 500,
      message: "Unable to delete todo",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`TODO Server in running on port: ${PORT}`);
});
