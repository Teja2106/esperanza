import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import cors from 'cors';
import pkg from 'pg';
import fs from 'fs';

const app = express();
const port = 3000;

const __dirname = path.resolve();

const getTimeStamp = () => {
    const now = new Date();
    const formattedTime  = now.toLocaleString('en-IN',{ timeZone: 'Asia/Kolkata', hour12: false });
    return formattedTime;
}

const logFilePath = path.join(__dirname, 'monit.log');
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

const monitor = (req, res, next) => {
    const timestamp = getTimeStamp();
    const logData = `[${ timestamp }] - ${req.method} / ${ res.statusCode }: ${req.url}\n Headers: ${JSON.stringify(req.headers, null, 2)}`;
    logStream.write(logData);
    
    if(['POST', 'PUT', 'PATCH'].includes(req.method)) {
        logStream.write(`Body: ${JSON.stringify(req.body, null, 2)}`);
    }

    next();
};

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173',
    allowedHeaders: ['Content-Type', 'Authorozation'],
    methods: ['GET', 'POST'],
}));
app.use(monitor);

const { Pool } = pkg;
const pool = new Pool({
    user: 'esperanza_admin',
    host: 'dpg-cr7i3saj1k6c739stltg-a.singapore-postgres.render.com',
    database: 'esperanza',
    password: '1XO5SwhOiUQsh8X9zBxt9p9N2Gx96q4T',
    port: 5432,
    ssl: true,
});
pool.connect()
.then(console.log('Connected to the server.'))
.catch(err => {
    console.log('Error: ', err);
});

app.get('/', (req, res) => {
    res.send('<h1>To open scanner <a href="https://esperanza.opaq.tech/scanner">Click</a></h1>');
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body.data;
    const data = await pool.query('SELECT student, s_password FROM test_list WHERE student = $1', [username]);
    if(data.rows[0] != undefined) {
        if(username === data.rows[0].student && password === data.rows[0].s_password) {
            res.status(200).json({ message: 'Login Successful' });
            res.redirect('/scanner');
        } else {
            res.status(404).json({ message: 'Invalid credentials.' })
        }
    } else {
        res.status(404).json({ message: 'User not registered.' });
    }
});

app.get('/scanner', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'scanner.html'));
});

app.post('/scanner',async (req, res) => {
    const { qrData } = req.body;
    const data = await pool.query('SELECT hash_data, name, email FROM students WHERE hash_data = $1', [qrData]);
    if(data.rows[0] != undefined) {
        if(qrData === data.rows[0].hash_data) {
            res.status(200).json({ message: [data.rows[0].name, data.rows[0].email] });

        } else {
            res.status(404).json({ message: 'Student is not eligible.' });
        }
    } else {
        res.status(404).json({ message: 'Invalid ID.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});