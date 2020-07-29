const { Router } = require('express');
const router = new Router();

const User = require('./../models/user');
const bcryptjs = require('bcryptjs');

const generateRandomToken = length => {
  const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += characters[Math.floor(Math.random() * characters.length)];
  }
  return token;
};

const dotenv = require('dotenv');
dotenv.config();

const nodemailer = require('nodemailer');
const routeGuard = require('./../middleware/route-guard');
const bindUserToResponseLocals = require('./../middleware/bindUserToResponseLocals');

const transport = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD
  }
});

router.get('/', (req, res, next) => {
  res.render('index');
});

router.get('/sign-up', (req, res, next) => {
  res.render('sign-up');
});

router.post('/sign-up', (req, res, next) => {
  let user;
  const { name, email, password } = req.body;
  bcryptjs
    .hash(password, 10)
    .then(hash => {
      return User.create({
        name,
        email,
        passwordHash: hash,
        confirmationToken: generateRandomToken(24)
      });
    })
    .then(document => {
      user = document;
      req.session.user = user._id;
    })
    .then(() => {
      transport.sendMail({
        from: process.env.NODEMAILER_EMAIL,
        to: process.env.NODEMAILER_EMAIL, //use personal email
        subject: 'Please confirm your account',
        html: ` <html>
        <head>
          <style>
            a {
              background-color: orange;
            }
          </style>
        </head>
        <body>
        <div class="container">
  <header>
    <h1>  Ironhack-Lab-Nodemailer </h1>
  </header>  
  <div class="main">
    <img src="/images/ironhack logo.png" alt="Ironhack-logo">
    <h5>Ironhack Confirmation Email</h5>
    <h6>Hello</h6>
    <p>Thanks for signing up, to join our community! Please confirm your account by clicking on the following link: <a href="http://localhost:3020/authentication/confirm-email?token=${user.confirmationToken}">Click Me!!!</a> </p>
    <h6>Great to see you creating awesome webpages with us! <span>😎</span></h6>
  </div>
  <footer>
    <p>You are doing awesome!<span>💙</span> </p>
  </footer>
</div>
        </body>
      </html>`
      });
    })
    .then(result => {
      console.log(result);
      res.redirect('/');
    })
    .catch(error => {
      console.log('There was an error sending email.');
      console.log(error);
      next(error);
    });
});

router.get('/authentication/confirm-email', (req, res, next) => {
  const token = req.query.token;
  User.findOneAndUpdate({ confirmationToken: token }, { status: 'active' }, { new: true })
    .then(user => {
      req.session.user = user._id;
      req.session.user = user.token;
      res.render('confirmation');
      console.log('Email was confirmed successfully');
      console.log(user);
    })
    .catch(error => {
      next(error);
    });
});

router.get('/sign-in', (req, res, next) => {
  res.render('sign-in');
});

router.post('/sign-in', (req, res, next) => {
  let userId;
  const { email, password } = req.body;
  User.findOne({ email })
    .then(user => {
      if (!user) {
        return Promise.reject(new Error("There's no user with that email."));
      } else {
        userId = user._id;
        return bcryptjs.compare(password, user.passwordHash);
      }
    })
    .then(result => {
      if (result) {
        req.session.user = userId;
        res.render('private');
      } else {
        return Promise.reject(new Error('Wrong password.'));
      }
    })
    .catch(error => {
      next(error);
    });
});

router.post('/sign-out', (req, res, next) => {
  req.session.destroy();
  res.redirect('/');
});

router.get('/private', routeGuard, (req, res, next) => {
  res.render('private');
});

router.get('/profile', routeGuard, (req, res, next) => {
  res.render('profile');
});

module.exports = router;
