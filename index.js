const fs = require('fs')
const express = require('express')
const app = express()
const port = 3000
const crypto = require('crypto')
const bcrypt = require('bcrypt')

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

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})