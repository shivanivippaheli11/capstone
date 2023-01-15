const express = require("express");
const app = express();
var csrf = require("csurf");
const { admin,election,voter,question,option } = require("./models");
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const path = require("path");
const passport = require("passport");
const session = require("express-session");
const flash = require("connect-flash");
const localStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const saltRounds = 10;
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("hi hello"));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(flash());
app.use(csrf({ cookie: true }))
const { op } = require("sequelize");

app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "my-super-secret-key-447575886",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});
app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new localStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      admin.findOne({ where: { email: username } })
        .then(async function (user) {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch((error) => {
          console.log(error);
          return done(null, false, { message: "Invalid email" });
        });
    }
  )
);
passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  admin.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});
function electionIsNotRunning() {
  return async function (req, res, next) {
    const elections = await election.findByPk(req.params.id);
    if (elections.onGoingStatus === false) {
      next();
    } else {
      req.flash("error", "Election is running and cannot modify questions or answers");
      res.redirect(`/elections/${req.params.id}`);
    }
  };
}

app.get("/signup", (request, response) => {
    response.render("signup", {
      title: "Signup",
      csrfToken: request.csrfToken(),
    });
  });
  app.post("/users", async (request, response) => {
    const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  
    try {
      const user = await admin.create({
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        email: request.body.email,
        password: hashedPwd,
      });
      request.login(user, (err) => {
        if (err) {
          console.log(err);
        }
        response.redirect("/elections");
      });
    } catch (error) {
  
      console.log(error);
      response.redirect("/signup");
    }
  });

  app.get("/", async function (request, response) {
    response.render("index", { title: "My voting app" });
  });
  app.use(express.static(path.join(__dirname, "public")));
  app.post(
    "/session",
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    (request, response) => {
      response.redirect("/elections");
    }
  );

  app.get("/login", (request, response) => {
    if (request.user && request.user.isAdmin) {
      response.redirect("/elections");
    } else {
      response.render("login", {
        title: "Login",
        csrfToken: request.csrfToken(),
      });
    }
  });

app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});
app.get(
    "/elections",
    async (request, response) => {
      try {
        const electionList = await election.getElection();
        if (request.accepts("html")) {
          // console.log({ electionList });
          // response.json(electionList);
          response.render("elections", {
            title: "Elections",
            data: electionList,
            csrfToken: request.csrfToken(),
          });
        } else {
          response.json({ electionList });
        }
      } catch (error) {
        console.log(error);
      }
    }
  );
  app.post(
    "/elections",
    async (request, response) => {
      try {
        const newElection= await election.newElection({
          name: request.body.name,
        });
        return response.redirect(`/elections`);
      } catch (error) {
        console.log(error);
      }
    }
  );


  app.get(
    "/elections/:id",
    async (request, response) => {
      try {
        const { electionname, electionstatus } = await election.findByPk(
          request.params.id
        );
        const quesCount = await question.count({
          where: {
            electionid: request.params.id,
          },
        });
        const voterCount = await voter.count({
          where: {
            electionid: request.params.id,
          },
        });
  
        response.render("manageElection", {
          title: electionname,
          quesCount,
          voterCount,
          electionName: electionname,
          onGoingStatus:electionstatus,
          id: request.params.id,
          csrfToken: request.csrfToken(),
        });
      } catch (error) {
        console.log(error);
      }
    })
    app.get(
      "/elections/:id/questions",
            async (request, response) => {
        const allQuestions = await question.getAllQuestions(request.params.id);
        console.log(allQuestions);
        const currentElection = await election.findByPk(request.params.id);
        response.render("questions", {
          title: "electionQuestions",
          currentElection,
          allQuestions,
          id: request.params.id,
          csrfToken: request.csrfToken(),
        });
      }
    );
  
    app.post(
      "/elections/:id/questions/new",
      async (request, response) => {
        try {
          const questions = await question.newQuestion({
            name: request.body.name,
            description: request.body.description,
            electionid: request.params.id,
          });
          console.log(questions);
          if (request.accepts("html")) {
            response.redirect(
              `/elections/${request.params.id}/questions`
            );
          } else {
            response.json(questions);
          }
        } catch (error) {
          console.log(error);
        }
      }
    );

    
    app.put("/elections/:id/questions/:qid", async (request, response) => {
      try {
        const addedQuestion = await question.updateData(
          request.params.questionId,
          request.body.name,
          request.body.description
        );
        const result = await option.resetCount(request.params.questionId);
    
        response.json(addedQuestion);
      } catch (error) {
        console.log(error);
        response.json(error);
      }
    });
    app.get(
      "/elections/:id/questions/:qid",
      async (request, response) => {
        try {
          const currentQuestion = await question.findByPk(request.params.qid);
          const currentElection = await currentQuestion.getElection();

          const options = await option.getoptions(currentQuestion.id);
          const optionCount = await options.length
          response.render("manageQuestion", {
            title: "Manage your Question",
            currentQuestion,
            options: options,
            optionCount,
            currentElection,
            csrfToken: request.csrfToken(),
          });
        } catch (error) {
          console.log(error);
        }
      }
    );
    app.get(
      "/elections/:id/options",
      async (request, response) => {
        const options = await Voter.getoptions(request.params.id);
        const questions = await question.findByPk(request.params.id);
        response.render("options", {
          questions,
          options,
          id: request.params.id,
        });
      }
    );
    
app.post(
  "/elections/:id/questions/:qid/options/new",
  async (request, response) => {
    try {
      const questions = await question.findByPk(request.params.qid);
      const newOptions = await option.addoption({
        optionname: request.body.optionname,
        count: 0,
        questionId: request.params.questionId,
      });
      if (request.accepts("html")) {
        response.redirect(`/elections/${request.params.id}/questions/${request.params.qid}`);
      } else {
        response.json(newOptions);}
    } catch (error) {
      console.log(error);
    }
  }
);
app.put(
  "/elections/:id/questions/:qid/options/:oid",
  async (request, response) => {
    try {
      const addedOption = await option.update(
        { name: request.body.name, count: 0 },
        {
          where: {
            id: request.params.optionid,
          },
        }
      );
      response.json(addedOption);
    } catch (error) {
      console.log(error);
      response.json(error);
    }
  }
);


    
  
module.exports = app;
