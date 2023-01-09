const express = require("express");
const app = express();
var csrf = require("csurf");
const { admin,election,voter,question,option } = require("./models");
const bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
const path = require("path");
const passport = require("passport");
const connectEnsurelogin = require("connect-ensure-login");
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
        const electionList = await election.getElections();
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
        const newElection = await election.newElection({
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
  
module.exports = app;
