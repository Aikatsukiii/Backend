const express = require('express');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.urlencoded());

app.get('/channel', (request, response) => {
    response.send({ message: 'Hello from Express!' });
});

app.listen (PORT, () => { 
    console.log(`Server is running on http://localhost:${PORT}!`);
});

