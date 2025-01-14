const fs = require('fs')
const express = require('express')
const app = express()
const port = 3000

let snippets = []

fs.readFile('./seedData.json', 'utf8', (err, data) => {
    if (err) {
        console.error(err)
        return
    }
    const seedData = JSON.parse(data)
    snippets.push(...seedData)
})

app.use(express.json())

app.get('/snippets', (req, res) => {
    res.status(200).send(snippets)
})

app.get('/snippets/:id', (req, res) => {
    const id = parseInt(req.params.id, 10)
    const snippet = snippets.find(snippet => snippet.id === id)
    console.log(id, snippet)
    res.status(200).send(snippet)
})

app.post('/snippets', (req, res) => {
    const newSnippet = req.body
    newSnippet.id = snippets.length ? snippets[snippets.length - 1].id + 1 : 1
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

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})