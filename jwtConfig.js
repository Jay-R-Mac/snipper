const jwt = require('jsonwebtoken');

const jwtConfig = { 
    secret: 'mySecretKey',
    expiresIn: '24h'
}

const generateToken = (user) => {
    return jwt.sign(user, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
}

const verifyToken = (token) => {
    return jwt.verify(token, jwtConfig.secret);
}

module.exports = { generateToken, verifyToken }