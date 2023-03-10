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
function isVoterLoggedIn(){
  return function(request,response,next){
    if(request.user && request.user.voterid){
      next()
    }else{
      console.log("abc");
      response.redirect(`/elections/${request.params.id}/voterlogin`)
    }
  }
}
function isAdminLoggedIn(){
  return function(request,response,next){
    console.log(request.user);
    if(request.user && request.user.email){
      next()
    }else{
      response.redirect(`/login`)
    }
  }
}

passport.use("admin-local",
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
passport.use("voter-local",
  new localStrategy(
    {
      usernameField: "voterid",
      passwordField: "password",
      passReqToCallback:true
    },
    (request,username, password, done) => {
      voter.findOne({ where: { voterid: username,electionid:request.params.id } })
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
  let isVoter;
  if(user.voterid){
    isVoter=true
  }else if(user.firstName){
    isVoter = false
  }
  done(null, {_id:user.id,isVoter});
});
passport.deserializeUser((user, done) => {
  if(user.isVoter){
    voter.findByPk(user._id)
      .then((user)=>{
        done(null,user);
      })
      .catch((err)=>{
        done(err,null)
      })
  }else{
  admin.findByPk(user._id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
  }
});
function isElectionRunning() {
  return async function (req, res, next) {
    const elections = await election.findByPk(req.params.id);
    if (elections.electionstatus === true) {
      next();
    } else {
      res.redirect(`/elections/${req.params.id}/results`);
    }
  };
}
function canAccessQuestions() {
  return async function (req, res, next) {
    const elections = await election.findByPk(req.params.id);
    if (elections.electionstatus === false) {
      next();
    } else {
      res.redirect(`/elections/${req.params.id}`);
    }
  };
}

function isEligible() {
  return function (req, res, next) {
    if (req.user.voterstatus === false) {
      next();
    } else {
      res.redirect(`/elections/${req.params.id}/voterlogin`);
    }
}};

app.get("/signup",(request, response) => {
    response.render("signup", {
      title: "Signup",
      csrfToken: request.csrfToken(),
    });
  });
  app.post("/users", async (request, response) => {
    const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  
    try {
      const user = await admin.create({
        fname: request.body.firstName,
        lname: request.body.lastName,
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
    passport.authenticate("admin-local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    (request, response) => {
      response.redirect("/elections");
    }
  );

  app.get("/login",(request, response) => {
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
    "/elections/:id",isAdminLoggedIn(),
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
      canAccessQuestions(),
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
      canAccessQuestions(),
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

    
    app.put("/elections/:id/questions/:qid",
    canAccessQuestions(),
    async (request, response) => {
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
      canAccessQuestions(),
      async (request, response) => {
        try {
          const currentQuestion = await question.findByPk(request.params.qid);
          const currentElection = await election.findByPk(request.params.id);

          const options = await option.getoptions(currentQuestion.id);
          const optionCount = await options.length
          response.render("manageQuestion", {
            title: "Manage your Questions",
            currentQuestion,
            options,
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
      canAccessQuestions(),
      async (request, response) => {
        const options = await question.getoptions(request.params.id);
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
  canAccessQuestions(),
  async (request, response) => {
    try {
      const questions = await question.findByPk(request.params.qid);
      const newOptions = await option.addoption({
        optName: request.body.optName,
        questionId: request.params.qid,
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
  canAccessQuestions(),
  async (request, response) => {
    try {
      const addedOption = await option.update(
        { optName: request.body.optionnName, optCount: 0 },
        {
          where: {
            id: request.params.oid,
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
app.get(
  "/elections/:id/voters",
        async (request, response) => {
    const voters = await voter.getAllVoters(request.params.id);
    const currentElection = await election.findByPk(request.params.id);
    console.log(voters);
    response.render("voters", {
      title: "registeredVoters",
      currentElection,
      voters,
      id: request.params.id,
      csrfToken: request.csrfToken(),
    });
  }
);
app.post(
  "/elections/:id/voters/new",
  async (request, response) => {
    try {
      const hashedPwd = await bcrypt.hash(request.body.password,saltRounds)
      const voters = await voter.newVoter({
        voterid: request.body.voterid,
        password:hashedPwd,
        electionid:request.params.id,

      });
      console.log(voters);
      if (request.accepts("html")) {
        response.redirect(
          `/elections/${request.params.id}/voters`
        );
      } else {
        response.json(voters);
      }
    } catch (error) {
      console.log(error);
    }
  }
);
app.delete("/elections/:id",isAdminLoggedIn(),async(request,response)=>{
  try{
  const electionscount=await election.removeElection(request.params.id);
  response.json(electionscount>0?true:false);
}catch(error){
  console.log(error);
}
}
);
app.delete("/elections/:id/questions/:questionid/options/:optionid",
canAccessQuestions(),
async (request, response) => {
  const deletedResponse=await option.remove(request.params.optionid)
  response.json(deletedResponse)  
})
app.delete("/elections/:id/questions/:questionid",
canAccessQuestions(),
async (request, response) => {
  try{
    const electionQuestions=await question.getAllQuestions(request.params.id);
     if(electionQuestions.length<2){

        console.log("Questions cannot be deleted if the questions length is less than 2")
        response.status(300).json(0);
     }  else{
  const deletedResponse=await question.remove(request.params.questionid)
  response.status(200).json(deletedResponse)  }
}catch(err){
  console.log(err);
}
})

app.get("/elections/:id/preview",async (request,response)=>{
  const currentElection= await election.findByPk(request.params.id)
  const questions = await question.getAllQuestions(currentElection.id)
  for (let i=0;i<questions.length;i++){
    questions[i].options= await option.getoptions(questions[i].id)
  }
  response.render("preview",{
    currentElection,
    data:questions,
  })
})

app.get("/elections/:id/launch", async (request,response)=>{
  let allQuestions2Options = true
  const electionn= await election.findByPk(request.params.id)
  const questions = await question.getAllQuestions(request.params.id)
  for(let i=0;i<questions.length;i++){
    var opts = await option.getoptions(questions[i].id)
    if (opts.length<2){
      allQuestions2Options =  false      
    }
  }
  if(allQuestions2Options){  
    await election.update({electionstatus:true},{
      where:{
        id:request.params.id
      }
    })
  }else{
    request.flash("error","All questions dont have atleast of 2 options")

  }
  response.redirect(`/elections/${request.params.id}`)
})
app.put("/elections/:id/end", async (request,response)=>{
  const endedElection = await election.end(request.params.id)
  response.json(endedElection)
})

app.get("/elections/:id/polling",
isElectionRunning(),
isVoterLoggedIn(),
isEligible(),
async (request,response)=>{
  const currentElection= await election.findByPk(request.params.id)
  const questions = await question.getAllQuestions(currentElection.id)
  for (let i=0;i<questions.length;i++){
    questions[i].options= await option.getoptions(questions[i].id)
  }
  response.render("pollingPage",{
    currentElection,
    data:questions,
    csrfToken:request.csrfToken()
  })
})

app.post("/elections/:id/registerVote",
isElectionRunning(),
isVoterLoggedIn(),
isEligible(),
async (request,response)=>{
  delete request.body["_csrf"]
  console.log(request.body.length);
  for(let i in request.body){
  console.log(request.body[i])
  var optionn =await option.findByPk(request.body[i])
  console.log(optionn)
    await optionn.increment("optCount")
  }
  console.log();
  await voter.update({voterstatus:true},{where:{id:request.user.id}})
  response.redirect(`/elections/${request.params.id}/thankyou`)
})

app.get("/elections/:id/voterlogin",(request,response)=>{
  response.render("voterlogin",{csrfToken:request.csrfToken(),title:"voterslogin",id:request.params.id})
})

app.post(
  "/elections/:id/voterlogin",
  passport.authenticate("voter-local", {
    failureRedirect: "back",
    failureFlash: true,
  }),
  (request, response) => {
    response.redirect(`/elections/${request.params.id}/polling`);
  }
);

app.get("/elections/:id/results",async (request,response)=>{
  const currentElection= await election.findByPk(request.params.id)
  const questions = await question.getAllQuestions(currentElection.id)
  for (let i=0;i<questions.length;i++){
    questions[i].options= await option.getoptions(questions[i].id)
  }
  response.render("results",{
    currentElection,
    data:questions,
    csrfToken:request.csrfToken()
  })
})
app.get(
  "/elections/:id/thankyou",
  (request, response) => {
    response.render("thankyou", { title: "Thankyou", id: request.params.id });
  }
);
app.get("/changePassword",
 (request, response) => {
    response.render("changePassword", { title: "Change Password", csrfToken: request.csrfToken() });
  }
  );
  app.post("/changePassword",
  async (request,response)=>{
    const previousPassword =request.user.password;
    console.log(request.user.password)
    const results = await bcrypt.compare(request.body.previousPassword,previousPassword);
    if (results){
      const hashedNewPassword = await bcrypt.hash(request.body.newPassword,saltRounds)
      await admin.update({password:hashedNewPassword},{
        where:{
          id:request.user.id
        }
      })
      response.redirect(`/signout`)
    }else{
      response.redirect(`/changePassword`)
    }
  }
  )



module.exports = app;
