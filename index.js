const fs = require('fs')
const express = require('express')
const port = 3001
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const { auth, requiresAuth } = require('express-openid-connect');
const app = express();
require('dotenv').config();


const config = {
  authRequired: false,
  auth0Logout: true,
  baseURL: 'http://localhost:3000',
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  secret: 'LONG_RANDOM_STRING'
};

// The `auth` router attaches /login, /logout
// and /callback routes to the baseURL
app.use(auth(config));

// req.oidc.isAuthenticated is provided from the auth router
app.get('/', (req, res) => {
  res.send(
    req.oidc.isAuthenticated() ? 'Logged in' : 'Logged out'
  )
});

// The /profile route will show the user profile as JSON
app.get('/profile', requiresAuth(), (req, res) => {
  res.send(JSON.stringify(req.oidc.user, null, 2));
});

app.listen(3000, function() {
  console.log('Listening on http://localhost:3000');
});
let snippets = []
let users = []

const key = crypto.scryptSync('myPassword', 'salt', 24)
const iv = Buffer.alloc(16, 0)

function encrypt(text) {
    const cipher = crypto.createCipheriv('aes-192-cbc', key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
}

function decrypt(encrypted) {
    const decipher = crypto.createDecipheriv('aes-192-cbc', key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
}

fs.readFile('./seedData.json', 'utf8', (err, data) => {
    if (err) {
        console.error(err)
        return
    }
    const seedData = JSON.parse(data)
    snippets.push(...seedData)
})

fs.readFile('./userData.json', 'utf8', (err, data) => {
    if (err) {
        console.error(err)
        return
    }
    users = JSON.parse(data)
})

app.use(express.json())
// Code for the /snippets route
app.get('/snippets', (req, res) => {
    res.status(200).send(snippets)
})

app.get('/snippets/:id', (req, res) => {
    const id = parseInt(req.params.id, 10)
    const snippet = snippets.find(snippet => snippet.id === id)
    snippet.code = decrypt(snippet.code)
    res.status(200).send(snippet)
})

app.post('/snippets', (req, res) => {
    const newSnippet = req.body
    newSnippet.id = snippets.length ? snippets[snippets.length - 1].id + 1 : 1
    newSnippet.code = encrypt(newSnippet.code)
    snippets.push(newSnippet)
    fs.writeFile('./seedData.json', JSON.stringify(snippets, null, 2), (err) => {
        if (err) {
            console.error(err)
            res.status(500).send('Error writing to file')
            return
        }
        res.status(201).send(newSnippet)
    })
})

//code for the /users route
app.get('/users', async (req, res) => {
    let loggedInUser = {
        email: req.body.email,
        password: req.body.password
    }
    const user = users.find(user => user.email === loggedInUser.email)
    if (user && await bcrypt.compare(loggedInUser.password, user.password)) {
        res.status(200).send(user.email)
    } else {
        res.status(401).send('Invalid email or password')
    }
})

app.post('/users', async (req, res) => {
    const newUser = req.body
    if (!newUser.password) {
        return res.status(400).send('Password is required')
    }
    const hashedPassword = await bcrypt.hash(newUser.password, 10) 
    newUser.password = hashedPassword
    users.push(newUser)
    fs.writeFile('./userData.json', JSON.stringify(users, null, 2), (err) => {
        if (err) {
            console.error(err)
            res.status(500).send('Error writing to file')
            return
        }
        res.status(201).send(newUser)
    })
})

app.post('/login', async (req, res) => {
    let loggedInUser = {
        email: req.body.email,
        password: req.body.password
    }
    token = generateToken(loggedInUser)
    console.log(token)
    const user = users.find(user => user.email === loggedInUser.email)
    if (user && await bcrypt.compare(loggedInUser.password, user.password)) {
        res.status(200).send(token)
    } else {
        res.status(401).send('Invalid email or password')
    }
})

app.get('/secure', (req, res) => {
    let token = req.headers.authorization
    console.log(token)
    if (!token) {
        return res.status(401).send('Access denied. No token provided.')
    }
    try {
        verifyToken(token)
        res.status(200).send('Welcome to the secure route')
    } catch (error) {
        res.status(400).send('Invalid token')
    }
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})